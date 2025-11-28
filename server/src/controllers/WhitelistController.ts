import { Request, Response } from 'express';
import { whitelistService } from '../services/WhitelistService';

export class WhitelistController {
  async getWhitelist(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const players = await whitelistService.getWhitelist(parseInt(id));
      const enabled = await whitelistService.getWhitelistMode(parseInt(id));
      res.json({ enabled, players });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async addPlayer(req: Request, res: Response) {
    const { id } = req.params;
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    try {
      await whitelistService.addPlayer(parseInt(id), username);
      res.json({ message: 'Player added to whitelist' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async removePlayer(req: Request, res: Response) {
    const { id, username } = req.params;
    try {
      await whitelistService.removePlayer(parseInt(id), username);
      res.json({ message: 'Player removed from whitelist' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async setMode(req: Request, res: Response) {
    const { id } = req.params;
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'Enabled status is required' });

    try {
      await whitelistService.setWhitelistMode(parseInt(id), enabled);
      res.json({ message: `Whitelist mode ${enabled ? 'enabled' : 'disabled'}`, enabled });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export const whitelistController = new WhitelistController();
