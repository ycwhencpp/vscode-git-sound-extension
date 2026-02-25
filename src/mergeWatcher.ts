import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { playClap } from './player';

/**
 * Watches for git merge events via multiple strategies:
 * 1. Filesystem watcher on .git/MERGE_HEAD (appears during merge, removed on complete)
 * 2. Task execution monitoring for merge tasks
 * 3. Terminal shell integration for git merge commands
 */
export function activateMergeWatcher(context: vscode.ExtensionContext): void {
  const config = () => vscode.workspace.getConfiguration('faah');

  watchMergeHead(context, config);
  watchGitCommands(context, config);
}

function getGitDir(): string | null {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return null;
  }
  const gitDir = path.join(folders[0].uri.fsPath, '.git');
  return fs.existsSync(gitDir) ? gitDir : null;
}

/**
 * .git/MERGE_HEAD exists while a merge is in progress.
 * When it disappears, the merge completed (or was aborted).
 * We verify by checking whether the last commit has multiple parents.
 */
function watchMergeHead(
  context: vscode.ExtensionContext,
  config: () => vscode.WorkspaceConfiguration
): void {
  const gitDir = getGitDir();
  if (!gitDir) {
    return;
  }

  let mergeInProgress = fs.existsSync(path.join(gitDir, 'MERGE_HEAD'));

  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(gitDir, '{MERGE_HEAD,MERGE_MSG}')
  );

  watcher.onDidCreate(() => {
    mergeInProgress = true;
  });

  watcher.onDidDelete(() => {
    if (!mergeInProgress) {
      return;
    }
    mergeInProgress = false;

    if (!config().get<boolean>('playSoundOnMerge', true)) {
      return;
    }

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      return;
    }

    cp.exec(
      'git log -1 --format="%P"',
      { cwd: workspaceRoot },
      (err, stdout) => {
        if (err) {
          return;
        }
        const parents = stdout.trim().split(/\s+/);
        if (parents.length >= 2) {
          celebrateMerge();
        }
      }
    );
  });

  context.subscriptions.push(watcher);
}

function watchGitCommands(
  context: vscode.ExtensionContext,
  config: () => vscode.WorkspaceConfiguration
): void {
  context.subscriptions.push(
    vscode.tasks.onDidEndTaskProcess((e) => {
      if (!config().get<boolean>('playSoundOnMerge', true)) {
        return;
      }

      const taskName = e.execution.task.name.toLowerCase();
      if (taskName.includes('merge') && e.exitCode === 0) {
        celebrateMerge();
      }
    })
  );

  if (!vscode.window.onDidEndTerminalShellExecution) {
    return;
  }

  context.subscriptions.push(
    vscode.window.onDidEndTerminalShellExecution((e) => {
      if (!config().get<boolean>('playSoundOnMerge', true)) {
        return;
      }

      if (e.exitCode !== 0) {
        return;
      }

      const cmd = e.execution.commandLine.value.trim();
      if (/^git\s+merge\b/i.test(cmd) || /^git\s+pull\b/i.test(cmd)) {
        celebrateMerge();
      }
    })
  );
}

function celebrateMerge(): void {
  playClap();
  vscode.window.setStatusBarMessage(
    '$(git-merge) Merge complete! *clap clap clap*',
    5000
  );
}
