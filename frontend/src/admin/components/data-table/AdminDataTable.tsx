import React from 'react';
import { AdminEmptyState, AdminLoadingState } from '../feedback/AdminFeedback';

export interface AdminDataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface AdminDataTableProps<T> {
  columns: AdminDataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
}

export function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyMessage = 'No records found.',
}: AdminDataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/90 shadow-xs backdrop-blur-md dark:border-[#24334A] dark:bg-[#101D30]">
      {loading ? (
        <AdminLoadingState message="Loading records..." />
      ) : rows.length === 0 ? (
        <div className="p-4">
          <AdminEmptyState message={emptyMessage} />
        </div>
      ) : (
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="border-b border-slate-200/80 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-[#24334A] dark:bg-[#15243A] dark:text-[#9BAAC0]">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={`px-4 py-3 ${column.className || ''}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#24334A]/60">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="transition hover:bg-slate-50/80 dark:hover:bg-[#15243A]/60">
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 text-slate-800 dark:text-[#F4F7FB] ${column.className || ''}`}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
