import React from 'react';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface AdminFeedbackProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const AdminLoadingState: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-[#9BAAC0]" role="status">
    <RefreshCw className="h-4 w-4 animate-spin text-amber-500 dark:text-[#FFC439]" />
    <span>{message}</span>
  </div>
);

export const AdminEmptyState: React.FC<{ message: string; tone?: 'neutral' | 'success' }> = ({
  message,
  tone = 'neutral',
}) => (
  <div
    className={`rounded-2xl border px-4 py-6 text-center text-sm shadow-xs ${
      tone === 'success'
        ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-[#10B981]/30 dark:bg-[#10B981]/10 dark:text-[#10B981]'
        : 'border-slate-200/80 bg-slate-50/80 text-slate-600 dark:border-[#24334A] dark:bg-[#15243A] dark:text-[#9BAAC0]'
    }`}
  >
    {tone === 'success' && <CheckCircle className="mx-auto mb-2 h-5 w-5 text-emerald-600 dark:text-[#10B981]" />}
    {message}
  </div>
);

export const AdminErrorState: React.FC<AdminFeedbackProps> = ({ message, actionLabel = 'Retry', onAction }) => (
  <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-6 text-center text-sm text-rose-700 shadow-xs dark:border-[#F43F5E]/30 dark:bg-[#F43F5E]/10 dark:text-[#FCA5A5]" role="alert">
    <AlertCircle className="mx-auto mb-2 h-5 w-5 text-rose-500" />
    <p>{message}</p>
    {onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-3 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 shadow-xs transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400 dark:border-[#F43F5E]/40 dark:bg-transparent dark:text-rose-200 dark:hover:bg-[#F43F5E]/15"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
