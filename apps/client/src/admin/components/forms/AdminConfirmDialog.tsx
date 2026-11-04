import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface AdminConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const AdminConfirmDialog: React.FC<AdminConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  onCancel,
  onConfirm,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xl p-6 shadow-2xl dark:border-[#24334A] dark:bg-[#101D30]"
      >
        <AlertTriangle className="mb-3 h-6 w-6 text-rose-500" />
        <h2 id="admin-confirm-title" className="text-lg font-bold text-slate-900 dark:text-[#F4F7FB]">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-[#9BAAC0]">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:border-[#24334A] dark:bg-transparent dark:text-[#F4F7FB] dark:hover:bg-[#15243A]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
