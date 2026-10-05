#!/usr/bin/env bash
# Vercel "Ignored Build Step" for one topic.
#
# Usage (from a topic's vercel.json): bash ../scripts/vercel-ignore.sh <package>
#
# Vercel skips the build when this exits 0 and builds when it exits non-zero.
# It builds only when <package> or something it depends on changed since the
# last successful deployment of this Vercel project, so a change to one topic
# does not redeploy the others.

set -uo pipefail

package=${1:?usage: vercel-ignore.sh <package>}
base=${VERCEL_GIT_PREVIOUS_SHA:-}

if [ -z "$base" ]; then
  echo "No previous deployment to compare with; building $package."
  exit 1
fi

# The build image has no installed dependencies yet, so fetch the same turbo
# version as the root package.json. Exit codes: 0 nothing affected, 1 affected,
# 2 error. A base commit missing from Vercel's shallow clone counts as affected.
npx --yes turbo@2.11.7 query affected --packages "$package" --base "$base" --head HEAD --exit-code
status=$?

case $status in
  0) echo "$package is unchanged since $base; skipping the build." ;;
  1) echo "$package changed since $base; building." ;;
  *) echo "Could not work out what changed (exit $status); building $package." ;;
esac
exit $status
