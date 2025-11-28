import { Request, Response } from 'express';
import { VersionService } from '../services/VersionService';
import { ProcessService } from '../services/ProcessService';
import { DotnetService } from '../services/DotnetService';
import path from 'path';
import fs from 'fs';

const versionService = new VersionService();
const dotnetService = new DotnetService();
export const processService = new ProcessService();

export class ServerController {
  
  async getVersions(req: Request, res: Response) {
    try {
      const versions = await versionService.getAvailableVersions();
      const installed = versionService.getInstalledVersions();
      
      const result = versions.map(v => ({
        ...v,
        installed: installed.includes(v.version)
      }));
      
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch versions' });
    }
  }

  async installVersion(req: Request, res: Response) {
    const { version } = req.body;
    if (!version) return res.status(400).json({ error: 'Version is required' });

    try {
      await versionService.downloadAndInstall(version);
      res.json({ message: `Version ${version} installed successfully` });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  async startServer(req: Request, res: Response) {
    const { version } = req.body;
    if (!version) return res.status(400).json({ error: 'Version is required' });

    try {
      // Ensure .NET is installed
      await dotnetService.installDotnet();

      const dataPath = path.join(process.cwd(), 'server-data');
      if (!fs.existsSync(dataPath)) {
          fs.mkdirSync(dataPath);
      }
      
      processService.startServer(version, dataPath);
      res.json({ message: 'Server started' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  stopServer(req: Request, res: Response) {
    try {
      processService.stopServer();
      res.json({ message: 'Server stop command sent' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
  
  getStatus(req: Request, res: Response) {
      res.json({ status: processService.getStatus() });
  }
  
  sendCommand(req: Request, res: Response) {
      const { command } = req.body;
      if (!command) return res.status(400).json({ error: 'Command is required' });
      processService.sendCommand(command);
      res.json({ message: 'Command sent' });
  }
}
