import axios from 'axios';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { dbService } from './DatabaseService';

const MOD_DB_API = 'https://mods.vintagestory.at/api';

export interface ModInfo {
  modid: number;
  name: string;
  summary: string;
  author: string;
  logo: string | null;
  lastreleased: string;
  tags: string[];
  side: string;
}

export interface InstalledMod {
  filename: string;
  modid?: string;
  name?: string;
  version?: string;
  description?: string;
  authors?: string[];
  isEnabled: boolean;
}

export class ModService {
  private getModsPath(instanceId: number): string {
    return path.join(process.cwd(), 'server-data', 'instances', instanceId.toString(), 'Mods');
  }

  async getModList(): Promise<ModInfo[]> {
    try {
      const response = await axios.get(`${MOD_DB_API}/mods`);
      if (response.data && response.data.mods) {
        return response.data.mods;
      }
      return [];
    } catch (error) {
      console.error('Error fetching mod list:', error);
      return [];
    }
  }

  async getModDetails(modId: number): Promise<any> {
    try {
      const response = await axios.get(`${MOD_DB_API}/mod/${modId}`);
      return response.data?.mod;
    } catch (error) {
      console.error(`Error fetching details for mod ${modId}:`, error);
      return null;
    }
  }

  async installMod(instanceId: number, modId: number): Promise<boolean> {
    const modDetails = await this.getModDetails(modId);
    if (!modDetails || !modDetails.releases || modDetails.releases.length === 0) {
      throw new Error('Mod not found or no releases available');
    }

    // TODO: Better version matching based on server version
    // For now, take the latest release
    const latestRelease = modDetails.releases[0];
    const downloadUrl = latestRelease.mainfile;
    const filename = latestRelease.filename;

    if (!downloadUrl) {
      throw new Error('No download URL found for this mod');
    }

    const modsPath = this.getModsPath(instanceId);
    if (!fs.existsSync(modsPath)) {
      fs.mkdirSync(modsPath, { recursive: true });
    }

    const filePath = path.join(modsPath, filename);
    
    console.log(`Downloading mod ${modDetails.name} from ${downloadUrl}...`);
    
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(true));
      writer.on('error', reject);
    });
  }

  async uploadMod(instanceId: number, file: Express.Multer.File): Promise<void> {
    const modsPath = this.getModsPath(instanceId);
    if (!fs.existsSync(modsPath)) {
      fs.mkdirSync(modsPath, { recursive: true });
    }

    const targetPath = path.join(modsPath, file.originalname);
    fs.renameSync(file.path, targetPath);
  }

  async getInstalledMods(instanceId: number): Promise<InstalledMod[]> {
    const modsPath = this.getModsPath(instanceId);
    if (!fs.existsSync(modsPath)) {
      return [];
    }

    const files = fs.readdirSync(modsPath).filter(f => f.endsWith('.zip'));
    const mods: InstalledMod[] = [];

    for (const file of files) {
      const filePath = path.join(modsPath, file);
      let modInfo: Partial<InstalledMod> = { filename: file, isEnabled: true };

      try {
        const zip = new AdmZip(filePath);
        const modInfoEntry = zip.getEntry('modinfo.json');
        
        if (modInfoEntry) {
          const jsonContent = zip.readAsText(modInfoEntry);
          const parsed = JSON.parse(jsonContent);
          modInfo = {
            ...modInfo,
            modid: parsed.modid,
            name: parsed.name,
            version: parsed.version,
            description: parsed.description,
            authors: parsed.authors
          };
        }
      } catch (err) {
        console.warn(`Failed to read modinfo.json from ${file}`, err);
      }

      // Check if disabled (ends with .disabled? or just moved to a disabled folder? 
      // VS usually disables by renaming or config. For now assume all in Mods are enabled)
      
      mods.push(modInfo as InstalledMod);
    }

    return mods;
  }

  async deleteMod(instanceId: number, filename: string): Promise<void> {
    const modsPath = this.getModsPath(instanceId);
    const filePath = path.join(modsPath, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

export const modService = new ModService();
