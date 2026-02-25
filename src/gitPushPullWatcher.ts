import * as vscode from 'vscode';
import { playSnoopdog, playAnimeAhh } from './player';

/**
 * Watches for git push and git pull commands via:
 * 1. Terminal shell integration (catches commands typed in terminal)
 * 2. Task execution (catches tasks named push/pull)
 */
export function activateGitPushPullWatcher(context: vscode.ExtensionContext): void {
  const config = () => vscode.workspace.getConfiguration('faah');

  watchTerminalCommands(context, config);
  watchTasks(context, config);
}

function watchTerminalCommands(
  context: vscode.ExtensionContext,
  config: () => vscode.WorkspaceConfiguration
): void {
  if (!vscode.window.onDidEndTerminalShellExecution) {
    return;
  }

  context.subscriptions.push(
    vscode.window.onDidEndTerminalShellExecution((e) => {
      if (e.exitCode !== 0) {
        return;
      }

      const cmd = e.execution.commandLine.value.trim();

      if (/^git\s+push\b/i.test(cmd)) {
        if (config().get<boolean>('playSoundOnPush', true)) {
          playSnoopdog();
          vscode.window.setStatusBarMessage(
            '$(cloud-upload) Pushed! *drop it like it\'s hot*',
            5000
          );
        }
      }

      if (/^git\s+pull\b/i.test(cmd)) {
        if (config().get<boolean>('playSoundOnPull', true)) {
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
  context.subscriptions.push(
    vscode.tasks.onDidEndTaskProcess((e) => {
      if (e.exitCode !== 0) {
        return;
      }

      const taskName = e.execution.task.name.toLowerCase();

      if (taskName.includes('push')) {
        if (config().get<boolean>('playSoundOnPush', true)) {
          playSnoopdog();
          vscode.window.setStatusBarMessage(
            '$(cloud-upload) Pushed! *drop it like it\'s hot*',
            5000
          );
        }
      }

      if (taskName.includes('pull') && !taskName.includes('pull request')) {
        if (config().get<boolean>('playSoundOnPull', true)) {
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
