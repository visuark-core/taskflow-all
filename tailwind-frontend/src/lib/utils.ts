import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

export const generateAvatarUrl = (name: string) => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=random&color=fff`;
};

export const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    // Single word: use first two letters
    return parts[0].slice(0, 2).toUpperCase();
  }
  // Multi-word: use first letter of each
  return parts.map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

export const getRandomColor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const h = hash % 360;
  return `hsl(${h}, 70%, 60%)`;
};

export function getStatusColor(status: string) {
  const statusMap: Record<string, string> = {
    'todo': 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'in progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'review': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'done': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'blocked': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'cancelled': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    'on hold': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  };
  
  return statusMap[status.toLowerCase()] || 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
}

export function getPriorityColor(priority: string) {
  const priorityMap: Record<string, string> = {
    'critical': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'high': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    'medium': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'low': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };
  
  return priorityMap[priority.toLowerCase()] || 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
}