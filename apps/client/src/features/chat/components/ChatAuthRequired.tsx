import React from 'react';
import { LogIn } from 'lucide-react';

interface ChatAuthRequiredProps {
  onLogin: () => void;
}

export const ChatAuthRequired: React.FC<ChatAuthRequiredProps> = ({ onLogin }) => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center mx-auto text-3xl shadow-sm">
          💬
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#002f34]">Sign In to Chat</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
            Directly talk with buyers and sellers, negotiate prices, and organize pickups securely.
          </p>
        </div>
        <button
          onClick={onLogin}
          className="w-full bg-[#002f34] hover:bg-[#003d44] text-white py-3.5 rounded-xl font-bold text-sm shadow transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>Login / Register</span>
        </button>
      </div>
    </div>
  );
};

