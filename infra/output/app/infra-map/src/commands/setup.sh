( set -eu; unset CDPATH; D="$HOME/depot"; P="${QQ_PYTHON:-python3}"
  command -v git >/dev/null || { echo "qq setup: install git first, then paste this again."; exit 1; }
  "$P" -c 'import sys, venv; sys.exit(sys.version_info < (3, 11, 4))' 2>/dev/null || { echo "qq setup: qq needs Python 3.11.4 or newer with venv ($P is too old or missing). On macOS: brew install python@3.12, add  export QQ_PYTHON=python3.12  to ~/.zshrc, open a new terminal and paste this again."; exit 1; }
  "$P" -m ensurepip --version >/dev/null 2>&1 || { echo "qq setup: $P cannot make virtual environments. On Debian or Ubuntu: sudo apt install python3-venv, then paste this again."; exit 1; }
  if [ -d "$D/.git" ]; then
    case "$(git -C "$D" remote get-url origin)" in *quirq-ai/depot*) ;; *) echo "qq setup: $D is some other repo. Move it, then paste this again."; exit 1;; esac
    git -C "$D" pull -q --ff-only || { echo "qq setup: could not fast-forward $D (offline, local changes or another branch). Fix that, then paste this again."; exit 1; }
  elif [ -e "$D" ]; then echo "qq setup: $D exists and is not a git checkout. Move it, then paste this again."; exit 1
  else git clone -q https://github.com/quirq-ai/depot "$D"; fi
  "$D/bin/qq" --version
  { command -v gh >/dev/null && gh auth status >/dev/null 2>&1; } || echo "qq setup: to open PRs, install gh (https://cli.github.com) and run: gh auth login"
  case ":$PATH:" in *":$D/bin:"*) echo "qq setup: done.";; *) echo "qq setup: done. Add this line to ~/.zshrc (macOS) or ~/.bashrc (Linux), then open a new terminal:  export PATH=\"\$HOME/depot/bin:\$PATH\"";; esac )
