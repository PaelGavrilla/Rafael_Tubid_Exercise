import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Get environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with SERVICE_ROLE_KEY for admin operations
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Create Supabase client with ANON_KEY for user token verification
const supabaseAuth = createClient(supabaseUrl, anonKey);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper function to verify auth
async function verifyAuth(request: Request) {
  const authHeader = request.headers.get('Authorization');
  console.log('=== AUTH VERIFICATION START ===');
  console.log('Auth header:', authHeader ? 'Present' : 'Missing');
  
  if (!authHeader) {
    console.log('ERROR: No Authorization header');
    return { user: null, error: 'No Authorization header' };
  }
  
  const accessToken = authHeader?.split(' ')[1];
  if (!accessToken) {
    console.log('ERROR: No access token found in Authorization header');
    return { user: null, error: 'No token provided' };
  }
  
  console.log('Access token length:', accessToken.length);
  console.log('Access token (first 50 chars):', accessToken.substring(0, 50) + '...');
  
  try {
    const { data: { user }, error } = await supabaseAuth.auth.getUser(accessToken);
    
    if (error) {
      console.log('ERROR: Token verification failed');
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      console.log('Full error:', JSON.stringify(error, null, 2));
      return { user: null, error: 'Invalid or expired token: ' + error.message };
    }
    
    if (!user) {
      console.log('ERROR: No user found for token');
      return { user: null, error: 'Unauthorized' };
    }
    
    console.log('SUCCESS: Token verified for user:', user.id);
    console.log('User email:', user.email);
    console.log('=== AUTH VERIFICATION END ===');
    return { user, error: null };
  } catch (error: any) {
    console.log('ERROR: Exception during token verification');
    console.log('Exception:', error.message);
    console.log('=== AUTH VERIFICATION END ===');
    return { user: null, error: 'Token verification exception: ' + error.message };
  }
}

// Health check endpoint
app.get("/make-server-b017b546/health", (c) => {
  return c.json({ status: "ok" });
});

// ============ AUTH ROUTES ============

// Sign up
app.post("/make-server-b017b546/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }
    
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });
    
    if (error) {
      console.log('Sign up error:', error);
      return c.json({ error: error.message }, 400);
    }
    
    // Store user profile in KV
    const userId = data.user.id;
    await kv.set(`user:${userId}`, {
      id: userId,
      email,
      name,
      bio: '',
      avatar: '',
      createdAt: new Date().toISOString()
    });
    
    return c.json({ user: data.user });
  } catch (error) {
    console.log('Sign up error:', error);
    return c.json({ error: 'Sign up failed: ' + error.message }, 500);
  }
});

// ============ USER ROUTES ============

// Get user profile
app.get("/make-server-b017b546/users/:id", async (c) => {
  try {
    const userId = c.req.param('id');
    const user = await kv.get(`user:${userId}`);
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Get follow stats
    const followers = await kv.getByPrefix(`follow:*:${userId}`);
    const following = await kv.getByPrefix(`follow:${userId}:*`);
    
    return c.json({
      user,
      stats: {
        followers: followers.length,
        following: following.length
      }
    });
  } catch (error) {
    console.log('Get user profile error:', error);
    return c.json({ error: 'Failed to get user profile: ' + error.message }, 500);
  }
});

// Update user profile
app.put("/make-server-b017b546/users/:id", async (c) => {
  try {
    const authResult = await verifyAuth(c.req.raw);
    if (authResult.error) {
      return c.json({ error: authResult.error }, 401);
    }
    
    const userId = c.req.param('id');
    if (authResult.user.id !== userId) {
      return c.json({ error: 'Unauthorized to update this profile' }, 403);
    }
    
    const { name, bio, avatar } = await c.req.json();
    const existingUser = await kv.get(`user:${userId}`);
    
    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    const updatedUser = {
      ...existingUser,
      name: name || existingUser.name,
      bio: bio !== undefined ? bio : existingUser.bio,
      avatar: avatar !== undefined ? avatar : existingUser.avatar,
    };
    
    await kv.set(`user:${userId}`, updatedUser);
    return c.json({ user: updatedUser });
  } catch (error) {
    console.log('Update user profile error:', error);
    return c.json({ error: 'Failed to update profile: ' + error.message }, 500);
  }
});

