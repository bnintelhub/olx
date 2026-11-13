import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './features/home/pages/HomePage';
import { AdDetailPage } from './features/ads/pages/AdDetailPage';
import { SearchPage } from './features/search/pages/SearchPage';
import { SellPage } from './features/sell/pages/SellPage';
import { MyAdsPage } from './features/ads/pages/MyAdsPage';
import { PlansPage } from './features/plans/pages/PlansPage';
import { ChatPage } from './features/chat/pages/ChatPage';

interface OutletContextType {
  onOpenPostAd: () => void;
  onOpenChat: (ad: any, initialMessage?: string) => void;
}

const HomeRoute: React.FC = () => {
  const { onOpenPostAd } = useOutletContext<OutletContextType>();
  return <HomePage onOpenPostAd={onOpenPostAd} />;
};

const AdDetailRoute: React.FC = () => {
  const { onOpenChat } = useOutletContext<OutletContextType>();
  return <AdDetailPage onOpenChat={onOpenChat} />;
};

const AcceptInviteRedirect: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    const adminUrl = (import.meta as any).env?.VITE_ADMIN_URL || 'http://localhost:5174';
    const isPort80or443 =
      window.location.port === '' ||
      window.location.port === '80' ||
      window.location.port === '443';

    const targetBase = isPort80or443
      ? `${window.location.origin}/admin`
      : adminUrl;

    const targetUrl = `${targetBase.replace(/\/$/, '')}/accept-invite${
      token ? `?token=${encodeURIComponent(token)}` : ''
    }`;

    window.location.href = targetUrl;
  }, [token]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-700">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#002f34] border-t-transparent mx-auto" />
        <p className="text-sm font-medium">Redirecting to Admin Portal to accept invitation...</p>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<HomeRoute />} />
        {/* Dedicated Product Details Page */}
        <Route path="ad/:id" element={<AdDetailRoute />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="sell" element={<SellPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="chat/:conversationId" element={<ChatPage />} />
        <Route path="my-ads" element={<MyAdsPage />} />
        <Route path="ads" element={<MyAdsPage />} />
        <Route path="accept-invite" element={<AcceptInviteRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
