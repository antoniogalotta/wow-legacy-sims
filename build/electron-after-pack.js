"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Linux Electron packaging fixes:
 * - Remove chrome-sandbox so Chromium uses user-namespace sandbox (SUID cannot work on AppImage FUSE mounts).
 * - Replace the Electron binary with a launcher that passes --disable-setuid-sandbox and, for AppImages
 *   where unprivileged user namespaces are restricted (Ubuntu 24+), --no-sandbox: an AppImage runs from
 *   a mount point that changes on every launch, so no AppArmor profile can allow them for it.
 * - The deb, installed in a fixed path, gets an AppArmor profile allowing user namespaces instead.
 */
module.exports = async function afterPack(context) {
	if (context.electronPlatformName !== "linux") {
		return;
	}

	const appOutDir = context.appOutDir;
	const { executableName, appInfo } = context.packager;
	const electronBinary = path.join(appOutDir, executableName);
	const realBinary = `${electronBinary}.bin`;
	const resourcesDir = path.join(appOutDir, "resources");
	const debInstallDir = `/opt/${appInfo.sanitizedProductName}`;

	const chromeSandbox = path.join(appOutDir, "chrome-sandbox");
	if (fs.existsSync(chromeSandbox)) {
		fs.unlinkSync(chromeSandbox);
	}

	fs.mkdirSync(resourcesDir, { recursive: true });

	const debAppArmorProfile = `abi <abi/4.0>,
include <tunables/global>

profile ${executableName} "${debInstallDir}/${executableName}.bin" flags=(unconfined) {
  userns,

  include if exists <local/${executableName}>
}
`;
	const debProfilePath = path.join(__dirname, "apparmor-profile");
	fs.writeFileSync(debProfilePath, debAppArmorProfile);
	fs.writeFileSync(path.join(resourcesDir, "apparmor-profile"), debAppArmorProfile);

	if (!fs.existsSync(electronBinary)) {
		throw new Error(`Electron binary not found: ${electronBinary}`);
	}
	fs.renameSync(electronBinary, realBinary);

	const launcher = `#!/bin/bash
set -euo pipefail

REAL="$(dirname "$(readlink -f "$0")")/${executableName}.bin"
ARGS=(--disable-setuid-sandbox)

# unshare can succeed even when AppArmor restricts user namespaces, so check the sysctl first.
if [ -n "\${APPIMAGE:-}" ]; then
  if [ "$(cat /proc/sys/kernel/apparmor_restrict_unprivileged_userns 2>/dev/null)" = "1" ] || ! unshare -Ur true 2>/dev/null; then
    ARGS+=(--no-sandbox)
  fi
fi

exec "$REAL" "\${ARGS[@]}" "$@"
`;

	fs.writeFileSync(electronBinary, launcher, { mode: 0o755 });
};
