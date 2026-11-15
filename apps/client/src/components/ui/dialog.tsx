import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useGsapModal } from '@/lib/gsapModalAnimation';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, children, className }: DialogProps) {
  const { overlayRef, contentRef, requestClose } = useGsapModal(open, () => onOpenChange(false));

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) requestClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={requestClose}
      />
      <div
        ref={contentRef}
        className={cn(
          "relative z-50 w-full max-w-lg rounded-2xl border border-[#E5EAED] bg-white p-6 shadow-2xl",
          className
        )}
      >
        {children}
        <button
          onClick={requestClose}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('relative', className)} {...props}>
      {children}
    </div>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 text-left', className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-xl font-bold leading-none tracking-tight text-[#002f34]', className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-[#667784]', className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4', className)}
      {...props}
    />
  );
}

