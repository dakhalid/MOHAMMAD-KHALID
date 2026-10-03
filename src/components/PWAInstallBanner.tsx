import React, { useState } from 'react';
import { Download, Smartphone, X, Apple, Check, ArrowRight } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallBannerProps {
  onOpenWidgetGuide?: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ onOpenWidgetGuide }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed or dismissed, hide
  if (isInstalled || dismissed) {
    return null;
  }

  // Only show if installable on Chrome/Android or if on iOS Safari
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <div className="bg-[#161B26] border-b border-[#222A3A] px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <p className="text-slate-200 truncate">
              <strong className="text-white font-semibold">Install App for Offline & Widget Access</strong>
              <span className="hidden sm:inline text-slate-400 ml-1.5">
                Fast home screen data entry on iOS & Android
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isInstallable && (
              <button
                onClick={install}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/20 transition active:scale-95 text-xs"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Install</span>
              </button>
            )}

            {isIOS && (
              <button
                onClick={() => setShowIOSGuide(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E2533] hover:bg-[#262F40] text-slate-200 border border-[#222A3A] font-medium transition text-xs"
              >
                <Apple className="w-3.5 h-3.5 text-slate-300" />
                <span>Add to Home</span>
              </button>
            )}

            {onOpenWidgetGuide && (
              <button
                onClick={onOpenWidgetGuide}
                className="hidden md:inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:underline font-medium"
              >
                Widget Setup
              </button>
            )}

            <button
              onClick={() => setDismissed(true)}
              className="p-1 text-slate-400 hover:text-slate-200 transition rounded-lg"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Modal Walkthrough */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-[#161B26] border border-[#222A3A] p-6 shadow-2xl shadow-black/80">
            <div className="flex items-center gap-2 mb-3">
              <Apple className="w-5 h-5 text-white" />
              <h3 className="text-base font-bold text-white">Add to iPhone Home Screen</h3>
            </div>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0B0F17] border border-[#222A3A]">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                  1
                </span>
                <span>
                  Tap the <strong>Share</strong> button in your Safari bottom toolbar (box with arrow).
                </span>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0B0F17] border border-[#222A3A]">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                  2
                </span>
                <span>
                  Scroll down the share sheet and tap <strong>Add to Home Screen</strong>.
                </span>
              </div>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0B0F17] border border-[#222A3A]">
                <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                  3
                </span>
                <span>
                  Tap <strong>Add</strong> in the top right corner. The ExpenseVault icon is now on your home screen!
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30 active:scale-95"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
