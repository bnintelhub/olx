import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { usePushNotifications } from '../usePushNotifications';

export const PushNotificationPrompt: React.FC = () => {
  const { permission, isRegistering, enablePush } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => {
    return (
      typeof window !== 'undefined' &&
      sessionStorage.getItem('olx_push_prompt_dismissed') === 'true'
    );
  });

  // Only render when permission is 'default' (not yet granted or denied) and not dismissed
  if (permission !== 'default' || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.setItem('olx_push_prompt_dismissed', 'true');
    setDismissed(true);
  };

  const handleEnable = async () => {
    const success = await enablePush();
    if (success) {
      setDismissed(true);
    }
  };

  return (
    <div
      role="dialog"
      aria-labelledby="push-notif-title"
      className="fixed bottom-5 right-5 z-50 w-[calc(100%-2.5rem)] sm:w-[380px] bg-[#002f34] text-white rounded-2xl shadow-2xl border border-emerald-500/30 p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/30 shadow-inner">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 id="push-notif-title" className="font-bold text-sm text-white font-heading">
                Instant Chat Alerts
              </h4>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                WhatsApp-style
              </span>
            </div>
            <p className="text-[11px] text-gray-300 font-medium leading-tight mt-0.5">
              Real-time alerts & sound chimes
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          title="Dismiss for now"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 text-xs text-gray-200 leading-relaxed font-body">
        Enable instant WhatsApp-style push notifications for new chat messages.
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-white/10">
        <button
          onClick={handleDismiss}
          className="text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition font-medium cursor-pointer"
        >
          Maybe later
        </button>
        <button
          onClick={handleEnable}
          disabled={isRegistering}
          className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-lg shadow-emerald-500/25 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>{isRegistering ? 'Enabling...' : 'Enable Notifications'}</span>
        </button>
      </div>
    </div>
  );
};
