import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  User,
  Heart,
  MessageSquare,
  FileText,
  ShoppingCart,
  CreditCard,
  Sparkles,
  HelpCircle,
  Settings,
  Globe,
  LogOut,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { UserFeatureType } from '../UserFeatureModal';

interface NavbarUserMenuProps {
  user: any;
  hasStaffAccess: boolean;
  onOpenProfile?: () => void;
  onOpenMyAds?: () => void;
  onOpenWishlist?: () => void;
  onOpenChat?: () => void;
  onOpenFeature?: (feature: UserFeatureType) => void;
  onOpenAdminPortal?: () => void;
  onLogout: () => void;
}

export const NavbarUserMenu: React.FC<NavbarUserMenuProps> = ({
  user,
  hasStaffAccess,
  onOpenProfile,
  onOpenMyAds,
  onOpenWishlist,
  onOpenChat,
  onOpenFeature,
  onOpenAdminPortal,
  onLogout,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsLanguageOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName =
    user?.name ||
    user?.profile?.name ||
    (user?.phoneNumber ? `+91 ${user.phoneNumber.slice(-4)}` : 'User');

  const avatarLetter =
    user?.name?.[0]?.toUpperCase() ||
    user?.profile?.name?.[0]?.toUpperCase() ||
    'U';

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1 pr-3 hover:border-gray-400 transition cursor-pointer"
      >
        <div className="h-8 w-8 rounded-full bg-[#002f34] text-white flex items-center justify-center font-bold text-xs">
          {avatarLetter}
        </div>
        <span className="text-xs font-bold text-[#102A33] hidden sm:inline max-w-[100px] truncate">
          {displayName}
        </span>
        <ChevronDown size={14} className="text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-gray-200 bg-white shadow-2xl z-50 overflow-hidden divide-y divide-gray-100 animate-fade-in text-xs">
          {/* Header */}
          <div className="p-4 bg-gray-50/70">
            <p className="font-bold text-sm text-[#002f34] truncate">{displayName}</p>
            <p className="text-[11px] text-gray-500 truncate mt-0.5">
              {user?.email || (user?.phoneNumber ? `+91 ${user.phoneNumber}` : '')}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                if (onOpenProfile) onOpenProfile();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
            >
              <User size={15} className="text-teal-700" />
              <span>My Profile</span>
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                if (onOpenMyAds) onOpenMyAds();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
            >
              <FileText size={15} className="text-teal-700" />
              <span>My Classified Ads</span>
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                if (onOpenWishlist) onOpenWishlist();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
            >
              <Heart size={15} className="text-teal-700" />
              <span>Favourites & Saved</span>
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                if (onOpenChat) onOpenChat();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
            >
              <MessageSquare size={15} className="text-teal-700" />
              <span>Messages & Chats</span>
            </button>
          </div>

          {/* Features */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                if (onOpenFeature) onOpenFeature('BUY_PACKAGES');
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>Buy Business Packages</span>
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                if (onOpenFeature) onOpenFeature('BILLING');
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <CreditCard size={14} className="text-gray-400" />
              <span>Invoices & Billing</span>
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                if (onOpenFeature) onOpenFeature('HELP');
              }}
              className="flex w-full items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <HelpCircle size={14} className="text-gray-400" />
              <span>Help & Support</span>
            </button>
          </div>

          {/* Language Selector */}
          <div className="py-1">
            <button
              onClick={() => setIsLanguageOpen(!isLanguageOpen)}
              className="flex w-full items-center justify-between px-4 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Globe size={14} className="text-gray-400" />
                <span>Language: {selectedLanguage}</span>
              </div>
              <ChevronDown size={13} className={isLanguageOpen ? 'rotate-180' : ''} />
            </button>
            {isLanguageOpen && (
              <div className="bg-gray-50 px-4 py-1.5 space-y-1">
                {['English', 'हिन्दी'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setSelectedLanguage(lang);
                      setIsLanguageOpen(false);
                    }}
                    className="flex w-full items-center justify-between py-1 text-xs text-gray-600 hover:text-teal-900 cursor-pointer"
                  >
                    <span>{lang}</span>
                    {selectedLanguage === lang && <Check size={12} className="text-teal-700" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Staff Admin Portal link */}
          {hasStaffAccess && onOpenAdminPortal && (
            <div className="py-1 bg-teal-50/50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenAdminPortal();
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-[#002f34] font-bold hover:bg-teal-100/50 cursor-pointer"
              >
                <ShieldCheck size={15} className="text-teal-700" />
                <span>Open Admin Console ↗</span>
              </button>
            </div>
          )}

          {/* Logout */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-rose-600 hover:bg-rose-50 font-bold cursor-pointer"
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

