// Electron script used by localstorage.sh: localStorage is bound to the origin the app uses
// (http://localhost:4445, see electron-main.js), so serve a blank page there and read/write it.
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const ORIGIN_PORT = 4445;
const [mode, file, configDir] = process.argv.slice(-3);

let tmpDir;
if (mode === 'dump') {
    // Work on a copy so the real profile is never modified by a dump.
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wotlk-localstorage-'));
    for (const dir of ['Local Storage', 'Session Storage']) {
        const src = path.join(configDir, dir);
        if (fs.existsSync(src)) {
            fs.cpSync(src, path.join(tmpDir, dir), { recursive: true });
        }
    }
    app.setPath('userData', tmpDir);
} else if (mode === 'restore') {
    app.setPath('userData', configDir);
} else {
    console.error(`unknown mode: ${mode}`);
    process.exit(2);
}

// A graceful quit (not app.exit) lets Chromium flush localStorage to disk.
function finish(code) {
    process.exitCode = code;
    app.quit();
}

app.on('window-all-closed', () => {});
app.on('quit', () => {
    if (tmpDir) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
});

app.whenReady().then(async () => {
    const server = http.createServer((req, res) => res.end('<!doctype html><title>localStorage</title>'));
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(ORIGIN_PORT, 'localhost', resolve);
    });

    const win = new BrowserWindow({ show: false });
    await win.loadURL(`http://localhost:${ORIGIN_PORT}/`);

    if (mode === 'dump') {
        const json = await win.webContents.executeJavaScript('JSON.stringify(Object.assign({}, localStorage), null, 2)');
        fs.writeFileSync(file, json + '\n');
        console.log(`${Object.keys(JSON.parse(json)).length} keys written to ${file}`);
    } else {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        await win.webContents.executeJavaScript(
            `(() => { const d = ${JSON.stringify(data)}; for (const k in d) localStorage.setItem(k, d[k]); })()`,
        );
        console.log(`${Object.keys(data).length} keys restored from ${file}`);
    }

    win.destroy();
    server.close();
    finish(0);
}).catch((err) => {
    console.error(err);
    finish(1);
});
