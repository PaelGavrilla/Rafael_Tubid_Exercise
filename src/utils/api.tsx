import { getSupabaseClient } from './supabase/client';
import { projectId } from './supabase/info';

const supabase = getSupabaseClient();

/**
 * Fetch API dengan auto-refresh token jika expired
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  console.log('🔐 fetchWithAuth called for:', url);
  
  // Get current session
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('❌ Session error:', sessionError);
    throw new Error('Failed to get session. Please login again.');
  }
  
  let accessToken = sessionData.session?.access_token;
  
  if (!accessToken) {
    console.error('❌ No access token available');
    throw new Error('No access token available. Please login again.');
  }
  
  console.log('✅ Got access token, length:', accessToken.length);
  console.log('   First 30 chars:', accessToken.substring(0, 30) + '...');
  
  // Set Authorization header
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };
  
  // Make first attempt
  console.log('📤 Making request to:', url);
  let response = await fetch(url, { ...options, headers });
  console.log('📥 Response status:', response.status);
  
  // If unauthorized (401), try to refresh token and retry
  if (response.status === 401) {
    console.log('⚠️ Got 401, attempting to refresh session...');
    
    const { data: refreshData, error } = await supabase.auth.refreshSession();
    
    if (error || !refreshData.session) {
      console.error('❌ Failed to refresh session:', error);
      // Clear local storage and force logout
      await supabase.auth.signOut();
      throw new Error('Session expired. Please login again.');
    }
    
    console.log('✅ Session refreshed successfully');
    accessToken = refreshData.session.access_token;
    console.log('   New token length:', accessToken.length);
    console.log('   New token (first 30 chars):', accessToken.substring(0, 30) + '...');
    
    // Retry request with new token
    const newHeaders = {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
    
    console.log('🔄 Retrying request with new token...');
    response = await fetch(url, { ...options, headers: newHeaders });
    console.log('📥 Retry response status:', response.status);
  }
  
  return response;
}

/**
 * Helper untuk membuat POST request dengan auto-refresh
 */
export async function postWithAuth(
  path: string,
  body?: any
): Promise<Response> {
  return fetchWithAuth(
    `https://${projectId}.supabase.co/functions/v1/make-server-b017b546${path}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    }
  );
}

/**
 * Helper untuk membuat GET request dengan auto-refresh
 */
export async function getWithAuth(path: string): Promise<Response> {
  return fetchWithAuth(
    `https://${projectId}.supabase.co/functions/v1/make-server-b017b546${path}`,
    {
      method: 'GET'
    }
  );
}

/**
 * Helper untuk membuat DELETE request dengan auto-refresh
 */
export async function deleteWithAuth(path: string): Promise<Response> {
  return fetchWithAuth(
    `https://${projectId}.supabase.co/functions/v1/make-server-b017b546${path}`,
    {
      method: 'DELETE'
    }
  );
}

/**
 * Helper untuk membuat PUT request dengan auto-refresh
 */
export async function putWithAuth(path: string, body?: any): Promise<Response> {
  return fetchWithAuth(
    `https://${projectId}.supabase.co/functions/v1/make-server-b017b546${path}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    }
  );
}