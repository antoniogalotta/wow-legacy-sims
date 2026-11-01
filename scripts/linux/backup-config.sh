#!/bin/bash
# Backs up the saved settings to archive/backups/, both as a profile tarball and as readable JSON.
set -euo pipefail
source "$(dirname "$0")/common.sh"

require_app_closed
backup_config
"$REPO_DIR/scripts/linux/localstorage.sh" dump "$ARCHIVE_DIR/backups/localstorage-$(date +%Y%m%d-%H%M%S).json"
