import * as vscode from 'vscode';
import { playFaah } from './player';

/**
 * Watches for test failures via multiple strategies:
 * 1. Task execution (npm test, jest, pytest, etc.)
 * 2. Terminal output scanning via shell integration
 * 3. Diagnostic change monitoring (test extensions often report via diagnostics)
 */
export function activateTestWatcher(context: vscode.ExtensionContext): void {
  const config = () => vscode.workspace.getConfiguration('faah');

  watchTaskExecution(context, config);
  watchTerminalOutput(context, config);
  watchDiagnostics(context, config);
}

const TEST_TASK_NAMES = ['test', 'jest', 'mocha', 'pytest', 'vitest', 'karma', 'ava', 'cargo test'];

function watchTaskExecution(
  context: vscode.ExtensionContext,
  config: () => vscode.WorkspaceConfiguration
): void {
  context.subscriptions.push(
    vscode.tasks.onDidEndTaskProcess((e) => {
      if (!config().get<boolean>('playSoundOnTestFail', true)) {
        return;
      }

      const taskName = e.execution.task.name.toLowerCase();
      const taskSource = (e.execution.task.source ?? '').toLowerCase();
      const isTestTask = TEST_TASK_NAMES.some(
        (name) => taskName.includes(name) || taskSource.includes(name)
      );

      if (isTestTask && e.exitCode !== undefined && e.exitCode !== 0) {
        playFaah();
        vscode.window.setStatusBarMessage('$(error) FAAAAH! Tests failed!', 4000);
      }
    })
  );
}

function watchTerminalOutput(
  context: vscode.ExtensionContext,
  config: () => vscode.WorkspaceConfiguration
): void {
  if (!vscode.window.onDidEndTerminalShellExecution) {
    return;
  }

  context.subscriptions.push(
    vscode.window.onDidEndTerminalShellExecution((e) => {
      if (!config().get<boolean>('playSoundOnTestFail', true)) {
        return;
      }

      if (e.exitCode === undefined || e.exitCode === 0) {
        return;
      }

      const cmd = e.execution.commandLine.value.trim().toLowerCase();
      const isTestCommand = TEST_TASK_NAMES.some((t) => cmd.includes(t))
        || /\b(npm|yarn|pnpm|bun)\s+(run\s+)?test\b/.test(cmd)
        || /\bgo\s+test\b/.test(cmd)
        || /\bcargo\s+test\b/.test(cmd)
        || /\bpython\s+-m\s+(pytest|unittest)\b/.test(cmd);

      if (isTestCommand) {
        playFaah();
        vscode.window.setStatusBarMessage('$(error) FAAAAH! Tests failed!', 4000);
      }
    })
  );
}

/**
 * Some test runners produce diagnostics with Error severity.
 * We debounce to avoid spamming on rapid diagnostic updates.
 */
function watchDiagnostics(
  context: vscode.ExtensionContext,
  config: () => vscode.WorkspaceConfiguration
): void {
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  context.subscriptions.push(
    vscode.languages.onDidChangeDiagnostics((e) => {
      if (!config().get<boolean>('playSoundOnTestFail', true)) {
        return;
      }

      const testFilePatterns = [/\.test\./, /\.spec\./, /_test\./, /test_/];

      for (const uri of e.uris) {
        const fileName = uri.fsPath.toLowerCase();
        const isTestFile = testFilePatterns.some((p) => p.test(fileName));

        if (isTestFile) {
          const diagnostics = vscode.languages.getDiagnostics(uri);
          const hasErrors = diagnostics.some(
            (d) => d.severity === vscode.DiagnosticSeverity.Error
          );

          if (hasErrors) {
            if (debounceTimer) {
              clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(() => {
              playFaah();
              vscode.window.setStatusBarMessage('$(error) FAAAAH! Test errors detected!', 4000);
            }, 2000);
            return;
          }
        }
      }
    })
  );
}
