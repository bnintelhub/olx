import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-[#002f34] text-white hover:bg-[#002024] shadow-sm',
        sell: 'bg-[#FFD54A] text-[#002f34] hover:bg-[#f2c942] border-4 border-solid border-teal-800 font-bold shadow-md hover:scale-[1.02]',
        outline: 'border border-[#E5EAED] bg-white text-[#102A33] hover:bg-gray-50 hover:border-gray-300',
        secondary: 'bg-[#F2F4F5] text-[#002f34] hover:bg-[#E5EAED]',
        ghost: 'text-[#102A33] hover:bg-gray-100',
        danger: 'bg-red-500 text-white hover:bg-red-600',
        link: 'text-[#002f34] underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-8 px-3 text-xs rounded-lg',
        lg: 'h-12 px-8 text-base rounded-2xl',
        icon: 'h-10 w-10 p-0 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

