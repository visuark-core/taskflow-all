import { getInitials, getRandomColor } from '../../lib/utils';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const initials = getInitials(name);
  const bgColor = getRandomColor(name);
  
  // Size mappings
  const sizeClasses = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };
  
  // If we have an image src, render the image
  if (src) {
    return (
      <div className={`relative ${sizeClasses[size]} overflow-hidden rounded-full ${className}`}>
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  
  // Otherwise, render a placeholder with initials
  return (
    <div
      className={`flex items-center justify-center rounded-full text-white ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  );
}