import { Request, Response } from 'express';
import { backupService } from '../services/BackupService';

export class BackupController {
  async getBackups(req: Request, res: Response) {
    try {
      const instanceId = parseInt(req.params.id);
      if (isNaN(instanceId)) {
        return res.status(400).json({ error: 'Invalid instance ID' });
      }
      const backups = await backupService.getBackups(instanceId);
      res.json(backups);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch backups' });
    }
  }

  async createBackup(req: Request, res: Response) {
    try {
      const instanceId = parseInt(req.params.id);
      if (isNaN(instanceId)) {
        return res.status(400).json({ error: 'Invalid instance ID' });
      }
      const backup = await backupService.createBackup(instanceId);
      res.json(backup);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create backup' });
    }
  }

  async restoreBackup(req: Request, res: Response) {
    try {
      const instanceId = parseInt(req.params.id);
      const { filename } = req.body;
      if (isNaN(instanceId) || !filename) {
        return res.status(400).json({ error: 'Invalid parameters' });
      }
      await backupService.restoreBackup(instanceId, filename);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to restore backup' });
    }
  }

  async deleteBackup(req: Request, res: Response) {
    try {
      const instanceId = parseInt(req.params.id);
      const { filename } = req.params;
      if (isNaN(instanceId) || !filename) {
        return res.status(400).json({ error: 'Invalid parameters' });
      }
      await backupService.deleteBackup(instanceId, filename);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete backup' });
    }
  }
}

export const backupController = new BackupController();
