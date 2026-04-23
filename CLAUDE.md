# ProjetoClaudeCode

## GitHub Integration

This project is integrated with GitHub at: https://github.com/joaofelipe28/ProjetoClaudeCode

### Auto-sync to GitHub

Every time a Claude Code session ends, any changes are automatically committed and pushed to GitHub via a Stop hook configured in `.claude/settings.json`.

The hook runs:
```bash
export PATH="$HOME/.local/bin:$PATH" && \
cd /Users/joaofelipescheidt/ProjetoClaudeCode && \
git add -A && \
git diff --cached --quiet || \
  (git commit -m "Auto-update: $(date '+%Y-%m-%d %H:%M:%S')" && \
   GIT_CONFIG_NOSYSTEM=1 git push origin main)
```

> Note: `GIT_CONFIG_NOSYSTEM=1` is required to bypass a macOS system git config that interferes with DNS resolution in the Claude Code sandbox.

### GitHub CLI

`gh` CLI is installed at `~/.local/bin/gh` and authenticated as `joaofelipe28`.

To list your repositories:
```bash
gh repo list
```

To check sync status:
```bash
git status && git log --oneline -5
```

### Manual push

If you need to push manually:
```bash
export PATH="$HOME/.local/bin:$PATH"
git add -A && git commit -m "mensagem" && GIT_CONFIG_NOSYSTEM=1 git push origin main
```
