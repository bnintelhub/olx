import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ReportAdModalProps {
  adId: string | null;
  adTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: 'SPAM_OR_FRAUD', label: 'Fraud or scam attempt', desc: 'Seller asking for advance, QR code payment or suspicious behavior' },
  { value: 'MISLEADING_PRICE', label: 'Misleading or fake price', desc: 'Price listed is drastically different from actual asking price' },
  { value: 'PROHIBITED_ITEM', label: 'Illegal or prohibited item', desc: 'Weapons, narcotics, fake currency or banned goods' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Offensive or vulgar content', desc: 'Inappropriate language, offensive imagery or harassment' },
  { value: 'DUPLICATE_LISTING', label: 'Duplicate / spam posting', desc: 'Same product posted multiple times' },
  { value: 'ALREADY_SOLD', label: 'Item is already sold', desc: 'Seller stated item is no longer available' },
  { value: 'OTHER', label: 'Other issue', desc: 'Any other problem violating BLX Orbit community guidelines' },
];

export const ReportAdModal: React.FC<ReportAdModalProps> = ({
  adId,
  adTitle,
  isOpen,
  onClose,
}) => {
  const { user, openAuthModal } = useAuth();
  const [selectedReason, setSelectedReason] = useState('SPAM_OR_FRAUD');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !adId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal();
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const token = localStorage.getItem('olx_access_token') || localStorage.getItem('token');
      const res = await fetch('/api/v1/moderation/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          adId,
          reason: selectedReason,
          details: details.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 2200);
      } else {
        setErrorMsg(data.error?.message || 'Failed to submit report');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-[#002f34] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#003d44]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold tracking-tight">Report this Listing</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5">
          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
              <h4 className="font-bold text-gray-900 text-base">Report Submitted</h4>
              <p className="text-xs text-gray-600 max-w-sm mx-auto">
                Thank you for helping keep BLX Orbit safe. Our moderation team will investigate this listing immediately.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="text-xs text-gray-500">
                  Reporting listing:{' '}
                  <span className="font-semibold text-gray-800 line-clamp-1">
                    {adTitle || 'Classified Ad'}
                  </span>
                </p>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2">
                  Reason for reporting *
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {REPORT_REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition ${
                        selectedReason === r.value
                          ? 'border-[#002f34] bg-teal-50/50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        value={r.value}
                        checked={selectedReason === r.value}
                        onChange={() => setSelectedReason(r.value)}
                        className="mt-0.5 text-[#002f34] focus:ring-[#002f34]"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-gray-800 block">
                          {r.label}
                        </span>
                        <span className="text-[11px] text-gray-500 block leading-tight">
                          {r.desc}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide any additional context or proof to help our moderators..."
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-md outline-none focus:border-[#002f34] focus:ring-1 focus:ring-[#002f34]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
