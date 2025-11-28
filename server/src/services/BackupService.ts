import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { processService } from './ProcessService';
import { instanceService } from './ServerInstanceService';

export interface BackupInfo {
  filename: string;
  size: number;
  createdAt: Date;
}

export class BackupService {
  private getInstancePath(instanceId: number): string {
    return path.join(process.cwd(), 'server-data', 'instances', instanceId.toString());
  }

  private getBackupsPath(instanceId: number): string {
    return path.join(this.getInstancePath(instanceId), 'Backups');
  }

  async getBackups(instanceId: number): Promise<BackupInfo[]> {
    const backupsPath = this.getBackupsPath(instanceId);
    if (!fs.existsSync(backupsPath)) {
      return [];
    }

    const files = fs.readdirSync(backupsPath);
    return files
      .filter(file => file.endsWith('.zip'))
      .map(file => {
        const stats = fs.statSync(path.join(backupsPath, file));
        return {
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createBackup(instanceId: number): Promise<BackupInfo> {
    const instancePath = this.getInstancePath(instanceId);
    const backupsPath = this.getBackupsPath(instanceId);

    if (!fs.existsSync(backupsPath)) {
      fs.mkdirSync(backupsPath, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.zip`;
    const zip = new AdmZip();

    // Add all files from instance directory, excluding Backups folder
    const items = fs.readdirSync(instancePath);
    for (const item of items) {
      if (item === 'Backups' || item === 'BackupSaves') continue;
      const fullPath = path.join(instancePath, item);
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        zip.addLocalFolder(fullPath, item);
      } else {
        zip.addLocalFile(fullPath);
      }
    }

    const targetPath = path.join(backupsPath, filename);
    zip.writeZip(targetPath);

    const stats = fs.statSync(targetPath);
    return {
      filename,
      size: stats.size,
      createdAt: stats.birthtime
    };
  }

  async restoreBackup(instanceId: number, filename: string): Promise<void> {
    const status = processService.getStatus();
    let wasRunning = false;
    if (status.status === 'running' && status.activeInstanceId === instanceId) {
      await processService.stopServer();
      wasRunning = true;
    }

    const backupsPath = this.getBackupsPath(instanceId);
    const backupFile = path.join(backupsPath, filename);
    
    if (!fs.existsSync(backupFile)) {
      throw new Error('Backup file not found');
    }

    const instancePath = this.getInstancePath(instanceId);
    
    // Unzip
    const zip = new AdmZip(backupFile);
    zip.extractAllTo(instancePath, true);

    if (wasRunning) {
      const instance = await instanceService.getInstance(instanceId);
      if (instance) {
        await processService.startServer(instance.version, instance.path, instanceId);
      }
    }
  }

  async deleteBackup(instanceId: number, filename: string): Promise<void> {
    const backupsPath = this.getBackupsPath(instanceId);
    const backupFile = path.join(backupsPath, filename);
    if (fs.existsSync(backupFile)) {
      fs.unlinkSync(backupFile);
    }
  }
}

export const backupService = new BackupService();
