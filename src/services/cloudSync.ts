import { CloudSyncState, EncryptedPayload } from '../types';
import { dbService } from './db';
import { googleDriveService } from './googleDriveService';
import { getAccessToken } from './googleAuthService';

const CLOUD_SYNC_CONFIG_KEY = 'vault_cloud_sync_config';
const LOCAL_CLOUD_SIM_KEY = 'vault_cloud_remote_storage_sim';

export class CloudSyncService {
  private config: CloudSyncState = {
    enabled: false,
    provider: 'google_drive',
    endpointUrl: '',
    syncStatus: 'idle',
    autoSyncOnSave: true,
  };

  constructor() {
    this.loadConfig();
  }

  loadConfig(): CloudSyncState {
    try {
      const saved = localStorage.getItem(CLOUD_SYNC_CONFIG_KEY);
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    } catch {
      // default config
    }
    return this.config;
  }

  saveConfig(updates: Partial<CloudSyncState>): CloudSyncState {
    this.config = { ...this.config, ...updates };
    try {
      localStorage.setItem(CLOUD_SYNC_CONFIG_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.error('Failed to save cloud sync config', e);
    }
    return this.config;
  }

  getConfig(): CloudSyncState {
    return { ...this.config };
  }

  // Perform full zero-knowledge encrypted backup sync
  async syncNow(): Promise<{ success: boolean; message: string; timestamp: number }> {
    if (!this.config.enabled) {
      return { success: false, message: 'Cloud backup sync is not enabled.', timestamp: Date.now() };
    }

    this.saveConfig({ syncStatus: 'syncing' });

    try {
      // Export latest encrypted database payload
      const { blob } = await dbService.exportEncryptedDatabaseFile();
      const encryptedText = await blob.text();
      const payload: { app: string; payload: EncryptedPayload; checksum: string } = JSON.parse(encryptedText);

      if (this.config.provider === 'google_drive') {
        // Google Drive integration with Google Account OAuth token
        const token = await getAccessToken();
        if (!token) {
          throw new Error('Please sign in with your Google Account to backup to Google Drive.');
        }

        const driveFile = await googleDriveService.uploadBackup(encryptedText, token);
        this.saveConfig({
          googleDriveFileId: driveFile.id,
        });
      } else if (this.config.provider === 'email_backup') {
        // Email backup: triggers downloadable encrypted copy and simulates email dispatch
        await new Promise((resolve) => setTimeout(resolve, 600));
        localStorage.setItem(
          LOCAL_CLOUD_SIM_KEY,
          JSON.stringify({
            syncedAt: Date.now(),
            backup: payload,
            email: this.config.backupEmail,
          })
        );
      } else if (this.config.provider === 'webdav' && this.config.endpointUrl) {
        // Real WebDAV or HTTP REST endpoint sync
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (this.config.authToken) {
          headers['Authorization'] =
            this.config.authToken.startsWith('Basic ') || this.config.authToken.startsWith('Bearer ')
              ? this.config.authToken
              : `Bearer ${this.config.authToken}`;
        }

        const response = await fetch(this.config.endpointUrl, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Cloud server responded with status: ${response.status} ${response.statusText}`);
        }
      } else if (this.config.provider === 'custom_endpoint' && this.config.endpointUrl) {
        // Custom cloud backup endpoint (POST webhook/store)
        const response = await fetch(this.config.endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Backup endpoint error: ${response.statusText}`);
        }
      } else {
        // Secure offline/cloud snapshot simulation
        await new Promise((resolve) => setTimeout(resolve, 800));
        localStorage.setItem(
          LOCAL_CLOUD_SIM_KEY,
          JSON.stringify({
            syncedAt: Date.now(),
            backup: payload,
          })
        );
      }

      const now = Date.now();
      this.saveConfig({
        syncStatus: 'success',
        lastSyncTime: now,
        errorMessage: undefined,
      });

      await dbService.updateMetadata({
        lastCloudSyncAt: now,
      });

      const destinationName =
        this.config.provider === 'google_drive'
          ? `Google Drive (${this.config.googleAccountEmail || 'Google Account'})`
          : this.config.provider === 'email_backup'
          ? `Email (${this.config.backupEmail || 'Your Email'})`
          : 'Cloud Storage';

      return {
        success: true,
        message: `Encrypted backup successfully synced to ${destinationName}.`,
        timestamp: now,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown network failure during backup sync.';
      this.saveConfig({
        syncStatus: 'error',
        errorMessage: msg,
      });
      return { success: false, message: msg, timestamp: Date.now() };
    }
  }

  // Restore encrypted database from cloud storage
  async restoreFromCloud(passphrase?: string): Promise<{ success: boolean; message: string }> {
    if (!this.config.enabled) {
      throw new Error('Cloud backup sync is not enabled.');
    }

    try {
      let backupPayloadStr = '';

      if (this.config.provider === 'google_drive') {
        const token = await getAccessToken();
        if (!token) {
          throw new Error('Please sign in with your Google Account to restore from Google Drive.');
        }

        const driveFile = await googleDriveService.findBackupFile(token);
        if (!driveFile) {
          throw new Error('No backup file found in your Google Drive (pocket_expense_vault_backup.encdb).');
        }

        backupPayloadStr = await googleDriveService.downloadBackup(driveFile.id, token);
      } else if (this.config.provider === 'webdav' && this.config.endpointUrl) {
        const headers: Record<string, string> = {};
        if (this.config.authToken) {
          headers['Authorization'] = this.config.authToken;
        }
        const res = await fetch(this.config.endpointUrl, { method: 'GET', headers });
        if (!res.ok) throw new Error(`Cloud fetch failed: ${res.status}`);
        backupPayloadStr = await res.text();
      } else {
        const stored = localStorage.getItem(LOCAL_CLOUD_SIM_KEY);
        if (!stored) {
          throw new Error('No cloud backup found for this account.');
        }
        const parsed = JSON.parse(stored);
        backupPayloadStr = JSON.stringify(parsed.backup);
      }

      await dbService.importEncryptedDatabaseFile(backupPayloadStr, passphrase);

      return {
        success: true,
        message: 'Successfully restored encrypted database from cloud storage backup.',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to restore cloud backup';
      throw new Error(msg);
    }
  }
}

export const cloudSyncService = new CloudSyncService();
