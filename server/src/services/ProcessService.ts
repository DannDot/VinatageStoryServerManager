import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';

export class ProcessService extends EventEmitter {
  private process: ChildProcess | null = null;
  private versionsDir = path.join(process.cwd(), 'versions');

  startServer(version: string, dataPath: string) {
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

    this.process = spawn(executablePath, ['--dataPath', dataPath], {
      cwd: serverDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });

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
      this.process = null;
      this.emit('status', 'stopped');
    });
    
    this.emit('status', 'running');
  }

  stopServer() {
    if (this.process) {
      this.process.kill();
    }
  }

  sendCommand(command: string) {
    if (this.process && this.process.stdin) {
      this.process.stdin.write(command + '\n');
    }
  }
  
  getStatus() {
      return this.process ? 'running' : 'stopped';
  }
}
