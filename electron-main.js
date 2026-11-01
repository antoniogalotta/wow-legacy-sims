const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let goProcess;

// Saved settings live in localStorage, which is scoped to the page origin (including the port),
// so the port must stay the same between launches or the settings would appear to be lost.
const PORT = 4445;

function isPortFree(port) {
    return new Promise((resolve, reject) => {
        const server = http.createServer();
        server.listen(port, 'localhost', () => {
            server.close(() => resolve(true));
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            } else {
                reject(err);
            }
        });
    });
}

async function startGoServer(port) {
    const binaryName = process.platform === 'win32' ? 'wowsimwotlk.exe' : 'wowsimwotlk';
    // Packaged: the server built by `make electron-<platform>` is in resources/server/.
    // From source (npm run electron:dev): the server built by `make wowsimwotlk`.
    const binaryPath = app.isPackaged
        ? path.join(process.resourcesPath, 'server', binaryName)
        : path.join(__dirname, binaryName);

    console.log(`Starting Go server: ${binaryPath} --host=localhost:${port} --launch=false`);
    
    goProcess = spawn(binaryPath, [`--host=localhost:${port}`, '--launch=false'], {
        cwd: app.isPackaged ? process.resourcesPath : __dirname,
    });

    goProcess.stdout.on('data', (data) => {
        console.log(`Go Stdout: ${data}`);
    });

    goProcess.stderr.on('data', (data) => {
        console.error(`Go Stderr: ${data}`);
    });

    // Wait for the server to be ready
    const checkServer = () => {
        return new Promise((resolve) => {
            const req = http.get(`http://localhost:${port}/version`, (res) => {
                if (res.statusCode === 200) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
            req.on('error', () => resolve(false));
            req.end();
        });
    };

    for (let i = 0; i < 30; i++) {
        if (await checkServer()) {
            return true;
        }
        await new Promise(r => setTimeout(r, 500));
    }
    return false;
}

async function createWindow() {
    const port = PORT;
    if (!(await isPortFree(port))) {
        dialog.showErrorBox('Port in use', `Port ${port} is already in use, close the application using it and try again.`);
        app.quit();
        return;
    }
    const success = await startGoServer(port);

    if (!success) {
        console.error('Failed to start Go server');
        app.quit();
        return;
    }

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: path.join(__dirname, 'assets', 'favicon_io', 'favicon-32x32.png')
    });

    mainWindow.loadURL(`http://localhost:${port}/`);

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.focus();
        }
    });
    app.on('ready', createWindow);
}

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('will-quit', () => {
    if (goProcess) {
        goProcess.kill();
    }
});
