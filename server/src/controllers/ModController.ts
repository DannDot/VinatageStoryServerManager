import { Request, Response } from 'express';
import { modService } from '../services/ModService';

export class ModController {
  async getModList(req: Request, res: Response) {
    try {
      const mods = await modService.getModList();
      res.json(mods);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch mod list' });
    }
  }

  async getInstalledMods(req: Request, res: Response) {
    try {
      const instanceId = parseInt(req.params.id);
      if (isNaN(instanceId)) {
        return res.status(400).json({ error: 'Invalid instance ID' });
      }
      const mods = await modService.getInstalledMods(instanceId);
      res.json(mods);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch installed mods' });
    }
  }

  async installMod(req: Request, res: Response) {
    try {
      const instanceId = parseInt(req.params.id);
      const { modId } = req.body;
      
      if (isNaN(instanceId) || !modId) {
        return res.status(400).json({ error: 'Invalid parameters' });
      }

      await modService.installMod(instanceId, modId);
      res.json({ success: true });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || 'Failed to install mod' });
    }
  }

  async uploadMod(req: Request, res: Response) {
    try {
      const instanceId = parseInt(req.params.id);
      if (isNaN(instanceId) || !req.file) {
        return res.status(400).json({ error: 'Invalid parameters or no file uploaded' });
      }

      await modService.uploadMod(instanceId, req.file);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to upload mod' });
    }
  }

  async deleteMod(req: Request, res: Response) {
    try {
      const instanceId = parseInt(req.params.id);
      const filename = req.params.filename;
      
      if (isNaN(instanceId) || !filename) {
        return res.status(400).json({ error: 'Invalid parameters' });
      }

      await modService.deleteMod(instanceId, filename);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete mod' });
    }
  }
}

export const modController = new ModController();
