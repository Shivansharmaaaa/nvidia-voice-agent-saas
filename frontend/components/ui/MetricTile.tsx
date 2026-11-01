import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricTileProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  className?: string;
}

export function MetricTile({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  className,
}: MetricTileProps) {
  return (
    <div className={cn('card p-6', className)}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </p>
        {Icon && (
          <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        )}
      </div>
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {value}
        </p>
        {trend && (
          <span
            className={cn(
              'text-sm font-medium',
              trend.isPositive
                ? 'text-success-600 dark:text-success-400'
                : 'text-error-600 dark:text-error-400'
            )}
          >
            {trend.isPositive ? '+' : ''}
            {trend.value}%
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
