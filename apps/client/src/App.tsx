import React from 'react';
import { Routes, Route, Navigate, useOutletContext } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './features/home/pages/HomePage';
import { AdDetailPage } from './features/ads/pages/AdDetailPage';
import { SearchPage } from './features/search/pages/SearchPage';

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
