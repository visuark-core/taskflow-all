import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

export default function Badge({ variant = 'default', className, children }: BadgeProps) {
  const baseStyles = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
  
  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300',
    secondary: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900/30 dark:text-secondary-300',
    success: 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300',
    warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300',
    error: 'bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-300',
    outline: 'border border-gray-300 bg-transparent text-gray-700 dark:border-gray-700 dark:text-gray-300',
  };

  return (
    <span className={cn(baseStyles, variantStyles[variant], className)}>
      {children}
    </span>
  );
}