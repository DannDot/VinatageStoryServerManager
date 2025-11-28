import { Request, Response } from 'express';
import { VersionService } from '../services/VersionService';
import { processService } from '../services/ProcessService';
import { DotnetService } from '../services/DotnetService';
import { instanceService } from '../services/ServerInstanceService';
import path from 'path';
import fs from 'fs';

const versionService = new VersionService();
const dotnetService = new DotnetService();

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

  async getInstances(req: Request, res: Response) {
    try {
      const instances = await instanceService.getInstances();
      res.json(instances);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  async createInstance(req: Request, res: Response) {
    const { name, version } = req.body;
    if (!name || !version) return res.status(400).json({ error: 'Name and version are required' });

    try {
      const instance = await instanceService.createInstance(name, version);
      res.json(instance);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  async deleteInstance(req: Request, res: Response) {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID is required' });

    try {
      await instanceService.deleteInstance(parseInt(id));
      res.json({ message: 'Instance deleted' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  async startServer(req: Request, res: Response) {
    const { instanceId } = req.body;
    if (!instanceId) return res.status(400).json({ error: 'Instance ID is required' });

    try {
      const instance = await instanceService.getInstance(instanceId);
      if (!instance) return res.status(404).json({ error: 'Instance not found' });

      // Check if version is installed, if not, install it
      const installedVersions = versionService.getInstalledVersions();
      if (!installedVersions.includes(instance.version)) {
        console.log(`Version ${instance.version} not installed. Auto-installing...`);
        await versionService.downloadAndInstall(instance.version);
      }

      // Ensure .NET is installed
      await dotnetService.installDotnet();

      // Stop any running server gracefully
      const status = processService.getStatus();
      if (status.status === 'running') {
        console.log('Stopping currently running server...');
        await processService.stopServer();
      }
      
      await processService.startServer(instance.version, instance.path, instanceId);
      res.json({ message: 'Server started' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  async stopServer(req: Request, res: Response) {
    try {
      await processService.stopServer();
      res.json({ message: 'Server stop command sent' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  async getConfig(req: Request, res: Response) {
    const { instanceId } = req.params;
    if (!instanceId) return res.status(400).json({ error: 'Instance ID is required' });

    try {
      const instance = await instanceService.getInstance(parseInt(instanceId));
      if (!instance) return res.status(404).json({ error: 'Instance not found' });

      const configPath = path.join(instance.path, 'serverconfig.json');
      if (!fs.existsSync(configPath)) {
        return res.status(404).json({ error: 'Config file not found. Start the server once to generate it.' });
      }

      const config = fs.readFileSync(configPath, 'utf-8');
      res.json(JSON.parse(config));
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }

  async saveConfig(req: Request, res: Response) {
    const { instanceId } = req.params;
    const { config } = req.body;
    
    if (!instanceId) return res.status(400).json({ error: 'Instance ID is required' });
    if (!config) return res.status(400).json({ error: 'Config data is required' });

    try {
      const instance = await instanceService.getInstance(parseInt(instanceId));
      if (!instance) return res.status(404).json({ error: 'Instance not found' });

      const configPath = path.join(instance.path, 'serverconfig.json');
      
      // Validate JSON
      const configStr = JSON.stringify(config, null, 2);
      
      fs.writeFileSync(configPath, configStr, 'utf-8');
      res.json({ message: 'Configuration saved' });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
  
  getStatus(req: Request, res: Response) {
      res.json(processService.getStatus());
  }
  
  sendCommand(req: Request, res: Response) {
      const { command } = req.body;
      if (!command) return res.status(400).json({ error: 'Command is required' });
      processService.sendCommand(command);
      res.json({ message: 'Command sent' });
  }
}
