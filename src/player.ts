import * as path from 'path';
import * as cp from 'child_process';
import * as vscode from 'vscode';

let extensionPath = '';

export function setExtensionPath(extPath: string): void {
  extensionPath = extPath;
}

function getSoundPath(fileName: string): string {
  return path.join(extensionPath, 'media', fileName);
}

/**
 * Cross-platform audio playback using system commands.
 * Falls back gracefully if no player is available.
 */
export function playSound(fileName: string): void {
  const config = vscode.workspace.getConfiguration('faah');
  if (!config.get<boolean>('enabled', true)) {
    return;
  }

  const volume = config.get<number>('volume', 0.7);
  const filePath = getSoundPath(fileName);

  try {
    const platform = process.platform;

    if (platform === 'darwin') {
      // macOS: afplay supports volume flag (0.0 to 1.0 mapped to 0–255)
      cp.spawn('afplay', ['-v', String(volume), filePath], {
        stdio: 'ignore',
        detached: true,
      }).unref();
    } else if (platform === 'linux') {
      // Linux: try aplay, paplay, or ffplay
      const child = cp.spawn('aplay', [filePath], {
        stdio: 'ignore',
        detached: true,
      });
      child.on('error', () => {
        cp.spawn('paplay', [filePath], {
          stdio: 'ignore',
          detached: true,
        }).unref();
      });
      child.unref();
    } else if (platform === 'win32') {
      // Windows: use PowerShell to play WAV
      const psScript = `
        Add-Type -AssemblyName System.Media
        $player = New-Object System.Media.SoundPlayer "${filePath}"
        $player.PlaySync()
      `;
      cp.spawn('powershell', ['-Command', psScript], {
        stdio: 'ignore',
        detached: true,
      }).unref();
    }
  } catch {
    // Silently fail — sounds are optional fun
  }
}

export function playFaah(): void {
  playSound('faah.mp3');
}

export function playClap(): void {
  playSound('faah.wav');
}

export function playSnoopdog(): void {
  playSound('snoopdog.mp3');
}

export function playAnimeAhh(): void {
  playSound('anime-ahh.mp3');
}
