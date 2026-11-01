# Shared helpers for the scripts in scripts/linux/ (sourced, not executed).

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ARCHIVE_DIR="$REPO_DIR/archive"
CONFIG_DIR="$HOME/.config/wotlk"

# archive/ ignores itself, so nothing in it is ever committed.
init_archive() {
	mkdir -p "$ARCHIVE_DIR/backups" "$ARCHIVE_DIR/releases"
	[ -f "$ARCHIVE_DIR/.gitignore" ] || printf '*\n' > "$ARCHIVE_DIR/.gitignore"
}

app_running() {
	pgrep -f -- "--user-data-dir=$CONFIG_DIR( |$)" >/dev/null
}

require_app_closed() {
	if app_running; then
		echo "The simulator is running: close it first, so the saved settings are not copied mid-write." >&2
		exit 1
	fi
}

# Backs up the Electron profile holding the saved settings (localStorage), without the caches.
backup_config() {
	init_archive
	if [ ! -d "$CONFIG_DIR" ]; then
		echo "No settings to back up ($CONFIG_DIR does not exist)."
		return 0
	fi
	local out="$ARCHIVE_DIR/backups/config-wotlk-$(date +%Y%m%d-%H%M%S).tar.gz"
	tar czf "$out" -C "$(dirname "$CONFIG_DIR")" \
		--exclude='Cache' --exclude='Code Cache' --exclude='GPUCache' \
		--exclude='DawnGraphiteCache' --exclude='DawnWebGPUCache' \
		"$(basename "$CONFIG_DIR")"
	echo "Settings backed up to $out"
}
