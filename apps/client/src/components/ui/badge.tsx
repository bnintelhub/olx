import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-[#002f34] text-white',
        secondary: 'bg-[#F2F4F5] text-[#002f34]',
        success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        warning: 'bg-amber-100 text-amber-800 border border-amber-200',
        danger: 'bg-red-100 text-red-800 border border-red-200',
        outline: 'text-[#102A33] border border-[#E5EAED]',
        featured: 'bg-gradient-to-r from-amber-400 to-amber-500 text-black font-bold uppercase tracking-wider',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

