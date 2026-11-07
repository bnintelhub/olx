import React from 'react';
import { Routes, Route, Navigate, useOutletContext } from 'react-router-dom';
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
