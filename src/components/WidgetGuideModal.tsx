import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Apple,
  Copy,
  Check,
  ExternalLink,
  Share2,
  PlusSquare,
  Sparkles,
  Layers,
} from 'lucide-react';

interface WidgetGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WidgetGuideModal: React.FC<WidgetGuideModalProps> = ({ isOpen, onClose }) => {
  const [platform, setPlatform] = useState<'ios' | 'android'>('ios');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const quickAddUrl = typeof window !== 'undefined' ? `${window.location.origin}/?action=quick-add` : '';

  const handleCopyUrl = () => {
    if (quickAddUrl) {
      navigator.clipboard.writeText(quickAddUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-[#161B26] border border-[#222A3A] shadow-2xl shadow-black/80 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222A3A] bg-[#161B26]">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Home Screen Widget Setup</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#1E2533] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch iOS vs Android */}
        <div className="flex border-b border-[#222A3A] bg-[#0B0F17] px-5 pt-3">
          <button
            onClick={() => setPlatform('ios')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition ${
              platform === 'ios'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Apple className="w-4 h-4" />
            <span>iPhone / iPad (iOS)</span>
          </button>
          <button
            onClick={() => setPlatform('android')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-semibold border-b-2 transition ${
              platform === 'android'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Android (Chrome)</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {platform === 'ios' ? (
            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="p-4 rounded-2xl bg-[#0B0F17] border border-[#222A3A] space-y-2">
                <span className="font-semibold text-indigo-400 block text-sm">
                  Method 1: 1-Tap Home Screen App Shortcut
                </span>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                  <li>
                    Open this app in <strong>Safari</strong> on your iPhone.
                  </li>
                  <li>
                    Tap the <strong>Share</strong> button (box with upward arrow) at the bottom toolbar.
                  </li>
                  <li>
                    Scroll down and select <strong>"Add to Home Screen"</strong>.
                  </li>
                  <li>
                    Tap <strong>Add</strong> in the top right. An icon will appear on your home screen!
                  </li>
                </ol>
              </div>

              <div className="p-4 rounded-2xl bg-[#0B0F17] border border-[#222A3A] space-y-2">
                <span className="font-semibold text-indigo-400 block text-sm">
                  Method 2: iOS Shortcuts Widget (Lock Screen & Home Screen)
                </span>
                <p className="text-slate-400 leading-relaxed">
                  You can place an instant "Quick Add Expense" widget button right on your iPhone Home Screen or Lock Screen:
                </p>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                  <li>Open the built-in <strong>Shortcuts</strong> app on iOS.</li>
                  <li>Tap <strong>+</strong> to create a new shortcut, add action <strong>"Open URLs"</strong>.</li>
                  <li>Paste the dedicated Quick-Add URL below.</li>
                  <li>Add the Shortcut widget to your Home Screen or Lock Screen for instant 1-tap logging!</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="p-4 rounded-2xl bg-[#0B0F17] border border-[#222A3A] space-y-2">
                <span className="font-semibold text-indigo-400 block text-sm">
                  Method 1: Android Long-Press App Shortcut
                </span>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                  <li>
                    Tap <strong>"Install App"</strong> in the top menu or browser menu.
                  </li>
                  <li>
                    Once installed, go to your Android home screen and <strong>press and hold</strong> the ExpenseVault icon.
                  </li>
                  <li>
                    A pop-up menu will display <strong>"Quick Add Expense"</strong>.
                  </li>
                  <li>
                    Drag that shortcut onto your home screen as a standalone 1-tap widget!
                  </li>
                </ol>
              </div>

              <div className="p-4 rounded-2xl bg-[#0B0F17] border border-[#222A3A] space-y-2">
                <span className="font-semibold text-indigo-400 block text-sm">
                  Method 2: Chrome "Add to Home Screen"
                </span>
                <ol className="list-decimal pl-4 space-y-1.5 text-slate-300">
                  <li>Tap the <strong>three dots (⋮)</strong> in Chrome menu.</li>
                  <li>Select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.</li>
                  <li>Confirm installation to enjoy seamless offline access with local encryption.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Quick Add Direct URL */}
          <div className="p-3.5 rounded-2xl bg-[#0B0F17] border border-[#222A3A] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Direct Quick-Add URL
              </span>
              <button
                onClick={handleCopyUrl}
                className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy URL'}</span>
              </button>
            </div>
            <div className="p-2.5 rounded-xl bg-[#161B26] border border-[#222A3A] font-mono text-[11px] text-slate-300 truncate">
              {quickAddUrl}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#222A3A] bg-[#161B26] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-600/25"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
