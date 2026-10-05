( set -eu; unset CDPATH; R=__REPO__; W="$HOME/quirq"; mkdir -p "$W"
  if [ -d "$W/$R/.git" ]; then cd "$W/$R" && "$HOME/depot/bin/qq" sync
  else cd "$W" && "$HOME/depot/bin/qq" fetch "https://github.com/quirq-ai/$R"; fi
  echo "qq: $R is ready in $W/$R" )
