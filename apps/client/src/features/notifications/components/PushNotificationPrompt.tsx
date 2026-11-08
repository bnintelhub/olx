import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { usePushNotifications } from '../usePushNotifications';

export const PushNotificationPrompt: React.FC = () => {
  const { permission, isRegistering, enablePush } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('olx_push_prompt_dismissed') === 'true';
  });

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
    <div className="w-full bg-[#002f34] text-white px-4 py-2 flex items-center justify-between text-xs border-b border-[#003d44] transition-all">
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
          <Bell className="w-3.5 h-3.5" />
        </div>
        <span className="font-medium">
          Enable instant WhatsApp-style push notifications for new chat messages.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleEnable}
          disabled={isRegistering}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1 rounded-md text-[11px] shadow-sm transition disabled:opacity-50 cursor-pointer"
        >
          {isRegistering ? 'Enabling...' : 'Enable Notifications'}
        </button>
        <button
          onClick={handleDismiss}
          className="text-gray-300 hover:text-white p-1 rounded hover:bg-white/10 transition cursor-pointer"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

