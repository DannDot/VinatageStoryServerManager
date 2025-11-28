import fs from 'fs';
import path from 'path';
import { processService } from './ProcessService';

interface WhitelistEntry {
  uid?: string;
  name: string;
  allowed?: boolean;
  // Add other fields if known
}

export class WhitelistService {
  private getInstancePath(instanceId: number): string {
    return path.join(process.cwd(), 'server-data', 'instances', instanceId.toString());
  }

  private getWhitelistPath(instanceId: number): string {
    return path.join(this.getInstancePath(instanceId), 'Playerdata', 'playerswhitelisted.json');
  }

  private getConfigPath(instanceId: number): string {
    return path.join(this.getInstancePath(instanceId), 'serverconfig.json');
  }

  async getWhitelist(instanceId: number): Promise<WhitelistEntry[]> {
    const whitelistPath = this.getWhitelistPath(instanceId);
    if (!fs.existsSync(whitelistPath)) {
      return [];
    }
    try {
      const content = fs.readFileSync(whitelistPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error reading whitelist:', error);
      return [];
    }
  }

  async getWhitelistMode(instanceId: number): Promise<boolean> {
    const configPath = this.getConfigPath(instanceId);
    if (!fs.existsSync(configPath)) {
      return false;
    }
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      // Check both possible keys, though WhitelistMode seems to be the newer one (0=off, 1=on?)
      // Based on logs: "disable the whitelist mode with '/serverconfig whitelistmode off'"
      return config.OnlyWhitelisted === true || config.WhitelistMode === 1 || config.WhitelistMode === true;
    } catch (error) {
      console.error('Error reading config:', error);
      return false;
    }
  }

  async addPlayer(instanceId: number, username: string): Promise<void> {
    const status = processService.getStatus();
    if (status.status === 'running' && status.activeInstanceId === instanceId) {
      processService.sendCommand(`/whitelist add ${username}`);
    } else {
      // If server is offline, we can't easily generate the UID without the game logic.
      // But maybe we can just add the name and let the server handle it on startup?
      // Actually, Vintage Story might require UIDs.
      // Safest bet is to only allow adding when server is running, OR try to mimic the format.
      // For now, let's throw an error if server is offline, or just try to append if we know the format.
      // Since we don't know the UID, we might be limited.
      // However, the user asked for a page to handle it.
      
      // Let's try to just add the name if the file allows it, or rely on the server command.
      // If the server is offline, we can't execute the command.
      // We'll throw an error for now saying server must be running to add players reliably.
      throw new Error('Server must be running to add players to whitelist');
    }
  }

  async removePlayer(instanceId: number, username: string): Promise<void> {
    const status = processService.getStatus();
    if (status.status === 'running' && status.activeInstanceId === instanceId) {
      processService.sendCommand(`/whitelist remove ${username}`);
    } else {
      // We can remove by name from the JSON file
      const whitelistPath = this.getWhitelistPath(instanceId);
      if (fs.existsSync(whitelistPath)) {
        const content = fs.readFileSync(whitelistPath, 'utf-8');
        let list: WhitelistEntry[] = JSON.parse(content);
        list = list.filter(p => p.name !== username);
        fs.writeFileSync(whitelistPath, JSON.stringify(list, null, 2));
      }
    }
  }

  async setWhitelistMode(instanceId: number, enabled: boolean): Promise<void> {
    const status = processService.getStatus();
    if (status.status === 'running' && status.activeInstanceId === instanceId) {
      const cmd = enabled ? 'on' : 'off';
      processService.sendCommand(`/serverconfig whitelistmode ${cmd}`);
    } else {
      const configPath = this.getConfigPath(instanceId);
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);
        
        config.OnlyWhitelisted = enabled;
        config.WhitelistMode = enabled ? 1 : 0; // Assuming 1 is on, 0 is off based on previous observation
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      }
    }
  }
}

export const whitelistService = new WhitelistService();
