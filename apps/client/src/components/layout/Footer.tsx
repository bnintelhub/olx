import React from 'react';
import { useAuthStore } from '@/features/auth/stores/useAuthStore';

interface FooterProps {
  onOpenAdminPortal?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdminPortal }) => {
  const user = useAuthStore((s) => s.user);
  const hasStaffAccess = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return (
    <footer className="bg-[#00343A] text-white py-10 border-t border-[#00282D]">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-gray-300">
        <p>© 2026 OLX India Marketplace. All rights reserved.</p>
        <div className="flex flex-wrap items-center gap-6">
          <span className="hover:text-white cursor-pointer transition">About Us</span>
          <span className="hover:text-white cursor-pointer transition">Security & Safety</span>
          <span className="hover:text-white cursor-pointer transition">Privacy Policy</span>
          <span className="hover:text-white cursor-pointer transition">Terms of Use</span>
          {hasStaffAccess && onOpenAdminPortal && (
            <button
              onClick={onOpenAdminPortal}
              className="text-[#FFD54A] hover:underline font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <span>⚙️ Admin Portal</span>
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};

