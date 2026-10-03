import React from 'react';
import {
  ShieldCheck,
  Lock,
  Plus,
  Cloud,
  LayoutGrid,
  Download,
  Wifi,
  WifiOff,
  Repeat,
} from 'lucide-react';
import { CloudSyncState, VaultMetadata } from '../types';

interface HeaderProps {
  metadata: VaultMetadata;
  cloudSync: CloudSyncState;
  isOnline: boolean;
  recurringCount: number;
  onOpenQuickAdd: () => void;
  onOpenWidgetMode: () => void;
  onOpenVaultSettings: () => void;
  onOpenCloudSync: () => void;
  onOpenRecurring: () => void;
  onLockVault: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  metadata,
  cloudSync,
  isOnline,
  recurringCount,
  onOpenQuickAdd,
  onOpenWidgetMode,
  onOpenVaultSettings,
  onOpenCloudSync,
  onOpenRecurring,
  onLockVault,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-[#222A3A] bg-[#0B0F17]/90 backdrop-blur-md px-4 sm:px-6 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/30 text-indigo-400 shadow-sm shadow-indigo-950">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0B0F17]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                ExpenseVault
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-[#161B26] text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Encrypted Offline (₹ INR)
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden xs:block">
              100% Private · Zero Account Sign-Up · AES-256
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Online / Offline status badge */}
          <div
            title={isOnline ? 'Online (Local-First Storage)' : 'Offline Mode (Local Encrypted DB)'}
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border ${
              isOnline
                ? 'bg-[#161B26] text-slate-300 border-[#222A3A]'
                : 'bg-amber-950/50 text-amber-300 border-amber-800/60'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Local DB</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Offline</span>
              </>
            )}
          </div>

          {/* Recurring Fixed Expenses Button */}
          <button
            id="header-recurring-button"
            onClick={onOpenRecurring}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium bg-[#161B26] hover:bg-[#1E2533] text-slate-200 border border-[#222A3A] transition active:scale-95 relative"
            title="Manage Recurring Fixed Costs (Rent, Subscriptions, Bills)"
          >
            <Repeat className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Recurring</span>
            {recurringCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
                {recurringCount}
              </span>
            )}
          </button>

          {/* Widget Quick Mode Trigger */}
          <button
            id="header-widget-button"
            onClick={onOpenWidgetMode}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium bg-[#161B26] hover:bg-[#1E2533] text-slate-200 border border-[#222A3A] transition active:scale-95"
            title="Open Home Screen Widget Mode"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Widget Mode</span>
          </button>

          {/* Cloud Sync Status */}
          <button
            id="header-cloud-sync-button"
            onClick={onOpenCloudSync}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium border transition active:scale-95 ${
              cloudSync.enabled
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-[#161B26] border-[#222A3A] text-slate-400 hover:text-slate-200 hover:bg-[#1E2533]'
            }`}
            title={
              cloudSync.googleAccountEmail
                ? `Backed up with Google Drive (${cloudSync.googleAccountEmail})`
                : cloudSync.enabled
                ? 'Cloud Backup Active'
                : 'Configure Google Drive or Email Cloud Backup'
            }
          >
            <Cloud className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {cloudSync.googleAccountEmail
                ? `Drive (${cloudSync.googleAccountEmail.split('@')[0]})`
                : cloudSync.enabled
                ? 'Cloud Backup'
                : 'Sync & Backup'}
            </span>
          </button>

          {/* Security & Database File Settings */}
          <button
            id="header-vault-settings-button"
            onClick={onOpenVaultSettings}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium bg-[#161B26] hover:bg-[#1E2533] text-slate-200 border border-[#222A3A] transition active:scale-95"
            title="Database Encryption & Backup File"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Vault DB</span>
          </button>

          {/* Manual Lock (if passcode enabled) */}
          {metadata.hasPasscode && (
            <button
              id="header-lock-button"
              onClick={onLockVault}
              className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-[#1E2533] border border-[#222A3A] transition active:scale-95"
              title="Lock Vault Now"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}

          {/* Quick Add Expense Action Button */}
          <button
            id="header-quick-add-button"
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>
    </header>
  );
};
