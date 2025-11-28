import { Request, Response } from 'express';
import { playerService } from '../services/PlayerService';

export class PlayerController {
  async getPlayers(req: Request, res: Response) {
    try {
      const players = await playerService.getPlayers();
      res.json(players);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export const playerController = new PlayerController();
