import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

export class DotnetService {
  private installDir = path.join(process.cwd(), 'dotnet');

  async isInstalled(): Promise<boolean> {
    // Check for the dotnet executable
    const dotnetPath = path.join(this.installDir, 'dotnet');
    return fs.existsSync(dotnetPath);
  }

  async installDotnet(): Promise<void> {
    if (await this.isInstalled()) {
      console.log('Dotnet runtime already installed.');
      return;
    }

    console.log('Installing .NET Runtime...');
    
    if (!fs.existsSync(this.installDir)) {
      fs.mkdirSync(this.installDir, { recursive: true });
    }

    const scriptUrl = 'https://dot.net/v1/dotnet-install.sh';
    const scriptPath = path.join(this.installDir, 'dotnet-install.sh');

    // Download the install script
    const writer = fs.createWriteStream(scriptPath);
    const response = await axios({
      url: scriptUrl,
      method: 'GET',
      responseType: 'stream'
    });

    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    });

    // Make executable
    await execAsync(`chmod +x "${scriptPath}"`);

    // Run install script
    // --runtime dotnet : installs just the runtime (sufficient for running apps)
    // --channel 8.0 : installs .NET 8
    // --install-dir : where to install
    console.log('Running dotnet-install.sh...');
    try {
        await execAsync(`"${scriptPath}" --channel 8.0 --runtime dotnet --install-dir "${this.installDir}"`);
        console.log('.NET Runtime installed successfully.');
    } catch (error) {
        console.error('Failed to install .NET runtime:', error);
        throw error;
    } finally {
        // Cleanup
        if (fs.existsSync(scriptPath)) {
            fs.unlinkSync(scriptPath);
        }
    }
  }

  getDotnetPath(): string {
    return this.installDir;
  }
}