// Search users
app.get("/make-server-b017b546/users/search/query", async (c) => {
  try {
    const query = c.req.query('q')?.toLowerCase() || '';
    
    if (!query) {
      return c.json({ users: [] });
    }
    
    const allUsers = await kv.getByPrefix('user:');
    const filteredUsers = allUsers.filter((user: any) => 
      user.name.toLowerCase().includes(query) || 
      user.email.toLowerCase().includes(query)
    );
    
    return c.json({ users: filteredUsers.slice(0, 20) });
  } catch (error) {
    console.log('Search users error:', error);
    return c.json({ error: 'Failed to search users: ' + error.message }, 500);
  }
});

// ============ POST ROUTES ============

// Get all posts
app.get("/make-server-b017b546/posts", async (c) => {
  try {
    const posts = await kv.getByPrefix('post:');
    
    // Sort by createdAt descending
    posts.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Get user info and likes/comments count for each post
    const postsWithDetails = await Promise.all(
      posts.map(async (post: any) => {
        const user = await kv.get(`user:${post.userId}`);
        const likes = await kv.getByPrefix(`like:${post.id}:`);
        const comments = await kv.getByPrefix(`comment:${post.id}:`);
        
        return {
          ...post,
          user: user ? { id: user.id, name: user.name, avatar: user.avatar } : null,
          likesCount: likes.length,
          commentsCount: comments.length
        };
      })
    );
    
    return c.json({ posts: postsWithDetails });
  } catch (error) {
    console.log('Get posts error:', error);
    return c.json({ error: 'Failed to get posts: ' + error.message }, 500);
  }
});

// Create post
app.post("/make-server-b017b546/posts", async (c) => {
  try {
    const authResult = await verifyAuth(c.req.raw);
    if (authResult.error) {
      console.log('Create post auth error:', authResult.error);
      return c.json({ error: authResult.error }, 401);
    }
    
    const { content } = await c.req.json();
    
    if (!content || content.trim().length === 0) {
      console.log('Create post error: Empty content');
      return c.json({ error: 'Post content is required' }, 400);
    }
    
    if (content.length > 280) {
      console.log('Create post error: Content too long');
      return c.json({ error: 'Post content must be 280 characters or less' }, 400);
    }
    
    // Auto-create user profile if not exists
    let user = await kv.get(`user:${authResult.user.id}`);
    if (!user) {
      console.log('User profile not found, creating from auth metadata...');
      user = {
        id: authResult.user.id,
        email: authResult.user.email || '',
        name: authResult.user.user_metadata?.name || authResult.user.email?.split('@')[0] || 'User',
        bio: '',
        avatar: '',
        createdAt: new Date().toISOString()
      };
      await kv.set(`user:${authResult.user.id}`, user);
      console.log('User profile created:', user);
    }
    
    const postId = crypto.randomUUID();
    const post = {
      id: postId,
      userId: authResult.user.id,
      content: content.trim(),
      createdAt: new Date().toISOString()
    };
    
    console.log('Creating post:', { postId, userId: authResult.user.id });
    await kv.set(`post:${postId}`, post);
    console.log('Post created successfully');
    
    return c.json({ 
      message: 'Post berhasil dibuat!',
      post: {
        ...post,
        user: user ? { id: user.id, name: user.name, avatar: user.avatar } : null,
        likesCount: 0,
        commentsCount: 0
      }
    });
  } catch (error) {
    console.log('Create post error:', error);
    return c.json({ error: 'Failed to create post: ' + error.message }, 500);
  }
});

// Delete post
app.delete("/make-server-b017b546/posts/:id", async (c) => {
  try {
    const authResult = await verifyAuth(c.req.raw);
    if (authResult.error) {
      return c.json({ error: authResult.error }, 401);
    }
    
    const postId = c.req.param('id');
    const post = await kv.get(`post:${postId}`);
    
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }
    
    if (post.userId !== authResult.user.id) {
      return c.json({ error: 'Unauthorized to delete this post' }, 403);
    }
    
    await kv.del(`post:${postId}`);
    
    // Delete all likes and comments for this post
    const likes = await kv.getByPrefix(`like:${postId}:`);
    const comments = await kv.getByPrefix(`comment:${postId}:`);
    
    const keysToDelete = [
      ...likes.map((l: any) => `like:${postId}:${l.userId}`),
      ...comments.map((c: any) => `comment:${postId}:${c.id}`)
    ];
    
    if (keysToDelete.length > 0) {
      await kv.mdel(keysToDelete);
    }
    
    return c.json({ success: true, message: 'Post berhasil dihapus' });
  } catch (error) {
    console.log('Delete post error:', error);
    return c.json({ error: 'Failed to delete post: ' + error.message }, 500);
  }
});

