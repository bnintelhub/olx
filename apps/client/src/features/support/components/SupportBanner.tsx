import React from 'react';
import { Headphones, Send, MessageSquare, PlusCircle, HelpCircle } from 'lucide-react';
import { SupportIllustration } from './SupportIllustration';

interface SupportBannerProps {
  activeTab: 'LIST' | 'NEW' | 'FAQ';
  ticketsCount: number;
  onSelectTab: (tab: 'LIST' | 'NEW' | 'FAQ') => void;
  onSubmitNew: () => void;
}

export const SupportBanner: React.FC<SupportBannerProps> = ({
  activeTab,
  ticketsCount,
  onSelectTab,
  onSubmitNew,
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#012f27] via-[#044336] to-[#012b24] text-white border-b border-[#00241e]">
      {/* Background Decorative Rings */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-80 h-80 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-8 pb-4 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Text Block */}
          <div className="max-w-xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-xs px-3.5 py-1 text-xs font-semibold text-white/95 shadow-xs">
              <Headphones className="w-3.5 h-3.5 text-emerald-300" />
              <span>Official Customer Support Desk</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Customer Support & Inquiries
            </h1>

            <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-normal">
              Dedicated desk for customer complaints, inquiries, account assistance, and dispute mediation.
            </p>
          </div>

          {/* Right Section: Illustration & Yellow Action CTA */}
          <div className="flex items-center justify-between lg:justify-end gap-6 relative">
            <SupportIllustration className="w-48 sm:w-64 lg:w-72 h-auto shrink-0" />

            <div className="self-start lg:self-center">
              <button
                type="button"
                onClick={onSubmitNew}
                className="bg-[#FFD54A] hover:bg-[#ffca28] text-slate-900 font-extrabold px-5 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 text-xs sm:text-sm cursor-pointer whitespace-nowrap"
              >
                <Send className="w-4 h-4 fill-slate-900 rotate-45" />
                <span>Submit New Ticket</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Tab Pill Bar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-6 pt-3 border-t border-white/10 text-xs font-bold">
          <button
            type="button"
            onClick={() => onSelectTab('LIST')}
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'LIST'
                ? 'bg-white text-[#002f34] shadow-md font-extrabold'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>My Support Tickets</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                activeTab === 'LIST' ? 'bg-[#002f34] text-white' : 'bg-white/20 text-white'
              }`}
            >
              {ticketsCount}
            </span>
          </button>

          <span className="text-white/20 hidden sm:inline">|</span>

          <button
            type="button"
            onClick={() => onSelectTab('NEW')}
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'NEW'
                ? 'bg-white text-[#002f34] shadow-md font-extrabold'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Inquiry</span>
          </button>

          <span className="text-white/20 hidden sm:inline">|</span>

          <button
            type="button"
            onClick={() => onSelectTab('FAQ')}
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'FAQ'
                ? 'bg-white text-[#002f34] shadow-md font-extrabold'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help Center & FAQ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
