import { processService } from './ProcessService';
import { dbService } from './DatabaseService';
import { getIO } from '../socket';

class PlayerService {
  private nameToUid: Map<string, string> = new Map();

  constructor() {
    this.initialize();
  }

  private initialize() {
    processService.on('log', (log: string) => this.handleLog(log));
    processService.on('status', (status: { status: string }) => {
      if (status.status === 'stopped') {
        this.handleServerStop();
      }
    });
  }

  private async emitPlayersUpdate() {
    try {
      const players = await this.getPlayers();
      try {
        getIO().emit('players-update', players);
      } catch (e) {
        // Socket might not be initialized yet during startup
      }
    } catch (error) {
      console.error('Error emitting players update:', error);
    }
  }

  private async handleServerStop() {
    try {
      await dbService.setAllPlayersOffline();
      await this.emitPlayersUpdate();
    } catch (error) {
      console.error('Error setting players offline:', error);
    }
  }

  private async handleLog(log: string) {
    try {
      // Identification: Get UID and Name
      // 28.11.2025 20:45:37 [Server Notification] Client 1 uid IbI4Fuu3SxGfuSvjIOk3DZ4B attempting identification. Name: Uraka
      const idMatch = log.match(/Client \d+ uid ([^ ]+) attempting identification\. Name: (.+)/);
      if (idMatch) {
        const [, uid, name] = idMatch;
        this.nameToUid.set(name.trim(), uid.trim());
        return;
      }

      // Join: Get Name and IP (and set online)
      // 28.11.2025 20:45:41 [Server Event] Uraka [::ffff:149.102.168.245]:57239 joins.
      const joinMatch = log.match(/\[Server Event\] (.+) \[([^\]]+)\]:\d+ joins\./);
      if (joinMatch) {
        const [, name, ip] = joinMatch;
        const cleanName = name.trim();
        const cleanIp = ip.replace('::ffff:', '').trim(); // Clean up IPv6 mapped IPv4
        const uid = this.nameToUid.get(cleanName) || null;
        
        await dbService.upsertPlayer(cleanName, uid, cleanIp, true);
        await this.emitPlayersUpdate();
        return;
      }

      // Leave: Set offline
      // 28.11.2025 20:47:23 [Server Event] Player Uraka left.
      const leftMatch = log.match(/\[Server Event\] Player (.+) left\./);
      if (leftMatch) {
        const [, name] = leftMatch;
        await dbService.setPlayerOffline(name.trim());
        await this.emitPlayersUpdate();
        return;
      }

      // Disconnect: Set offline (Backup check)
      // 28.11.2025 20:47:23 [Server Notification] UDP: client disconnected Uraka
      const disconnectMatch = log.match(/UDP: client disconnected (.+)/);
      if (disconnectMatch) {
        const [, name] = disconnectMatch;
        await dbService.setPlayerOffline(name.trim());
        await this.emitPlayersUpdate();
        return;
      }

    } catch (error) {
      console.error('Error processing player log:', error);
    }
  }

  async getPlayers() {
    return await dbService.getPlayers();
  }
}

export const playerService = new PlayerService();
