import React from 'react';
import {
  UserCheck,
  AlertTriangle,
  ShieldCheck,
  CreditCard,
  FileText,
  Loader2,
  Send,
} from 'lucide-react';
import { TicketPriority } from '../services/support.service';

export const SUPPORT_CATEGORIES = [
  {
    id: 'ACCOUNT_ASSISTANCE',
    title: 'Account Assistance',
    desc: 'Phone verification, login trouble, or security',
    icon: UserCheck,
    color: 'text-blue-600 bg-blue-50',
  },
  {
    id: 'COMPLAINT',
    title: 'User Complaint',
    desc: 'Seller behavior, harassment, or fake listing',
    icon: AlertTriangle,
    color: 'text-amber-600 bg-amber-50',
  },
  {
    id: 'DISPUTE_MEDIATION',
    title: 'Dispute Mediation',
    desc: 'Transaction conflicts, undelivered goods, refunds',
    icon: ShieldCheck,
    color: 'text-purple-600 bg-purple-50',
  },
  {
    id: 'BILLING_PAYMENT',
    title: 'Billing & Invoices',
    desc: 'Package purchases, payment deductions, receipts',
    icon: CreditCard,
    color: 'text-emerald-600 bg-emerald-50',
  },
  {
    id: 'FRAUD_SAFETY',
    title: 'Fraud & Safety Alert',
    desc: 'Immediate scam report, phishing, impersonation',
    icon: AlertTriangle,
    color: 'text-rose-600 bg-rose-50',
  },
  {
    id: 'GENERAL_INQUIRY',
    title: 'General Inquiry',
    desc: 'Questions about platform policies and rules',
    icon: FileText,
    color: 'text-slate-600 bg-slate-50',
  },
];

interface SupportNewTicketFormProps {
  category: string;
  onChangeCategory: (cat: string) => void;
  priority: TicketPriority;
  onChangePriority: (pri: TicketPriority) => void;
  subject: string;
  onChangeSubject: (sub: string) => void;
  message: string;
  onChangeMessage: (msg: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export const SupportNewTicketForm: React.FC<SupportNewTicketFormProps> = ({
  category,
  onChangeCategory,
  priority,
  onChangePriority,
  subject,
  onChangeSubject,
  message,
  onChangeMessage,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-9 space-y-7">
      <div>
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Submit Customer Support Ticket
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Select your inquiry category and provide detailed information so our specialists can resolve it promptly.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Category Radio Grid */}
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-3">
            1. Select Inquiry Topic
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SUPPORT_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <div
                  key={cat.id}
                  onClick={() => onChangeCategory(cat.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                    isSelected
                      ? 'border-[#012f27] bg-emerald-50/40 ring-1 ring-[#012f27] shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${cat.color} shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-extrabold text-xs text-slate-900">{cat.title}</p>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{cat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority / Urgency */}
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-2">
            2. Urgency Level
          </label>
          <div className="flex gap-2.5">
            {(['NORMAL', 'HIGH', 'URGENT'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onChangePriority(p)}
                className={`flex-1 py-2.5 rounded-2xl text-xs font-extrabold border transition-all cursor-pointer ${
                  priority === p
                    ? 'border-[#012f27] bg-[#012f27] text-white shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                }`}
              >
                {p === 'NORMAL' && 'Normal (48h)'}
                {p === 'HIGH' && 'High (24h)'}
                {p === 'URGENT' && 'Urgent (12h)'}
              </button>
            ))}
          </div>
        </div>

        {/* Subject Line */}
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-2">
            3. Subject Line
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Unable to verify phone number / Payment dispute on Ad #44"
            value={subject}
            onChange={(e) => onChangeSubject(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#012f27] focus:border-transparent outline-none transition"
          />
        </div>

        {/* Detailed Description */}
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-2">
            4. Detailed Description
          </label>
          <textarea
            required
            rows={5}
            placeholder="Describe your issue with exact dates, transaction or Ad details, and what assistance is needed..."
            value={message}
            onChange={(e) => onChangeMessage(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-[#012f27] focus:border-transparent outline-none resize-none transition"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !subject.trim() || !message.trim()}
          className="w-full bg-[#012f27] hover:bg-[#02493d] text-white py-3.5 rounded-2xl font-black text-xs transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Submitting Ticket...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 rotate-45" />
              <span>Submit to Support Desk</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
