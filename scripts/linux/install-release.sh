#!/bin/bash
# Builds the AppImage, archives it in archive/releases/ and points the GNOME launcher at it.
#   --skip-build  only (re)install the launcher for archive/current.AppImage
set -euo pipefail
source "$(dirname "$0")/common.sh"

BUILD_IMAGE="wotlk-sims-build"
DESKTOP_FILE="$HOME/.local/share/applications/wowsim-wotlk.desktop"
ICON_FILE="$HOME/.local/share/icons/hicolor/512x512/apps/wowsim-wotlk.png"

cd "$REPO_DIR"
init_archive

if [ "${1:-}" != "--skip-build" ]; then
	require_app_closed
	backup_config

	# Go and protoc only live in the devcontainer image, so the server binary is built there.
	if ! docker image inspect "$BUILD_IMAGE" >/dev/null 2>&1; then
		docker build -t "$BUILD_IMAGE" -f .devcontainer/Dockerfile .devcontainer
	fi
	mkdir -p "$ARCHIVE_DIR/.cache/go"
	docker run --rm --user "$(id -u):$(id -g)" \
		-v "$REPO_DIR":/wotlk -w /wotlk \
		-v "$ARCHIVE_DIR/.cache/go":/gocache \
		-e GOCACHE=/gocache/build -e GOMODCACHE=/gocache/mod -e GOFLAGS=-buildvcs=false \
		"$BUILD_IMAGE" make electron-server-linux

	# Same as `make electron-linux`, but only the AppImage and with the host's node.
	rm -f release/electron/*.AppImage
	npx electron-builder --linux AppImage --x64

	version="$(date +%Y%m%d)-$(git rev-parse --short HEAD)"
	git diff --quiet HEAD || version="$version-dirty"
	release="WoW-WotLK-Simulator-$version.AppImage"
	cp release/electron/*.AppImage "$ARCHIVE_DIR/releases/$release"
	chmod +x "$ARCHIVE_DIR/releases/$release"
	ln -sfn "releases/$release" "$ARCHIVE_DIR/current.AppImage"
	echo "Archived archive/releases/$release"
fi

[ -e "$ARCHIVE_DIR/current.AppImage" ] || { echo "archive/current.AppImage does not exist, build first." >&2; exit 1; }

mkdir -p "$(dirname "$DESKTOP_FILE")" "$(dirname "$ICON_FILE")"
cp assets/favicon_io/android-chrome-512x512.png "$ICON_FILE"
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=WoW WotLK Simulator
Comment=WotLK 3.3.5a DPS simulator
Exec="$ARCHIVE_DIR/current.AppImage" %U
Icon=wowsim-wotlk
Terminal=false
Categories=Game;
StartupWMClass=wotlk
EOF
update-desktop-database "$(dirname "$DESKTOP_FILE")" 2>/dev/null || true
gtk-update-icon-cache -q "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
echo "Launcher: $DESKTOP_FILE -> $(readlink "$ARCHIVE_DIR/current.AppImage")"
