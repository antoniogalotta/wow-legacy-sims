#!/bin/bash
# Exports/imports the simulator's saved settings (localStorage) as JSON.
#   localstorage.sh dump <file.json>     reads a copy of the profile, the real one is not touched
#   localstorage.sh restore <file.json>  writes the keys into the real profile (app must be closed)
set -euo pipefail
source "$(dirname "$0")/common.sh"

[ $# -eq 2 ] || { echo "usage: $0 dump|restore <file.json>" >&2; exit 2; }
require_app_closed

# The electron package only downloads its binary on first use.
if [ ! -x "$REPO_DIR/node_modules/electron/dist/electron" ]; then
	node "$REPO_DIR/node_modules/electron/install.js"
fi

file="$(realpath -m "$2")"
# ELECTRON_RUN_AS_NODE (set e.g. in VS Code terminals) would make electron behave as plain node.
env -u ELECTRON_RUN_AS_NODE "$REPO_DIR/node_modules/electron/dist/electron" "$REPO_DIR/scripts/linux/localstorage.js" "$1" "$file" "$CONFIG_DIR"
