#!/bin/bash
# Updates the personal branch from upstream/all and installs a new release.
# Local commits already merged upstream are dropped by the rebase.
set -euo pipefail
source "$(dirname "$0")/common.sh"

cd "$REPO_DIR"
require_app_closed
if ! git diff --quiet HEAD; then
	echo "There are uncommitted changes, commit or stash them first." >&2
	exit 1
fi

"$REPO_DIR/scripts/linux/backup-config.sh"

git fetch upstream
before="$(git rev-parse HEAD)"
git rebase upstream/all
if [ "$(git rev-parse HEAD)" = "$before" ] && [ -e "$ARCHIVE_DIR/current.AppImage" ] && [ "${1:-}" != "--force" ]; then
	echo "Already up to date with upstream/all (use --force to rebuild anyway)."
	exit 0
fi

npm install
"$REPO_DIR/scripts/linux/install-release.sh"
