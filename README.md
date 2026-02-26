# Faah! — Sound Effects for Devs

> Because coding deserves a soundtrack.

Your IDE now reacts to your git life with sound effects:

- **FAAAAH!** when your tests fail
- **Celebration** when you complete a git merge
- **Snoop Dogg** when you push changes
- **Anime Ahh** when you pull changes

## Features

- **Test Failure Detection** — Listens to task runners (Jest, Mocha, Vitest, pytest, cargo test, and more), terminal commands, and test-file diagnostics. When tests fail, you hear the unmistakable *FAAAAH*.
- **Merge Detection** — Watches `.git/MERGE_HEAD` lifecycle and terminal commands. Successful merges trigger a celebration.
- **Push Detection** — Detects `git push` via terminal shell integration and `.git/refs` polling. Plays the Snoop Dogg sound.
- **Pull Detection** — Detects `git pull` via terminal shell integration and `.git/FETCH_HEAD` polling. Plays the Anime Ahh sound.
- **Cross-platform** — Works on macOS (`afplay`), Linux (`aplay`/`paplay`), and Windows (PowerShell `SoundPlayer`).
- **Configurable** — Toggle sounds on/off, adjust volume, or disable individual triggers.

## Commands

| Command | Description |
|---------|-------------|
| `Faah! Play fail sound` | Play the FAAAAH sound |
| `Faah! Play clap sound` | Play the merge celebration sound |
| `Faah! Play push sound (Snoop Dogg)` | Play the Snoop Dogg push sound |
| `Faah! Play pull sound (Anime Ahh)` | Play the Anime Ahh pull sound |
| `Faah! Toggle sounds on/off` | Enable or disable all sounds |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `faah.enabled` | `true` | Master toggle for all sounds |
| `faah.volume` | `0.7` | Volume level (0.0 - 1.0, macOS) |
| `faah.playSoundOnTestFail` | `true` | Play FAAAAH on test failures |
| `faah.playSoundOnMerge` | `true` | Play celebration on merge completion |
| `faah.playSoundOnPush` | `true` | Play Snoop Dogg on git push |
| `faah.playSoundOnPull` | `true` | Play Anime Ahh on git pull |

## Installation

### From the Marketplace

Search for **"Faah"** in the Extensions panel (`Ctrl+Shift+X` / `Cmd+Shift+X`) and click Install.

### From source

```bash
git clone https://github.com/ycwhencpp/vscode-git-sound-extension.git
cd vscode-git-sound-extension
npm install
npm run compile
```

Then press `F5` in VS Code to launch the Extension Development Host.

## How It Works

### Test Failure Detection

1. **Task Execution** — Monitors `onDidEndTaskProcess` for tasks named after popular test frameworks (jest, mocha, vitest, pytest, etc.) with non-zero exit codes.
2. **Terminal Shell Integration** — Uses `onDidEndTerminalShellExecution` to catch test commands run directly in the terminal.
3. **Diagnostics** — Watches for Error-severity diagnostics in test files (`.test.*`, `.spec.*`).

### Git Event Detection

1. **MERGE_HEAD Watcher** — Watches `.git/MERGE_HEAD` to detect merge start/completion. Verifies the last commit has 2+ parents (is a merge commit, not an abort).
2. **FETCH_HEAD Polling** — Polls `.git/FETCH_HEAD` for mtime changes to reliably detect `git pull` / `git fetch`.
3. **Remote Refs Polling** — Polls `.git/refs/remotes/` for changes to detect `git push`.
4. **Terminal Integration** — Catches `git push`, `git pull`, and `git merge` commands via shell integration when available.
5. **Cooldown** — 10-second deduplication window prevents sounds from firing twice for the same event.

## License

[MIT](LICENSE)
