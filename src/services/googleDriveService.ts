import { getAccessToken } from './googleAuthService';

const BACKUP_FILE_NAME = 'pocket_expense_vault_backup.encdb';

export interface GoogleDriveFileInfo {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
}

export class GoogleDriveService {
  /**
   * Search for existing encrypted backup file in Google Drive
   */
  async findBackupFile(token?: string): Promise<GoogleDriveFileInfo | null> {
    const accessToken = token || (await getAccessToken());
    if (!accessToken) {
      throw new Error('Not authenticated with Google Account.');
    }

    const query = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size)&spaces=drive`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Drive API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
    return null;
  }

  /**
   * Upload or update the encrypted database backup in Google Drive
   */
  async uploadBackup(contentStr: string, token?: string): Promise<GoogleDriveFileInfo> {
    const accessToken = token || (await getAccessToken());
    if (!accessToken) {
      throw new Error('Not authenticated with Google Account.');
    }

    // Check if backup already exists
    const existingFile = await this.findBackupFile(accessToken);

    if (existingFile) {
      // Update existing file content
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`;
      const updateRes = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: contentStr,
      });

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        throw new Error(`Failed to update backup file in Google Drive: ${errText}`);
      }

      const updated = await updateRes.json();
      return {
        id: updated.id,
        name: updated.name || BACKUP_FILE_NAME,
        modifiedTime: new Date().toISOString(),
      };
    } else {
      // Create new file with multipart upload
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: 'application/json',
        description: 'Encrypted Offline Expense Vault Backup (AES-256 GCM)',
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        contentStr +
        closeDelimiter;

      const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Failed to upload backup to Google Drive: ${errText}`);
      }

      const created = await createRes.json();
      return {
        id: created.id,
        name: created.name,
        modifiedTime: new Date().toISOString(),
      };
    }
  }

  /**
   * Download the encrypted backup file content from Google Drive
   */
  async downloadBackup(fileId: string, token?: string): Promise<string> {
    const accessToken = token || (await getAccessToken());
    if (!accessToken) {
      throw new Error('Not authenticated with Google Account.');
    }

    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to download backup from Google Drive: ${err}`);
    }

    return await res.text();
  }
}

export const googleDriveService = new GoogleDriveService();
