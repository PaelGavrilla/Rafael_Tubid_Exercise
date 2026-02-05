import crowLogoImg from 'figma:asset/b7a141a0b856524a883e4aa22236f7cd1ad5f5a0.png';

interface CrowLogoProps {
  className?: string;
  size?: number;
}

export function CrowLogo({ className = "", size = 32 }: CrowLogoProps) {
  return (
    <img
      src={crowLogoImg}
      alt="Crow Logo"
      width={size}
      height={size}
      className={`inline-block ${className}`}
      style={{ objectFit: 'contain', verticalAlign: 'middle', marginTop: '-2px', transform: 'scale(1.4)' }}
    />
  );
}