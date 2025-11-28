import axios from 'axios';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { dbService } from './DatabaseService';

const MOD_DB_API = 'https://mods.vintagestory.at/api';

export interface ModInfo {
  modid: number;
  assetid: number;
  name: string;
  summary: string;
  author: string;
  logo: string | null;
  lastreleased: string;
  tags: string[];
  side: string;
  downloads: number;
  trendingpoints: number;
  comments: number;
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

export interface ModListOptions {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'downloads' | 'trending' | 'name';
  order?: 'asc' | 'desc';
  search?: string;
}

export class ModService {
  private modListCache: ModInfo[] | null = null;
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour
  private readonly CACHE_FILE = path.join(process.cwd(), 'server-data', 'Cache', 'modlist.json');

  constructor() {
    this.loadCacheFromDisk();
  }

  private getModsPath(instanceId: number): string {
    return path.join(process.cwd(), 'server-data', 'instances', instanceId.toString(), 'Mods');
  }

  private loadCacheFromDisk() {
    try {
      if (fs.existsSync(this.CACHE_FILE)) {
        const data = fs.readFileSync(this.CACHE_FILE, 'utf-8');
        const cache = JSON.parse(data);
        if (cache.mods && Array.isArray(cache.mods)) {
          this.modListCache = cache.mods;
          this.lastCacheUpdate = cache.timestamp || 0;
          console.log(`Loaded ${cache.mods.length} mods from disk cache.`);
        }
      }
    } catch (error) {
      console.error('Failed to load mod cache from disk:', error);
    }
  }

  private saveCacheToDisk() {
    try {
      const cacheDir = path.dirname(this.CACHE_FILE);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      fs.writeFileSync(this.CACHE_FILE, JSON.stringify({
        timestamp: this.lastCacheUpdate,
        mods: this.modListCache
      }));
    } catch (error) {
      console.error('Failed to save mod cache to disk:', error);
    }
  }

  async forceRefreshCache(): Promise<void> {
    await this.refreshCache();
  }

  async getModList(options: ModListOptions = {}): Promise<{ mods: ModInfo[], total: number }> {
    try {
      // Update cache if needed and not present
      if (!this.modListCache || (this.modListCache.length === 0)) {
        await this.refreshCache();
      }
      // Note: We don't auto-refresh on TTL anymore to give user control, 
      // or we could keep it but rely on the disk cache primarily.
      // Let's keep the TTL check but only if we haven't loaded from disk recently?
      // Actually, user asked for a button. Let's respect the TTL but allow the button to override.
      else if (Date.now() - this.lastCacheUpdate > this.CACHE_TTL) {
         // Background refresh if expired, but return current cache immediately?
         // Or just wait. Let's wait to ensure freshness.
         await this.refreshCache();
      }

      let mods = [...(this.modListCache || [])];

      // Search
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        mods = mods.filter(mod => 
          (mod.name || '').toLowerCase().includes(searchLower) ||
          (mod.summary || '').toLowerCase().includes(searchLower) ||
          (mod.author || '').toLowerCase().includes(searchLower) ||
          (mod.tags || []).some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      // Sort
      const sort = options.sort || 'newest';
      const order = options.order || 'desc';
      
      mods.sort((a, b) => {
        let comparison = 0;
        switch (sort) {
          case 'downloads':
            comparison = (Number(a.downloads) || 0) - (Number(b.downloads) || 0);
            break;
          case 'trending':
            comparison = (Number(a.trendingpoints) || 0) - (Number(b.trendingpoints) || 0);
            break;
          case 'name':
            comparison = (a.name || '').localeCompare(b.name || '');
            break;
          case 'newest':
          default:
            comparison = new Date(a.lastreleased).getTime() - new Date(b.lastreleased).getTime();
            break;
        }
        return order === 'desc' ? -comparison : comparison;
      });

      // Pagination
      const page = options.page || 1;
      const limit = options.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const total = mods.length;

      return {
        mods: mods.slice(startIndex, endIndex),
        total
      };
    } catch (error) {
      console.error('Error fetching mod list:', error);
      return { mods: [], total: 0 };
    }
  }

  private async refreshCache() {
    try {
      console.log('Refreshing mod list cache from API...');
      const response = await axios.get(`${MOD_DB_API}/mods`);
      if (response.data && response.data.mods) {
        this.modListCache = response.data.mods;
        this.lastCacheUpdate = Date.now();
        this.saveCacheToDisk();
      }
    } catch (error) {
      console.error('Failed to refresh mod cache:', error);
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
