import React from 'react';
import {
  X,
  CreditCard,
  ShoppingCart,
  Sparkles,
  HelpCircle,
  Settings,
  Download,
  CheckCircle2,
  Package,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export type UserFeatureType =
  | 'BUY_PACKAGES'
  | 'VIEW_CART'
  | 'BILLING'
  | 'ELITE_BUYER'
  | 'ELITE_SELLER'
  | 'HELP'
  | 'SETTINGS'
  | 'INSTALL_APP'
  | null;

interface UserFeatureModalProps {
  type: UserFeatureType;
  onClose: () => void;
  onOpenProfile?: () => void;
}

export const UserFeatureModal: React.FC<UserFeatureModalProps> = ({
  type,
  onClose,
  onOpenProfile,
}) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-[#D8DFE2]">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#E5EAED] bg-[#002f34] px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            {type === 'BUY_PACKAGES' && <Package size={20} className="text-[#FFD54A]" />}
            {type === 'VIEW_CART' && <ShoppingCart size={20} className="text-[#FFD54A]" />}
            {type === 'BILLING' && <CreditCard size={20} className="text-[#FFD54A]" />}
            {type === 'ELITE_BUYER' && <Sparkles size={20} className="text-[#FFD54A]" />}
            {type === 'ELITE_SELLER' && <Sparkles size={20} className="text-[#FFD54A]" />}
            {type === 'HELP' && <HelpCircle size={20} className="text-[#FFD54A]" />}
            {type === 'SETTINGS' && <Settings size={20} className="text-[#FFD54A]" />}
            {type === 'INSTALL_APP' && <Download size={20} className="text-[#FFD54A]" />}

            <h3 className="text-base font-bold">
              {type === 'BUY_PACKAGES' && 'Buy Business Packages'}
              {type === 'VIEW_CART' && 'Your Shopping Cart'}
              {type === 'BILLING' && 'Bought Packages & Billing'}
              {type === 'ELITE_BUYER' && 'Become an Elite Buyer'}
              {type === 'ELITE_SELLER' && 'Become an Elite Seller'}
              {type === 'HELP' && 'Help & Support Desk'}
              {type === 'SETTINGS' && 'Account Settings'}
              {type === 'INSTALL_APP' && 'Install BLX Orbit Lite App'}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 text-[#102A33] max-h-[75vh] overflow-y-auto space-y-4">
          {type === 'BUY_PACKAGES' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Choose a business growth package to sell faster with higher ad visibility and premium positioning.
              </p>

              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Starter Booster
                    </span>
                    <h4 className="text-sm font-bold text-[#002f34] mt-1">5 Featured Listings (30 Days)</h4>
                    <p className="text-xs text-gray-500">Includes 7 days top search page placement</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-[#002f34]">₹ 499</span>
                    <button
                      onClick={() => alert('Package added to your cart!')}
                      className="block mt-1 bg-[#002f34] text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-[#00343A] cursor-pointer"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-[#FFD54A] bg-[#FFF9E6] p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-[#FFE082] px-2 py-0.5 rounded-full">
                      Most Popular
                    </span>
                    <h4 className="text-sm font-bold text-[#002f34] mt-1">Unlimited Pro Package</h4>
                    <p className="text-xs text-gray-500">Unlimited ads + 15 Featured spots + Verified badge</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-[#002f34]">₹ 1,499</span>
                    <button
                      onClick={() => alert('Package added to your cart!')}
                      className="block mt-1 bg-[#002f34] text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-[#00343A] cursor-pointer"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {type === 'VIEW_CART' && (
            <div className="text-center py-8 space-y-3">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <ShoppingCart size={32} />
              </div>
              <h4 className="text-base font-bold text-[#002f34]">Your Cart is Empty</h4>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Explore Business Packages or Elite Seller options to boost your listings across India.
              </p>
              <button
                onClick={onClose}
                className="mt-2 bg-[#002f34] text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-[#00343A] cursor-pointer"
              >
                Continue Browsing
              </button>
            </div>
          )}

          {type === 'BILLING' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Current Active Plan</p>
                <h4 className="text-base font-bold text-[#002f34] mt-0.5">Free Community Tier</h4>
                <p className="text-xs text-emerald-600 font-semibold mt-1">✓ Standard Classifieds Active</p>
              </div>

              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Billing History</h4>
              <div className="rounded-xl border border-gray-100 p-4 text-center text-xs text-gray-400">
                No past invoices or payment transactions found on this account.
              </div>
            </div>
          )}

          {type === 'ELITE_BUYER' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gradient-to-r from-blue-900 to-[#002f34] p-5 text-white">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  <ShieldCheck size={12} className="text-[#FFD54A]" /> Exclusive Buyer Tier
                </div>
                <h4 className="text-lg font-black mt-2">BLX Orbit Elite Buyer Club</h4>
                <p className="text-xs text-gray-200 mt-1">
                  Get direct priority access to verified sellers, early-bird notifications, and escrow purchase assurance.
                </p>
              </div>

              <div className="space-y-2 text-xs text-gray-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>Instant verified badge on buyer profile</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>Direct phone line to top rated sellers</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                  <span>Priority fraud and escrow resolution desk</span>
                </div>
              </div>

              <button
                onClick={() => {
                  alert('Elite Buyer request registered! Our representative will activate your badge.');
                  onClose();
                }}
                className="w-full bg-[#002f34] hover:bg-[#00343A] text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition cursor-pointer"
              >
                Join Elite Buyer Club
              </button>
            </div>
          )}

          {type === 'ELITE_SELLER' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gradient-to-r from-purple-900 to-[#002f34] p-5 text-white">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 text-[#FFD54A] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  <Zap size={12} /> Pro Seller Pass
                </div>
                <h4 className="text-lg font-black mt-2">Become an Elite Seller</h4>
                <p className="text-xs text-gray-200 mt-1">
                  Scale your store on BLX Orbit with dedicated store landing page and 10x buyer reach.
                </p>
              </div>

              <div className="space-y-2 text-xs text-gray-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-purple-600 flex-shrink-0" />
                  <span>Official Gold Seller Badge on all your ads</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-purple-600 flex-shrink-0" />
                  <span>Automated bump-up every 48 hours to top search</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-purple-600 flex-shrink-0" />
                  <span>Bulk Excel/CSV listing uploads & inventory sync</span>
                </div>
              </div>

              <button
                onClick={() => {
                  alert('Elite Seller registration submitted! We will contact you on your registered phone.');
                  onClose();
                  if (onOpenProfile) onOpenProfile();
                }}
                className="w-full bg-[#002f34] hover:bg-[#00343A] text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition cursor-pointer"
              >
                Apply for Elite Seller Pass
              </button>
            </div>
          )}

          {type === 'HELP' && (
            <div className="space-y-4 text-xs">
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                <h4 className="font-bold text-blue-900 text-sm">24x7 Customer Support Desk</h4>
                <p className="text-blue-700 mt-1">
                  Need help buying, selling, or reporting a fraudulent listing? We are here for you.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <a
                    href="mailto:support@blxorbit.in"
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700"
                  >
                    Email Support
                  </a>
                  <span className="text-gray-500">or call 1800-BLX-SAFE</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-[#002f34] text-xs uppercase tracking-wider">Frequently Asked</h4>
                <details className="rounded-lg border border-gray-200 p-2.5 cursor-pointer">
                  <summary className="font-semibold text-gray-800">How do I post a free ad?</summary>
                  <p className="text-gray-500 mt-1">Click the "+ Post Ads" button in the top bar, choose your category, enter details and upload photos.</p>
                </details>
                <details className="rounded-lg border border-gray-200 p-2.5 cursor-pointer">
                  <summary className="font-semibold text-gray-800">How does OTP login work?</summary>
                  <p className="text-gray-500 mt-1">Enter your 10-digit Indian phone number, and a 6-digit verification code will be sent to your device.</p>
                </details>
              </div>
            </div>
          )}

          {type === 'SETTINGS' && (
            <div className="space-y-4 text-xs">
              <div className="space-y-3">
                <h4 className="font-bold uppercase tracking-wider text-gray-500">Notification Preferences</h4>
                <label className="flex items-center justify-between p-2 rounded-lg border border-gray-200">
                  <span className="font-semibold text-gray-800">Chat & Inquiries Notification</span>
                  <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#002f34]" />
                </label>
                <label className="flex items-center justify-between p-2 rounded-lg border border-gray-200">
                  <span className="font-semibold text-gray-800">SMS Deal Alerts</span>
                  <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#002f34]" />
                </label>
              </div>

              <div className="space-y-3 pt-3 border-t border-gray-100">
                <h4 className="font-bold uppercase tracking-wider text-gray-500">Privacy & Safety</h4>
                <label className="flex items-center justify-between p-2 rounded-lg border border-gray-200">
                  <span className="font-semibold text-gray-800">Hide phone number on public listings</span>
                  <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#002f34]" />
                </label>
              </div>

              <button
                onClick={() => {
                  alert('Settings updated successfully!');
                  onClose();
                }}
                className="w-full bg-[#002f34] text-white py-2 rounded-lg font-bold text-xs"
              >
                Save Preferences
              </button>
            </div>
          )}

          {type === 'INSTALL_APP' && (
            <div className="text-center py-6 space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#002f34] text-white shadow-md">
                <Download size={32} />
              </div>
              <div>
                <h4 className="text-base font-bold text-[#002f34]">Install BLX Orbit Lite App</h4>
                <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">
                  Enjoy blazing-fast browsing, offline support, and instant chat notifications on your device.
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 max-w-sm mx-auto text-left space-y-1">
                <p>1. In Chrome / Edge: Click the <strong>Install</strong> icon in the address bar.</p>
                <p>2. Or click the 3-dots menu &gt; <strong>Install BLX Orbit...</strong></p>
              </div>

              <button
                onClick={() => {
                  alert('PWA installation prompt initialized!');
                  onClose();
                }}
                className="bg-[#002f34] text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-[#00343A] cursor-pointer"
              >
                Install App Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
