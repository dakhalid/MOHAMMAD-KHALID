import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  Download,
  Upload,
  Check,
  HardDrive,
  Coins,
} from 'lucide-react';
import { VaultMetadata } from '../types';
import { dbService } from '../services/db';

interface VaultSecurityModalProps {
  isOpen: boolean;
  metadata: VaultMetadata;
  onClose: () => void;
  onUpdateMetadata: (updates: Partial<VaultMetadata>) => Promise<void>;
  onRefreshData: () => Promise<void>;
}

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CA$)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$)' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (S$)' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham (AED)' },
];

export const VaultSecurityModal: React.FC<VaultSecurityModalProps> = ({
  isOpen,
  metadata,
  onClose,
  onUpdateMetadata,
  onRefreshData,
}) => {
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [passcodeSuccess, setPasscodeSuccess] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(metadata.currency || 'INR');
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Handle setting or changing passcode
  const handleSavePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError('');
    setPasscodeSuccess('');

    if (passcode.length < 4) {
      setPasscodeError('Passcode must be at least 4 characters');
      return;
    }
    if (passcode !== confirmPasscode) {
      setPasscodeError('Passcodes do not match');
      return;
    }

    try {
      setIsProcessing(true);
      await dbService.setMasterPasscode(passcode);
      setPasscodeSuccess('Master passcode set and local database re-encrypted with AES-256!');
      setPasscode('');
      setConfirmPasscode('');
      await onRefreshData();
    } catch (err: unknown) {
      setPasscodeError(err instanceof Error ? err.message : 'Failed to update passcode');
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove passcode (revert to device key)
  const handleRemovePasscode = async () => {
    if (!confirm('Are you sure you want to remove the passcode lock? The database will remain encrypted with a private device key.')) {
      return;
    }
    try {
      setIsProcessing(true);
      await dbService.setMasterPasscode(null);
      setPasscodeSuccess('Passcode removed. Vault is secured by local private device key.');
      await onRefreshData();
    } catch (err: unknown) {
      setPasscodeError(err instanceof Error ? err.message : 'Failed to remove passcode');
    } finally {
      setIsProcessing(false);
    }
  };

  // Export encrypted database file
  const handleExportDatabaseFile = async () => {
    try {
      setIsProcessing(true);
      const { blob, filename } = await dbService.exportEncryptedDatabaseFile(
        exportPassphrase.trim() || undefined
      );

      // Check if File System Access API is supported
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as unknown as {
            showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle>;
          }).showSaveFilePicker({
            suggestedName: filename,
            types: [
              {
                description: 'Encrypted Expense Vault Database',
                accept: { 'application/octet-stream': ['.encdb', '.vault'] },
              },
            ],
          });
          const writable = await (handle as unknown as { createWritable: () => Promise<FileSystemWritableFileStream> }).createWritable();
          await writable.write(blob);
          await writable.close();
          setStatusMessage('Encrypted database file successfully saved to device disk!');
          setTimeout(() => setStatusMessage(null), 3000);
          return;
        } catch (e: unknown) {
          if ((e as Error)?.name === 'AbortError') return;
        }
      }

      // Fallback browser file download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage('Encrypted database file downloaded: ' + filename);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Import encrypted database file
  const handleImportDatabaseFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const content = await file.text();
      await dbService.importEncryptedDatabaseFile(content, importPassphrase.trim() || undefined);
      setStatusMessage('Database file successfully decrypted and restored!');
      await onRefreshData();
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: unknown) {
      alert('Import failed: ' + (err instanceof Error ? err.message : 'Invalid database file or incorrect passphrase.'));
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleCurrencyChange = async (newCode: string) => {
    setSelectedCurrency(newCode);
    const curr = CURRENCIES.find((c) => c.code === newCode);
    if (curr) {
      await onUpdateMetadata({
        currency: curr.code,
        currencySymbol: curr.symbol,
      });
      await onRefreshData();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-[#161B26] border border-[#222A3A] shadow-2xl shadow-black/80 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222A3A] bg-[#161B26]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Local Encryption & Database File</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#1E2533] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Status Message */}
          {statusMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Section 1: Encryption Status & Master Passcode */}
          <div className="p-4 rounded-2xl bg-[#0B0F17] border border-[#222A3A] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-white text-sm">Security & Passcode Lock</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950/60 text-indigo-300 border border-indigo-800/50">
                AES-256-GCM Active
              </span>
            </div>

            <p className="text-slate-400 leading-relaxed">
              Your expenses and recurring commitments are encrypted client-side using standard AES-GCM (256-bit) and PBKDF2 (100,000 iterations). Raw unencrypted data is never written to disk or sent anywhere without your consent.
            </p>

            {metadata.hasPasscode ? (
              <div className="flex items-center justify-between pt-2 border-t border-[#222A3A]">
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  Passcode Lock Enabled
                </span>
                <button
                  type="button"
                  onClick={handleRemovePasscode}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-xl text-rose-400 hover:bg-rose-950/40 border border-rose-900/40 transition font-medium"
                >
                  Remove Passcode
                </button>
              </div>
            ) : (
              <form onSubmit={handleSavePasscode} className="space-y-2.5 pt-2 border-t border-[#222A3A]">
                <div className="text-slate-300 font-semibold">
                  Optional: Protect with Master PIN / Passphrase
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="password"
                    placeholder="Enter Master PIN"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[#161B26] border border-[#222A3A] text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                  <input
                    type="password"
                    placeholder="Confirm PIN"
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[#161B26] border border-[#222A3A] text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                {passcodeError && <p className="text-rose-400">{passcodeError}</p>}
                {passcodeSuccess && <p className="text-emerald-400">{passcodeSuccess}</p>}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isProcessing || !passcode}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold transition shadow-md shadow-indigo-600/25"
                  >
                    Set Passcode
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Section 2: Encrypted Database File (.encdb) */}
          <div className="p-4 rounded-2xl bg-[#0B0F17] border border-[#222A3A] space-y-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-white text-sm">Secure Local Database File</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Save your entire encrypted expense and recurring costs database directly to your device as an encrypted <code>.encdb</code> file, or restore from a previous backup file.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Export Button */}
              <div className="p-3.5 rounded-xl bg-[#161B26] border border-[#222A3A] space-y-2.5">
                <span className="font-semibold text-white block">Export Encrypted File</span>
                <input
                  type="password"
                  placeholder="Optional custom export password"
                  value={exportPassphrase}
                  onChange={(e) => setExportPassphrase(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#0B0F17] border border-[#222A3A] text-[11px] text-white focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={handleExportDatabaseFile}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-md shadow-indigo-600/25 active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .encdb File</span>
                </button>
              </div>

              {/* Import Button */}
              <div className="p-3.5 rounded-xl bg-[#161B26] border border-[#222A3A] space-y-2.5">
                <span className="font-semibold text-white block">Restore From File</span>
                <input
                  type="password"
                  placeholder="File password (if any)"
                  value={importPassphrase}
                  onChange={(e) => setImportPassphrase(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#0B0F17] border border-[#222A3A] text-[11px] text-white focus:outline-none focus:border-indigo-500 transition"
                />
                <label className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1E2533] hover:bg-[#262F40] text-slate-200 border border-[#222A3A] font-bold transition cursor-pointer text-center active:scale-95">
                  <Upload className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Select .encdb File</span>
                  <input
                    type="file"
                    accept=".encdb,.vault,.json"
                    onChange={handleImportDatabaseFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Currency Setting */}
          <div className="p-4 rounded-2xl bg-[#0B0F17] border border-[#222A3A] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-indigo-400" />
              <div>
                <span className="font-bold text-white block">Display Currency</span>
                <span className="text-slate-400 text-[11px]">Primary currency format (Indian Rupee ₹)</span>
              </div>
            </div>
            <select
              value={selectedCurrency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#161B26] border border-[#222A3A] text-white font-semibold focus:outline-none focus:border-indigo-500 transition"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#222A3A] bg-[#161B26] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-600/30"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