// ============ LIKE ROUTES ============

// Toggle like
app.post("/make-server-b017b546/posts/:id/like", async (c) => {
  try {
    const authResult = await verifyAuth(c.req.raw);
    if (authResult.error) {
      return c.json({ error: authResult.error }, 401);
    }
    
    const postId = c.req.param('id');
    const post = await kv.get(`post:${postId}`);
    
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }
    
    const likeKey = `like:${postId}:${authResult.user.id}`;
    const existingLike = await kv.get(likeKey);
    
    if (existingLike) {
      // Unlike
      await kv.del(likeKey);
      return c.json({ liked: false });
    } else {
      // Like
      await kv.set(likeKey, {
        postId,
        userId: authResult.user.id,
        createdAt: new Date().toISOString()
      });
      return c.json({ liked: true });
    }
  } catch (error) {
    console.log('Toggle like error:', error);
    return c.json({ error: 'Failed to toggle like: ' + error.message }, 500);
  }
});

// Check if user liked post
app.get("/make-server-b017b546/posts/:id/like/check", async (c) => {
  try {
    const authResult = await verifyAuth(c.req.raw);
    if (authResult.error) {
      return c.json({ liked: false });
    }
    
    const postId = c.req.param('id');
    const likeKey = `like:${postId}:${authResult.user.id}`;
    const existingLike = await kv.get(likeKey);
    
    return c.json({ liked: !!existingLike });
  } catch (error) {
    console.log('Check like error:', error);
    return c.json({ liked: false });
  }
});

// ============ COMMENT ROUTES ============

// Get comments for a post
app.get("/make-server-b017b546/posts/:id/comments", async (c) => {
  try {
    const postId = c.req.param('id');
    const comments = await kv.getByPrefix(`comment:${postId}:`);
    
    // Sort by createdAt ascending
    comments.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    // Get user info for each comment
    const commentsWithUser = await Promise.all(
      comments.map(async (comment: any) => {
        const user = await kv.get(`user:${comment.userId}`);
        return {
          ...comment,
          user: user ? { id: user.id, name: user.name, avatar: user.avatar } : null
        };
      })
    );
    
    return c.json({ comments: commentsWithUser });
  } catch (error) {
    console.log('Get comments error:', error);
    return c.json({ error: 'Failed to get comments: ' + error.message }, 500);
  }
});

// Add comment
app.post("/make-server-b017b546/posts/:id/comments", async (c) => {
  try {
    const authResult = await verifyAuth(c.req.raw);
    if (authResult.error) {
      return c.json({ error: authResult.error }, 401);
    }
    
    const postId = c.req.param('id');
    const { content } = await c.req.json();
    
    if (!content || content.trim().length === 0) {
      return c.json({ error: 'Comment content is required' }, 400);
    }
    
    const post = await kv.get(`post:${postId}`);
    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }
    
    // Auto-create user profile if not exists
    let user = await kv.get(`user:${authResult.user.id}`);
    if (!user) {
      console.log('User profile not found for comment, creating from auth metadata...');
      user = {
        id: authResult.user.id,
        email: authResult.user.email || '',
        name: authResult.user.user_metadata?.name || authResult.user.email?.split('@')[0] || 'User',
        bio: '',
        avatar: '',
        createdAt: new Date().toISOString()
      };
      await kv.set(`user:${authResult.user.id}`, user);
    }
    
    const commentId = crypto.randomUUID();
    const comment = {
      id: commentId,
      postId,
      userId: authResult.user.id,
      content: content.trim(),
      createdAt: new Date().toISOString()
    };
    
    await kv.set(`comment:${postId}:${commentId}`, comment);
    
    return c.json({ 
      comment: {
        ...comment,
        user: user ? { id: user.id, name: user.name, avatar: user.avatar } : null
      }
    });
  } catch (error) {
    console.log('Add comment error:', error);
    return c.json({ error: 'Failed to add comment: ' + error.message }, 500);
  }
});

// ============ FOLLOW ROUTES ============

