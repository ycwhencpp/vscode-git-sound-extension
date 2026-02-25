import * as vscode from 'vscode';
import { setExtensionPath, playFaah, playClap, playSnoopdog, playAnimeAhh } from './player';
import { activateTestWatcher } from './testWatcher';
import { activateMergeWatcher } from './mergeWatcher';
import { activateGitPushPullWatcher } from './gitPushPullWatcher';

export function activate(context: vscode.ExtensionContext): void {
  setExtensionPath(context.extensionPath);

  // Manual trigger commands (for testing & fun)
  context.subscriptions.push(
    vscode.commands.registerCommand('faah.playFaah', () => {
      playFaah();
      vscode.window.setStatusBarMessage('$(error) FAAAAH!', 3000);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('faah.playClap', () => {
      playClap();
      vscode.window.setStatusBarMessage('$(git-merge) *clap clap clap*', 3000);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('faah.playSnoopdog', () => {
      playSnoopdog();
      vscode.window.setStatusBarMessage('$(cloud-upload) Snoop Dogg!', 3000);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('faah.playAnimeAhh', () => {
      playAnimeAhh();
      vscode.window.setStatusBarMessage('$(cloud-download) Anime Ahh!', 3000);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('faah.toggleEnabled', () => {
      const config = vscode.workspace.getConfiguration('faah');
      const current = config.get<boolean>('enabled', true);
      config.update('enabled', !current, vscode.ConfigurationTarget.Global);
      const state = !current ? 'ON' : 'OFF';
      vscode.window.showInformationMessage(`Faah! sounds are now ${state}`);
    })
  );

  // Status bar item
  const statusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusItem.text = '$(unmute) Faah!';
  statusItem.tooltip = 'Click to toggle Faah! sounds';
  statusItem.command = 'faah.toggleEnabled';
  statusItem.show();
  context.subscriptions.push(statusItem);

  // Update status bar when config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('faah.enabled')) {
        const enabled = vscode.workspace
          .getConfiguration('faah')
          .get<boolean>('enabled', true);
        statusItem.text = enabled ? '$(unmute) Faah!' : '$(mute) Faah!';
      }
    })
  );

  // Activate watchers
  activateTestWatcher(context);
  activateMergeWatcher(context);
  activateGitPushPullWatcher(context);

  console.log('Faah! extension activated — may your tests pass and merges be smooth.');
}

export function deactivate(): void {
  // Nothing to clean up — child processes are detached
}
