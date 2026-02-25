# Faah! — Sound Effects for Devs

> Because coding deserves a soundtrack.

**FAAAAH!** plays a legendary dramatic fail sound whenever your tests fail.
**CLAP CLAP CLAP** rewards you with applause whenever you complete a git merge.

## Features

- **Test Failure Detection** — Listens to VS Code's Test API, task runners (Jest, Mocha, Vitest, pytest, etc.), and terminal output. When tests fail, you hear the unmistakable *FAAAAH*.
- **Merge Detection** — Watches for `git merge` completions via `.git/MERGE_HEAD` lifecycle, task events, and terminal commands. Successful merges trigger a satisfying round of applause.
- **Cross-platform** — Works on macOS (`afplay`), Linux (`aplay`/`paplay`), and Windows (PowerShell `SoundPlayer`).
- **Configurable** — Toggle sounds on/off, adjust volume, or disable individual triggers.

## Commands

| Command | Description |
|---------|-------------|
| `Faah! Play fail sound` | Manually play the FAAAAH sound |
| `Faah! Play clap sound` | Manually play the clap sound |
| `Faah! Toggle sounds on/off` | Enable or disable all sounds |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `faah.enabled` | `true` | Master toggle for all sounds |
| `faah.volume` | `0.7` | Volume level (0.0 – 1.0) |
| `faah.playSoundOnTestFail` | `true` | Play FAAAAH on test failures |
| `faah.playSoundOnMerge` | `true` | Play clap on merge completion |

## Installation

### From source

```bash
git clone https://github.com/your-username/vscode-faah.git
cd vscode-faah
npm install
npm run compile
```

Then press `F5` in VS Code to launch the Extension Development Host.

### Package as VSIX

```bash
npm install -g @vscode/vsce
vsce package
code --install-extension vscode-faah-0.1.0.vsix
```

## How It Works

### Test Failure Detection

1. **VS Code Test API** — Hooks into `vscode.tests.onDidChangeTestResults` to catch failures from any test provider (built-in or extension-based).
2. **Task Execution** — Monitors `onDidEndTaskProcess` for tasks named after popular test frameworks (jest, mocha, vitest, pytest, etc.) with non-zero exit codes.
3. **Terminal Shell Integration** — Uses `onDidEndTerminalShellExecution` to catch test commands run directly in the terminal.

### Merge Detection

1. **MERGE_HEAD Watcher** — Watches `.git/MERGE_HEAD` — this file is created when a merge starts and deleted when it completes. On deletion, verifies the last commit has 2+ parents (is a merge commit, not an abort).
2. **Task/Terminal Monitoring** — Catches `git merge` commands executed via tasks or terminal.

## License

MIT