// Seed random Indonesian users
app.post("/make-server-b017b546/seed-users", async (c) => {
  try {
    // Check if users already seeded
    const existingUsers = await kv.get('seed:users:done');
    if (existingUsers) {
      return c.json({ success: true, message: 'Users already seeded' });
    }

    const indonesianUsers = [
      {
        id: 'seed-user-1',
        email: 'budi.santoso@example.com',
        name: 'Budi Santoso',
        bio: 'Penggemar teknologi dan kopi ☕ | Jakarta',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
      },
      {
        id: 'seed-user-2',
        email: 'siti.nurhaliza@example.com',
        name: 'Siti Nurhaliza',
        bio: 'Content creator & foodie 🍜 | Bandung',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Siti',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'seed-user-3',
        email: 'ahmad.wijaya@example.com',
        name: 'Ahmad Wijaya',
        bio: 'Traveler & photographer 📸 | Yogyakarta',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmad',
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'seed-user-4',
        email: 'rina.kartika@example.com',
        name: 'Rina Kartika',
        bio: 'UI/UX Designer | Love minimalism 🎨 | Surabaya',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rina',
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'seed-user-5',
        email: 'deni.prasetyo@example.com',
        name: 'Deni Prasetyo',
        bio: 'Fullstack Developer | Coffee enthusiast ☕ | Bali',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Deni',
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Store all users
    for (const user of indonesianUsers) {
      await kv.set(`user:${user.id}`, user);
    }

    // Create some sample posts
    const samplePosts = [
      {
        userId: 'seed-user-1',
        content: 'Pagi ini cobain kopi baru dari kedai langganan. Rasanya mantap banget! ☕✨',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        userId: 'seed-user-2',
        content: 'Lagi nyari rekomendasi tempat makan enak di Bandung nih. Ada yang punya saran? 🍜',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      },
      {
        userId: 'seed-user-3',
        content: 'Sunset di Jogja hari ini luar biasa indah! 🌅 #photography',
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
      },
      {
        userId: 'seed-user-4',
        content: 'Baru selesai redesign website klien. Seneng banget liat hasil akhirnya! 🎨💻',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      },
      {
        userId: 'seed-user-5',
        content: 'Siapa yang lagi belajar React? Share tips dan trik kalian dong! 💻⚛️',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    for (const post of samplePosts) {
      const postId = crypto.randomUUID();
      await kv.set(`post:${postId}`, {
        id: postId,
        ...post
      });
    }

    // Mark as seeded
    await kv.set('seed:users:done', { done: true, timestamp: new Date().toISOString() });

    return c.json({ success: true, message: 'Users seeded successfully' });
  } catch (error) {
    console.log('Seed users error:', error);
    return c.json({ error: 'Failed to seed users: ' + error.message }, 500);
  }
});

// Toggle follow
app.post("/make-server-b017b546/follows/:id", async (c) => {
  try {
    const authResult = await verifyAuth(c.req.raw);
    if (authResult.error) {
      return c.json({ error: authResult.error }, 401);
    }
    
    const targetUserId = c.req.param('id');
    
    if (targetUserId === authResult.user.id) {
      return c.json({ error: 'Cannot follow yourself' }, 400);
    }
    
    const targetUser = await kv.get(`user:${targetUserId}`);
    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    const followKey = `follow:${authResult.user.id}:${targetUserId}`;
    const existingFollow = await kv.get(followKey);
    
    if (existingFollow) {
      // Unfollow
      await kv.del(followKey);
      return c.json({ following: false });
    } else {
      // Follow
      await kv.set(followKey, {
        followerId: authResult.user.id,
        followingId: targetUserId,
        createdAt: new Date().toISOString()
      });
      return c.json({ following: true });
    }
  } catch (error) {
    console.log('Toggle follow error:', error);
    return c.json({ error: 'Failed to toggle follow: ' + error.message }, 500);
  }
});

// Check if user follows another user
app.get("/make-server-b017b546/follows/:id/check", async (c) => {
  try {
    const authResult = await verifyAuth(c.req.raw);
    if (authResult.error) {
      return c.json({ following: false });
    }
    
    const targetUserId = c.req.param('id');
    const followKey = `follow:${authResult.user.id}:${targetUserId}`;
    const existingFollow = await kv.get(followKey);
    
    return c.json({ following: !!existingFollow });
  } catch (error) {
    console.log('Check follow error:', error);
    return c.json({ following: false });
  }
});

Deno.serve(app.fetch);