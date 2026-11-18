import React from 'react';
import { ChevronRight, HelpCircle } from 'lucide-react';

export const FAQS = [
  {
    q: 'How does Dispute Mediation work?',
    a: 'When you file a dispute, our Customer Support team reviews the conversation history and transaction details. We mediate between buyer and seller to arrive at an amicable resolution.',
  },
  {
    q: 'What is the standard SLA response time?',
    a: 'Urgent dispute and fraud inquiries receive initial review within 12 hours. General inquiries and account questions are resolved within 24 to 48 hours.',
  },
  {
    q: 'How do I protect myself from online payment scams?',
    a: 'Never scan QR codes to receive money. Always inspect goods in person before transferring payment, and keep all communications within our official marketplace chat.',
  },
  {
    q: 'Can I re-open a resolved ticket?',
    a: 'Yes, if you still require assistance on a resolved ticket, simply type a reply in the ticket thread and it will automatically return to In Progress.',
  },
];

export const SupportFaqSection: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <HelpCircle className="w-5 h-5 text-[#012f27]" />
        <h3 className="font-black text-base text-slate-900 tracking-tight">
          Frequently Asked Support Questions
        </h3>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq, idx) => (
          <details
            key={idx}
            className="group bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 text-xs cursor-pointer shadow-xs transition"
          >
            <summary className="font-extrabold text-slate-900 flex items-center justify-between list-none">
              <span className="text-xs sm:text-sm">{faq.q}</span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform shrink-0 ml-2" />
            </summary>
            <p className="text-slate-600 mt-3 pt-3 border-t border-slate-100 leading-relaxed font-normal">
              {faq.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
};
