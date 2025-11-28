import path from 'path';
import fs from 'fs';
import { dbService } from './DatabaseService';

export class ServerInstanceService {
  private instancesDir = path.join(process.cwd(), 'server-data', 'instances');

  constructor() {
    if (!fs.existsSync(this.instancesDir)) {
      fs.mkdirSync(this.instancesDir, { recursive: true });
    }
  }

  async createInstance(name: string, version: string) {
    const id = await dbService.createInstance(name, version);
    const instancePath = path.join(this.instancesDir, id.toString());
    
    if (!fs.existsSync(instancePath)) {
      fs.mkdirSync(instancePath, { recursive: true });
    }
    
    return { id, name, version, path: instancePath };
  }

  async getInstances() {
    return await dbService.getInstances();
  }

  async getInstance(id: number) {
    const instance = await dbService.getInstance(id);
    if (!instance) return null;
    
    return {
      ...instance,
      path: path.join(this.instancesDir, id.toString())
    };
  }

  async deleteInstance(id: number) {
    await dbService.deleteInstance(id);
    const instancePath = path.join(this.instancesDir, id.toString());
    if (fs.existsSync(instancePath)) {
      fs.rmSync(instancePath, { recursive: true, force: true });
    }
  }
}

export const instanceService = new ServerInstanceService();
