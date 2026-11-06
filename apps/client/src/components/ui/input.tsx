import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl border border-[#E5EAED] bg-white px-3.5 py-2 text-sm text-[#102A33] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#667784] focus-visible:outline-none focus-visible:border-[#002f34] focus-visible:ring-1 focus-visible:ring-[#002f34] disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

