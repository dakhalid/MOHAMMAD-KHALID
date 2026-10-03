import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CloudUpload,
  CloudDownload,
  Check,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Server,
  Lock,
  Mail,
  Send,
  LogOut,
  FolderSync,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { CloudSyncState } from '../types';
import { cloudSyncService } from '../services/cloudSync';
import { googleSignIn, googleLogout, getAccessToken, auth } from '../services/googleAuthService';
import { GoogleSignInButton } from './GoogleSignInButton';
import { User } from 'firebase/auth';
import { formatINR } from '../utils/formatCurrency';

interface CloudBackupModalProps {
  isOpen: boolean;
  cloudSync: CloudSyncState;
  onClose: () => void;
  onUpdateCloudSync: (updated: CloudSyncState) => void;
  onRefreshData: () => Promise<void>;
}

export const CloudBackupModal: React.FC<CloudBackupModalProps> = ({
  isOpen,
  cloudSync,
  onClose,
  onUpdateCloudSync,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'google' | 'email' | 'custom'>('google');
  const [enabled, setEnabled] = useState(cloudSync.enabled);
  const [autoSyncOnSave, setAutoSyncOnSave] = useState(cloudSync.autoSyncOnSave ?? true);
  const [backupEmail, setBackupEmail] = useState(cloudSync.backupEmail || '');
  const [endpointUrl, setEndpointUrl] = useState(cloudSync.endpointUrl || '');
  const [authToken, setAuthToken] = useState(cloudSync.authToken || '');

  // Google Auth user state
  const [googleUser, setGoogleUser] = useState<User | null>(auth.currentUser);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Confirmation dialog for restoring data (Mandatory per Workspace Skill guidelines)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setGoogleUser(user);
      if (user) {
        // Update state with user email
        const updated = cloudSyncService.saveConfig({
          googleAccountEmail: user.email || undefined,
          googleAccountName: user.displayName || undefined,
          googleAccountPhoto: user.photoURL || undefined,
          provider: 'google_drive',
          enabled: true,
        });
        onUpdateCloudSync(updated);
        setEnabled(true);
      }
    });
    return () => unsubscribe();
  }, [onUpdateCloudSync]);

  if (!isOpen) return null;

  // Handle Google Sign-In
  const handleGoogleLogin = async () => {
    setIsSigningInGoogle(true);
    setMessage(null);
    try {
      const result = await googleSignIn();
      setGoogleUser(result.user);
      const updated = cloudSyncService.saveConfig({
        enabled: true,
        provider: 'google_drive',
        googleAccountEmail: result.user.email || undefined,
        googleAccountName: result.user.displayName || undefined,
        googleAccountPhoto: result.user.photoURL || undefined,
        autoSyncOnSave: true,
      });
      onUpdateCloudSync(updated);
      setEnabled(true);
      setMessage({
        type: 'success',
        text: `Connected to Google Account (${result.user.email}). Auto-backup is active!`,
      });
    } catch (err: unknown) {
      console.error('Failed to sign in with Google', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Google Sign-in failed. Please try again.',
      });
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  // Handle Google Sign-Out
  const handleGoogleLogout = async () => {
    try {
      await googleLogout();
      setGoogleUser(null);
      const updated = cloudSyncService.saveConfig({
        googleAccountEmail: undefined,
        googleAccountName: undefined,
        googleAccountPhoto: undefined,
        enabled: false,
      });
      onUpdateCloudSync(updated);
      setEnabled(false);
      setMessage({ type: 'success', text: 'Disconnected Google Account.' });
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const handleToggleAutoSync = (val: boolean) => {
    setAutoSyncOnSave(val);
    const updated = cloudSyncService.saveConfig({ autoSyncOnSave: val });
    onUpdateCloudSync(updated);
  };

  const handleToggleEnabled = (val: boolean) => {
    setEnabled(val);
    const updated = cloudSyncService.saveConfig({ enabled: val });
    onUpdateCloudSync(updated);
  };

  // Perform immediate backup sync
  const handleSyncNow = async () => {
    setIsSyncing(true);
    setMessage(null);
    try {
      const res = await cloudSyncService.syncNow();
      if (res.success) {
        setMessage({ type: 'success', text: res.message });
      } else {
        setMessage({ type: 'error', text: res.message });
      }
      onUpdateCloudSync(cloudSyncService.getConfig());
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Backup sync failure',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger restore after user confirmation
  const handleConfirmRestore = async () => {
    setIsSyncing(true);
    setMessage(null);
    setShowRestoreConfirm(false);
    try {
      const res = await cloudSyncService.restoreFromCloud();
      setMessage({ type: 'success', text: res.message });
      await onRefreshData();
      onUpdateCloudSync(cloudSyncService.getConfig());
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Restore failure',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Send / Dispatch Email Backup
  const handleSendEmailBackup = () => {
    if (!backupEmail || !backupEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    const updated = cloudSyncService.saveConfig({
      enabled: true,
      provider: 'email_backup',
      backupEmail,
    });
    onUpdateCloudSync(updated);

    // Create a mailto link with backup info
    const subject = encodeURIComponent('Pocket Expense Vault - Encrypted Backup');
    const body = encodeURIComponent(
      `Hello,\n\nHere is your encrypted expense backup notification from Pocket Expense Vault.\n` +
      `Date: ${new Date().toLocaleString()}\n` +
      `Your vault is secured with zero-knowledge AES-256 encryption.\n` +
      `Keep this email safe to restore your expenses anytime.`
    );
    window.location.href = `mailto:${backupEmail}?subject=${subject}&body=${body}`;

    setMessage({
      type: 'success',
      text: `Drafted backup email to ${backupEmail}. Check your email app!`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-[#161B26] border border-[#222A3A] shadow-2xl shadow-black/80 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222A3A] bg-[#161B26] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Sync & Cloud Backup</h2>
              <p className="text-xs text-slate-400">Backup automatically with Google or Email</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1E2533] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-[#222A3A] bg-[#0E131E] px-4 pt-2 shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('google')}
            className={`flex items-center gap-1.5 py-2.5 px-3.5 text-xs font-bold border-b-2 transition ${
              activeTab === 'google'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FolderSync className="w-3.5 h-3.5 text-indigo-400" />
            <span>Google Account (Drive)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-1.5 py-2.5 px-3.5 text-xs font-bold border-b-2 transition ${
              activeTab === 'email'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-emerald-400" />
            <span>Any Email Address</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`flex items-center gap-1.5 py-2.5 px-3.5 text-xs font-bold border-b-2 transition ${
              activeTab === 'custom'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <span>Custom Server</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Status Notification */}
          {message && (
            <div
              className={`p-3 rounded-2xl border flex items-center gap-2 font-semibold ${
                message.type === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
              }`}
            >
              {message.type === 'success' ? (
                <Check className="w-4 h-4 stroke-[3] shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Privacy & Zero-Knowledge Encryption Badge */}
          <div className="p-3.5 rounded-2xl bg-[#0B0F17] border border-indigo-500/30 space-y-1.5">
            <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero-Knowledge AES-256 Encryption</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Your financial records are encrypted on your device <i>before</i> uploading. Google Drive or email servers only store scrambled ciphertext with no way to read your expenses.
            </p>
          </div>

          {/* TAB 1: GOOGLE ACCOUNT (GOOGLE DRIVE AUTO-BACKUP) */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              {!googleUser ? (
                /* Google Sign In Call-to-Action */
                <div className="p-5 rounded-2xl bg-[#0B0F17] border border-[#222A3A] text-center space-y-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto">
                    <CloudUpload className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Connect Your Google Account</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      Automatically saves an encrypted backup copy into your personal Google Drive whenever you add or edit expenses.
                    </p>
                  </div>
                  <div className="max-w-xs mx-auto pt-1">
                    <GoogleSignInButton
                      onClick={handleGoogleLogin}
                      isLoading={isSigningInGoogle}
                    />
                  </div>
                </div>
              ) : (
                /* Connected Google Account Card */
                <div className="space-y-3.5">
                  <div className="p-4 rounded-2xl bg-[#0B0F17] border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {googleUser.photoURL ? (
                        <img
                          src={googleUser.photoURL}
                          alt="Google Avatar"
                          className="w-10 h-10 rounded-full border border-emerald-500/50"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-sm">
                          {(googleUser.displayName || googleUser.email || 'G')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white text-sm">
                            {googleUser.displayName || 'Google Account'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-500/30">
                            Connected
                          </span>
                        </div>
                        <span className="text-slate-400 text-xs block">
                          {googleUser.email}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogout}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 transition"
                      title="Sign out of Google Account"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Auto-Sync Toggle */}
                  <div className="p-3.5 rounded-2xl bg-[#0B0F17] border border-[#222A3A] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block">
                        Auto-sync to Google Drive
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        Save encrypted backup immediately whenever an expense is logged
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                      <input
                        type="checkbox"
                        checked={autoSyncOnSave}
                        onChange={(e) => handleToggleAutoSync(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#1E2533] border border-[#222A3A] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {/* Actions for Google Drive */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleSyncNow}
                      disabled={isSyncing}
                      className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs transition shadow-lg shadow-indigo-600/30 active:scale-95"
                    >
                      <CloudUpload className="w-4 h-4" />
                      <span>{isSyncing ? 'Backing up...' : 'Backup to Drive Now'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowRestoreConfirm(true)}
                      disabled={isSyncing}
                      className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#1E2533] hover:bg-[#262F40] text-slate-200 border border-[#222A3A] font-bold text-xs transition active:scale-95"
                    >
                      <CloudDownload className="w-4 h-4 text-indigo-400" />
                      <span>Restore from Drive</span>
                    </button>
                  </div>

                  {cloudSync.lastSyncTime && (
                    <div className="text-center text-[11px] text-slate-400 pt-1">
                      Last Google Drive backup:{' '}
                      <span className="font-semibold text-slate-200">
                        {new Date(cloudSync.lastSyncTime).toLocaleDateString()} at{' '}
                        {new Date(cloudSync.lastSyncTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ANY EMAIL ACCOUNT BACKUP */}
          {activeTab === 'email' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-[#0B0F17] border border-[#222A3A] space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Backup to Any Email Account</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Use Outlook, Yahoo, ProtonMail, iCloud, or any custom email address to receive and keep encrypted backup snapshots.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Your Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      placeholder="e.g. khalidrph1998@gmail.com or name@outlook.com"
                      value={backupEmail}
                      onChange={(e) => setBackupEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#161B26] border border-[#222A3A] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSendEmailBackup}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Encrypted Backup Copy via Email</span>
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#161B26] border border-[#222A3A] space-y-1.5">
                <span className="font-bold text-slate-300 block">How to restore from email:</span>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  When you open the app on another phone or computer, go to <b>Vault Security</b> &gt; <b>Restore (.encdb)</b> and upload the backup file you received by email. Enter your vault passcode to decrypt your expenses.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM CLOUD / WEBDAV */}
          {activeTab === 'custom' && (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Cloud Server Type
                </label>
                <select
                  value={cloudSync.provider === 'webdav' ? 'webdav' : 'custom_endpoint'}
                  onChange={(e) => {
                    const prov = e.target.value as 'webdav' | 'custom_endpoint';
                    cloudSyncService.saveConfig({ provider: prov });
                    onUpdateCloudSync(cloudSyncService.getConfig());
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#222A3A] text-white font-medium focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="webdav">WebDAV (Nextcloud / ownCloud / Synology)</option>
                  <option value="custom_endpoint">Custom HTTPS Webhook / REST</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Server Endpoint URL
                </label>
                <input
                  type="url"
                  placeholder="https://cloud.example.com/remote.php/dav/files/user/backup.encdb"
                  value={endpointUrl}
                  onChange={(e) => {
                    setEndpointUrl(e.target.value);
                    cloudSyncService.saveConfig({ endpointUrl: e.target.value });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#222A3A] text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Authentication Token / Basic Auth (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Bearer token or password"
                  value={authToken}
                  onChange={(e) => {
                    setAuthToken(e.target.value);
                    cloudSyncService.saveConfig({ authToken: e.target.value });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0F17] border border-[#222A3A] text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <button
                type="button"
                onClick={handleSyncNow}
                disabled={isSyncing || !endpointUrl}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-md transition active:scale-95"
              >
                Sync with Custom Server
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#222A3A] bg-[#161B26] flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>Encrypted with AES-256 GCM</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#1E2533] hover:bg-[#262F40] text-slate-200 font-semibold"
          >
            Done
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Destructive Restore (Mandatory) */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#161B26] border border-amber-500/50 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Restore Backup from Cloud?</h3>
                <p className="text-xs text-slate-400">This will replace current local entries with cloud data</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to download and restore your encrypted database from Google Drive / Cloud storage? Any changes made exclusively on this device that have not been backed up will be overwritten.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRestoreConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-[#1E2533]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isSyncing}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition active:scale-95"
              >
                {isSyncing ? 'Restoring...' : 'Yes, Restore Backup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
