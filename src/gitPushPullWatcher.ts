import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import { playSnoopdog, playAnimeAhh } from './player';

const log = vscode.window.createOutputChannel('Faah!');

let lastPullSoundTime = 0;
let lastPushSoundTime = 0;
const COOLDOWN_MS = 10000;

function canPlayPull(): boolean {
  const now = Date.now();
  if (now - lastPullSoundTime < COOLDOWN_MS) {
    log.appendLine('[Faah!] Pull sound skipped — cooldown active');
    return false;
  }
  lastPullSoundTime = now;
  return true;
}

function canPlayPush(): boolean {
  const now = Date.now();
  if (now - lastPushSoundTime < COOLDOWN_MS) {
    log.appendLine('[Faah!] Push sound skipped — cooldown active');
    return false;
  }
  lastPushSoundTime = now;
  return true;
}

export function activateGitPushPullWatcher(context: vscode.ExtensionContext): void {
  const config = () => vscode.workspace.getConfiguration('faah');

  log.appendLine('[Faah!] Activating git push/pull watcher...');

  watchTerminalCommands(context, config);
  watchTasks(context, config);
  watchGitRefs(context, config);
}

function watchTerminalCommands(
  context: vscode.ExtensionContext,
  config: () => vscode.WorkspaceConfiguration
): void {
  if (!vscode.window.onDidEndTerminalShellExecution) {
    log.appendLine('[Faah!] Shell integration API not available — skipping terminal watcher');
    return;
  }

  log.appendLine('[Faah!] Shell integration API available — registering terminal watcher');

  context.subscriptions.push(
    vscode.window.onDidEndTerminalShellExecution((e) => {
      const cmd = e.execution.commandLine.value.trim();
      log.appendLine(`[Faah!] Terminal command ended: "${cmd}" (exit: ${e.exitCode})`);

      if (e.exitCode !== 0) {
        log.appendLine('[Faah!] Non-zero exit code, skipping');
        return;
      }

      if (/^git\s+push\b/i.test(cmd)) {
        log.appendLine('[Faah!] Detected git push via terminal');
        if (config().get<boolean>('playSoundOnPush', true) && canPlayPush()) {
          playSnoopdog();
          vscode.window.setStatusBarMessage(
            '$(cloud-upload) Pushed! *drop it like it\'s hot*',
            5000
          );
        }
      }

      if (/^git\s+pull\b/i.test(cmd)) {
        log.appendLine('[Faah!] Detected git pull via terminal');
        if (config().get<boolean>('playSoundOnPull', true) && canPlayPull()) {
          playAnimeAhh();
          vscode.window.setStatusBarMessage(
            '$(cloud-download) Pulled! *anime-ahh*',
            5000
          );
        }
      }
    })
  );
}

function watchTasks(
  context: vscode.ExtensionContext,
  config: () => vscode.WorkspaceConfiguration
): void {
  log.appendLine('[Faah!] Registering task watcher');

  context.subscriptions.push(
    vscode.tasks.onDidEndTaskProcess((e) => {
      const taskName = e.execution.task.name.toLowerCase();
      log.appendLine(`[Faah!] Task ended: "${taskName}" (exit: ${e.exitCode})`);

      if (e.exitCode !== 0) {
        return;
      }

      if (taskName.includes('push')) {
        if (config().get<boolean>('playSoundOnPush', true) && canPlayPush()) {
          playSnoopdog();
          vscode.window.setStatusBarMessage(
            '$(cloud-upload) Pushed! *drop it like it\'s hot*',
            5000
          );
        }
      }

      if (taskName.includes('pull') && !taskName.includes('pull request')) {
        if (config().get<boolean>('playSoundOnPull', true) && canPlayPull()) {
          playAnimeAhh();
          vscode.window.setStatusBarMessage(
            '$(cloud-download) Pulled! *anime-ahh*',
            5000
          );
        }
      }
    })
  );
}

/**
 * Fallback: watches .git/FETCH_HEAD and .git/refs for changes.
 * - FETCH_HEAD is written on every git pull/fetch.
 * - refs/remotes changes on push (remote tracking refs update).
 * This works even without shell integration.
 */
function watchGitRefs(
  context: vscode.ExtensionContext,
  config: () => vscode.WorkspaceConfiguration
): void {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    log.appendLine('[Faah!] No workspace folder — skipping git ref watcher');
    return;
  }

  const gitDir = path.join(folders[0].uri.fsPath, '.git');
  if (!fs.existsSync(gitDir)) {
    log.appendLine('[Faah!] No .git directory — skipping git ref watcher');
    return;
  }

  log.appendLine(`[Faah!] Watching git refs in ${gitDir}`);

  let lastFetchHead = getFileMtime(path.join(gitDir, 'FETCH_HEAD'));
  let lastRemoteRefs = getRemoteRefsSummary(gitDir);

  // Poll every 3 seconds (filesystem watchers are unreliable for .git internals)
  const interval = setInterval(() => {
    const currentFetchHead = getFileMtime(path.join(gitDir, 'FETCH_HEAD'));
    const currentRemoteRefs = getRemoteRefsSummary(gitDir);

    // Detect pull/fetch: FETCH_HEAD gets updated
    if (currentFetchHead > lastFetchHead) {
      log.appendLine(`[Faah!] FETCH_HEAD changed (${lastFetchHead} -> ${currentFetchHead})`);
      lastFetchHead = currentFetchHead;

      if (config().get<boolean>('playSoundOnPull', true) && canPlayPull()) {
        log.appendLine('[Faah!] Playing anime-ahh for pull/fetch');
        playAnimeAhh();
        vscode.window.setStatusBarMessage(
          '$(cloud-download) Pulled! *anime-ahh*',
          5000
        );
      }
    }

    // Detect push: remote tracking refs change
    if (currentRemoteRefs !== lastRemoteRefs) {
      // Only trigger if FETCH_HEAD didn't also change (to avoid double-firing on pull)
      if (currentFetchHead === lastFetchHead) {
        log.appendLine('[Faah!] Remote refs changed — likely a push');

        if (config().get<boolean>('playSoundOnPush', true) && canPlayPush()) {
          log.appendLine('[Faah!] Playing snoopdog for push');
          playSnoopdog();
          vscode.window.setStatusBarMessage(
            '$(cloud-upload) Pushed! *drop it like it\'s hot*',
            5000
          );
        }
      }
      lastRemoteRefs = currentRemoteRefs;
    }
  }, 3000);

  context.subscriptions.push({
    dispose: () => clearInterval(interval),
  });
}

function getFileMtime(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

function getRemoteRefsSummary(gitDir: string): string {
  const refsDir = path.join(gitDir, 'refs', 'remotes');
  try {
    if (!fs.existsSync(refsDir)) {
      return '';
    }
    const result: string[] = [];
    collectRefMtimes(refsDir, result);
    return result.join('|');
  } catch {
    return '';
  }
}

function collectRefMtimes(dir: string, result: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectRefMtimes(full, result);
    } else {
      try {
        result.push(`${full}:${fs.statSync(full).mtimeMs}`);
      } catch {
        // ignore
      }
    }
  }
}
