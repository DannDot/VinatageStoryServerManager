import { spawn, ChildProcess, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import pidusage from 'pidusage';
import util from 'util';
import { DotnetService } from './DotnetService';
import { dbService } from './DatabaseService';

const dotnetService = new DotnetService();
const execAsync = util.promisify(exec);

export class ProcessService extends EventEmitter {
  private process: ChildProcess | null = null;
  private activeInstanceId: number | null = null;
  private versionsDir = path.join(process.cwd(), 'versions');
  private statsInterval: NodeJS.Timeout | null = null;

  async startServer(version: string, dataPath: string, instanceId: number) {
    if (this.process) {
      throw new Error('Server is already running');
    }

    const serverDir = path.join(this.versionsDir, version);
    if (!fs.existsSync(serverDir)) {
      throw new Error(`Version ${version} is not installed`);
    }

    const executablePath = path.join(serverDir, 'VintagestoryServer');
    
    if (!fs.existsSync(executablePath)) {
         throw new Error(`Server executable not found in ${serverDir}`);
    }

    fs.chmodSync(executablePath, '755');

    console.log(`Starting server from ${serverDir} with data path ${dataPath}`);
    await dbService.logEvent('SERVER_START', `Starting server instance ${instanceId} (v${version})`);

    const dotnetPath = dotnetService.getDotnetPath();
    const env = {
        ...process.env,
        DOTNET_ROOT: dotnetPath,
        PATH: `${dotnetPath}:${process.env.PATH}`
    };

    this.process = spawn(executablePath, ['--dataPath', dataPath], {
      cwd: serverDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env
    });
    
    this.activeInstanceId = instanceId;
    console.log('Starting stats monitoring...');
    this.startStatsMonitoring();

    this.process.stdout?.on('data', (data) => {
      const log = data.toString();
      console.log(`[Server]: ${log}`);
      this.emit('log', log);
    });

    this.process.stderr?.on('data', (data) => {
      const log = data.toString();
      console.error(`[Server Error]: ${log}`);
      this.emit('log', log);
    });

    this.process.on('close', (code) => {
      console.log(`Server process exited with code ${code}`);
      dbService.logEvent('SERVER_STOP', `Server process exited with code ${code}`);
      this.stopStatsMonitoring();
      this.process = null;
      this.activeInstanceId = null;
      this.emit('status', { status: 'stopped', activeInstanceId: null });
    });
    
    this.emit('status', { status: 'running', activeInstanceId: this.activeInstanceId });
  }

  private startStatsMonitoring() {
    if (this.statsInterval) clearInterval(this.statsInterval);

    this.statsInterval = setInterval(async () => {
      if (!this.process || !this.process.pid) return;

      try {
        const stats = await pidusage(this.process.pid);
        
        // Get disk usage of server-data
        let diskUsage = 0;
        try {
            const { stdout } = await execAsync('du -sb server-data');
            diskUsage = parseInt(stdout.split('\t')[0], 10);
        } catch (e) {
            // Ignore disk usage error
        }

        this.emit('stats', {
          cpu: stats.cpu,
          memory: stats.memory,
          disk: diskUsage,
          timestamp: Date.now()
        });
      } catch (err) {
        console.error('Error in stats monitoring:', err);
        // Process might have exited
      }
    }, 2000); // Every 2 seconds
  }

  private stopStatsMonitoring() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  async stopServer(): Promise<void> {
    if (!this.process) return;
    
    this.stopStatsMonitoring();

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      const onExit = () => {
        resolve();
      };

      this.process.once('close', onExit);
      this.process.kill('SIGTERM'); // Try graceful stop first

      // Force kill if it doesn't stop in 10 seconds
      setTimeout(() => {
        if (this.process) {
          console.log('Force killing server process...');
          this.process.kill('SIGKILL');
          resolve();
        }
      }, 10000);
    });
  }

  sendCommand(command: string) {
    if (this.process && this.process.stdin) {
      this.process.stdin.write(command + '\n');
    }
  }
  
  getStatus() {
      return {
        status: this.process ? 'running' : 'stopped',
        activeInstanceId: this.activeInstanceId
      };
  }
}

export const processService = new ProcessService();
