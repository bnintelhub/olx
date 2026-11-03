import React from 'react';

type AdminStatus = string;

const statusStyles: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-[#10B981]/15 dark:text-[#10B981] dark:border-[#10B981]/30',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-[#10B981]/15 dark:text-[#10B981] dark:border-[#10B981]/30',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-[#FFC439]/15 dark:text-[#FFC439] dark:border-[#FFC439]/30',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-[#FFC439]/15 dark:text-[#FFC439] dark:border-[#FFC439]/30',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-[#F43F5E]/15 dark:text-[#F43F5E] dark:border-[#F43F5E]/30',
  BANNED: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-[#F43F5E]/15 dark:text-[#F43F5E] dark:border-[#F43F5E]/30',
  SUSPENDED: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-[#F97316]/15 dark:text-[#F97316] dark:border-[#F97316]/30',
  SOLD: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-[#38BDF8]/15 dark:text-[#38BDF8] dark:border-[#38BDF8]/30',
  EXPIRED: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-[#94A3B8]/15 dark:text-[#CBD5E1] dark:border-[#94A3B8]/30',
};

const formatStatus = (status: AdminStatus) =>
  status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const AdminStatusBadge: React.FC<{ status: AdminStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold shadow-xs ${
      statusStyles[status] || 'border-slate-200 bg-slate-100 text-slate-700 dark:border-[#24334A] dark:bg-[#15243A] dark:text-[#9BAAC0]'
    }`}
  >
    {formatStatus(status)}
  </span>
);
