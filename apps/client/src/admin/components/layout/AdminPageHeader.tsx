import React from 'react';
import { ChevronRight } from 'lucide-react';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: string;
  action?: React.ReactNode;
}

export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  description,
  breadcrumb = 'Admin',
  action,
}) => (
  <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-end sm:justify-between dark:border-[#24334A]">
    <div>
      <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#9BAAC0]">
        <span>{breadcrumb}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-amber-600 dark:text-[#FFC439]">{title}</span>
      </div>
      <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-[#F4F7FB]">{title}</h2>
      {description && <p className="mt-1 text-xs text-slate-500 dark:text-[#9BAAC0]">{description}</p>}
    </div>
    {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
  </div>
);
