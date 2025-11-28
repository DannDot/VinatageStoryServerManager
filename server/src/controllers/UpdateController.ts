import { Request, Response } from 'express';
import { updateService } from '../services/UpdateService';

export class UpdateController {
  async checkUpdate(req: Request, res: Response) {
    try {
      const result = await updateService.checkForUpdate();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to check for updates' });
    }
  }

  async performUpdate(req: Request, res: Response) {
    try {
      await updateService.performUpdate();
      res.json({ message: 'Update started. The server will restart shortly.' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to start update' });
    }
  }
}

export const updateController = new UpdateController();
