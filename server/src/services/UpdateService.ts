import { spawn, exec } from 'child_process';
import path from 'path';
import util from 'util';

const execAsync = util.promisify(exec);

export class UpdateService {
  private projectDir = path.resolve(__dirname, '../../..'); // Assuming server/src/services/../../.. is root

  async checkForUpdate(): Promise<{ updateAvailable: boolean; message: string }> {
    try {
      // Fetch latest info from remote
      await execAsync('git fetch', { cwd: this.projectDir });

      // Check how many commits we are behind
      const { stdout } = await execAsync('git rev-list HEAD...origin/main --count', { cwd: this.projectDir });
      const count = parseInt(stdout.trim(), 10);

      if (count > 0) {
        return { updateAvailable: true, message: `${count} updates available.` };
      } else {
        return { updateAvailable: false, message: 'System is up to date.' };
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      throw new Error('Failed to check for updates.');
    }
  }

  async performUpdate(): Promise<void> {
    // We spawn the update script. 
    // Note: This script requires sudo/root. 
    // If the node process is not root, this might fail or prompt for password (which will fail in non-interactive).
    // We assume the system is configured to allow this (e.g. running as root or sudoers).
    
    const updateScript = path.join(this.projectDir, 'update.sh');
    
    // We use spawn to detach the process so it can kill the server and restart it
    const child = spawn('sudo', [updateScript], {
      cwd: this.projectDir,
      detached: true,
      stdio: 'ignore'
    });

    child.unref();
  }
}

export const updateService = new UpdateService();
