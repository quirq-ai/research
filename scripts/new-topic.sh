#!/usr/bin/env bash
# Create a new research topic folder from _template/.
#
# Usage: scripts/new-topic.sh <topic-slug>
#
# Copies _template/ to <topic-slug>/ at the repo root, then replaces
# {{TOPIC}} with the slug and {{DATE}} with today's date (YYYY-MM-DD) in every
# Markdown and JSON file. Refuses to overwrite an existing path.

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/new-topic.sh <topic-slug>

Creates <topic-slug>/ at the repo root from _template/ and fills in the topic
name and today's date.

The slug uses lowercase letters, digits and single hyphens, for example:
  claude, agent-evals, rag-benchmarks
EOF
}

if [ "$#" -ne 1 ]; then
  usage >&2
  exit 2
fi

case "$1" in
  -h | --help)
    usage
    exit 0
    ;;
esac

slug=$1

if ! [[ $slug =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "error: invalid topic slug '$slug'" >&2
  echo "       use lowercase letters, digits and single hyphens, e.g. agent-evals" >&2
  exit 1
fi

case "$slug" in
  dist | node_modules | packages | scripts)
    echo "error: '$slug' is a reserved name; pick another slug" >&2
    exit 1
    ;;
esac

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
template="$repo_root/_template"
dest="$repo_root/$slug"

if [ ! -d "$template" ]; then
  echo "error: template folder not found: $template" >&2
  exit 1
fi

if [ -e "$dest" ] || [ -L "$dest" ]; then
  echo "error: '$slug/' already exists; refusing to overwrite" >&2
  exit 1
fi

# mkdir without -p fails if the path appeared since the check above, so an
# existing folder is never written into.
mkdir "$dest"

created=0
cleanup() {
  if [ "$created" -ne 1 ]; then
    rm -rf "$dest"
  fi
}
trap cleanup EXIT

cp -R "$template/." "$dest/"

today=$(date +%Y-%m-%d)

# Portable in-place substitution (works with GNU and BSD sed).
find "$dest" -type f \( -name '*.md' -o -name '*.json' \) -print | while IFS= read -r file; do
  sed -e "s/[{][{]TOPIC[}][}]/$slug/g" \
      -e "s/[{][{]DATE[}][}]/$today/g" \
      "$file" > "$file.tmp"
  mv "$file.tmp" "$file"
done

created=1

echo "Created $slug/ from _template/."
echo
echo "Next steps:"
echo "  1. Fill in $slug/GOAL.md: purpose, research action, requested outputs."
echo "  2. Fill in $slug/AGENTS.md: what to research and how to verify it."
echo "  3. Run npm run topics to add $slug to the Topics table in README.md."
echo "  4. Run npm install at the repo root so the new workspace is linked."
echo "  5. Run npm run check before you commit."
echo
echo "See AGENTS.md for the full workflow."
