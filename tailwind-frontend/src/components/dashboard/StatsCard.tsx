import { cn } from '../../lib/utils';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
  iconColor?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  className,
  iconColor = 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
  trend,
}: StatsCardProps) {
  return (
    <div className={cn('card p-6 transition-all hover:shadow-md dark:hover:shadow-none', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <h3 className="mt-2 text-3xl font-bold">{value}</h3>
          
          {trend && (
            <div className="mt-2 flex items-center text-sm">
              {trend.direction === 'up' && (
                <span className="text-success-600 dark:text-success-400">
                  ↑ {trend.value}%
                </span>
              )}
              {trend.direction === 'down' && (
                <span className="text-error-600 dark:text-error-400">
                  ↓ {trend.value}%
                </span>
              )}
              {trend.direction === 'neutral' && (
                <span className="text-gray-500 dark:text-gray-400">
                  → {trend.value}%
                </span>
              )}
              <span className="ml-1 text-gray-500 dark:text-gray-400">from last week</span>
            </div>
          )}
        </div>
        
        <div className={cn('rounded-full p-3', iconColor)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}