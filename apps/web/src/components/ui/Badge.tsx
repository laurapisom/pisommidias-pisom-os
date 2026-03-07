import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const variantClasses = {
  success: 'bg-green-50 text-green-700 ring-green-600/20',
  warning: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/20',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  neutral: 'bg-gray-50 text-gray-700 ring-gray-600/20',
  primary: 'bg-pisom-50 text-pisom-700 ring-pisom-600/20',
} as const;

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
} as const;

interface BadgeProps {
  children: ReactNode;
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium ring-1 ring-inset',
        variantClasses[variant],
        sizeClasses[size],
      )}
    >
      {children}
    </span>
  );
}
