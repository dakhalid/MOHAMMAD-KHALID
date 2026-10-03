import React, { useState } from 'react';
import { ShieldCheck, Lock, Delete, KeyRound, AlertCircle } from 'lucide-react';

interface PasscodeUnlockScreenProps {
  onUnlock: (passcode: string) => Promise<void>;
}

export const PasscodeUnlockScreen: React.FC<PasscodeUnlockScreenProps> = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleKeyClick = (digit: string) => {
    setError('');
    if (digit === 'DEL') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (digit === 'C') {
      setPin('');
      return;
    }
    if (pin.length >= 8) return;
    const newPin = pin + digit;
    setPin(newPin);
  };

  const handleUnlockSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) return;

    setIsDecrypting(true);
    setError('');
    try {
      await onUnlock(pin);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Incorrect passcode. Decryption failed.');
      setPin('');
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F17] text-slate-100">
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-5">
        {/* Emblem */}
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-2xl shadow-black/80">
          <Lock className="w-8 h-8" />
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-indigo-500 ring-4 ring-[#0B0F17]" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">ExpenseVault Locked</h1>
          <p className="text-xs text-slate-400 mt-1">
            Enter your master passcode to decrypt the local database
          </p>
        </div>

        {/* PIN Dots Display */}
        <div className="flex items-center justify-center gap-3 py-2">
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                i < pin.length
                  ? 'bg-indigo-400 scale-110 shadow-sm shadow-indigo-400/50'
                  : 'bg-[#1E2533] border border-[#222A3A]'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-rose-300 font-semibold bg-rose-950/50 border border-rose-900/50 px-3 py-1.5 rounded-xl animate-in shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Rapid Thumb Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeyClick(key)}
              className={`h-14 rounded-2xl text-lg font-semibold flex items-center justify-center transition active:scale-90 ${
                key === 'DEL' || key === 'C'
                  ? 'bg-[#161B26] hover:bg-[#1E2533] text-slate-400 border border-[#222A3A]'
                  : 'bg-[#161B26] hover:bg-[#1E2533] text-white border border-[#222A3A] shadow-sm'
              }`}
            >
              {key === 'DEL' ? <Delete className="w-5 h-5" /> : key}
            </button>
          ))}
        </div>

        {/* Unlock Button */}
        <button
          onClick={() => handleUnlockSubmit()}
          disabled={!pin || isDecrypting}
          className="w-full max-w-[260px] py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-sm transition shadow-xl shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-2"
        >
          <KeyRound className="w-4 h-4 stroke-[2.5]" />
          <span>{isDecrypting ? 'Decrypting Vault...' : 'Unlock Database'}</span>
        </button>

        <p className="text-[11px] text-slate-400 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Hardware-accelerated AES-256-GCM
        </p>
      </div>
    </div>
  );
};
