import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { DotnetService } from './DotnetService';

const execAsync = promisify(exec);
const dotnetService = new DotnetService();

export interface VersionInfo {
  version: string;
  type: 'stable' | 'unstable';
  url: string;
  filename: string;
}

export class VersionService {
  private versionsDir = path.join(process.cwd(), 'versions');

  constructor() {
    if (!fs.existsSync(this.versionsDir)) {
      fs.mkdirSync(this.versionsDir);
    }
  }

  async getAvailableVersions(): Promise<VersionInfo[]> {
    try {
      const [stableRes, unstableRes] = await Promise.all([
        axios.get('https://api.vintagestory.at/stable.json'),
        axios.get('https://api.vintagestory.at/unstable.json')
      ]);

      const versions: VersionInfo[] = [];

      const processData = (data: any, type: 'stable' | 'unstable') => {
        for (const [version, info] of Object.entries(data)) {
          const linuxServer = (info as any).linuxserver;
          if (linuxServer) {
            versions.push({
              version,
              type,
              url: linuxServer.urls.cdn,
              filename: linuxServer.filename
            });
          }
        }
      };

      processData(stableRes.data, 'stable');
      processData(unstableRes.data, 'unstable');

      return versions.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
    } catch (error) {
      console.error('Error fetching versions:', error);
      throw new Error('Failed to fetch available versions');
    }
  }

  getInstalledVersions(): string[] {
    if (!fs.existsSync(this.versionsDir)) {
      return [];
    }
    return fs.readdirSync(this.versionsDir).filter(file => {
      return fs.statSync(path.join(this.versionsDir, file)).isDirectory();
    });
  }

  async downloadAndInstall(version: string): Promise<void> {
    const versions = await this.getAvailableVersions();
    const targetVersion = versions.find(v => v.version === version);
    
    if (!targetVersion) {
      throw new Error(`Version ${version} not found`);
    }

    const downloadPath = path.join(this.versionsDir, targetVersion.filename);
    const installPath = path.join(this.versionsDir, version);

    if (fs.existsSync(installPath)) {
      console.log(`Version ${version} already installed.`);
      return; 
    }

    console.log(`Downloading ${version} from ${targetVersion.url}...`);
    const writer = fs.createWriteStream(downloadPath);
    const response = await axios({
      url: targetVersion.url,
      method: 'GET',
      responseType: 'stream'
    });

    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    });

    console.log(`Extracting ${version}...`);
    if (!fs.existsSync(installPath)) {
      fs.mkdirSync(installPath);
    }

    // The tar usually contains a folder structure, often just files or a 'server' folder.
    // We should check the content or just extract.
    // Vintage Story server tarballs usually extract to the current directory or a specific folder.
    // Let's extract to the installPath.
    await execAsync(`tar -xzf "${downloadPath}" -C "${installPath}"`);
    
    // Check if it extracted into a subdirectory (e.g. "server" or "package")
    const files = fs.readdirSync(installPath);
    if (files.length === 1 && fs.statSync(path.join(installPath, files[0])).isDirectory()) {
        const subDir = path.join(installPath, files[0]);
        const subFiles = fs.readdirSync(subDir);
        for (const file of subFiles) {
            fs.renameSync(path.join(subDir, file), path.join(installPath, file));
        }
        fs.rmdirSync(subDir);
    }
    
    // Cleanup tar
    fs.unlinkSync(downloadPath);
    console.log(`Version ${version} installed successfully.`);
  }
}

