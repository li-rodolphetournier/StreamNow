"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const homeServer_1 = require("./homeServer");
const isDev = process.env.NODE_ENV !== "production";
let mainWindow = null;
let isCreatingWindow = false;
let isQuitting = false;
function resolveRendererHtml() {
    const explicitUrl = process.env.STREAMNOW_DESKTOP_URL;
    if (explicitUrl) {
        return explicitUrl;
    }
    if (isDev) {
        return "http://localhost:3000/home";
    }
    const rendererPath = path_1.default.join(__dirname, "..", "renderer", "index.html");
    return (0, url_1.pathToFileURL)(rendererPath).toString();
}
function resolvePreloadPath() {
    const preloadRelative = path_1.default.join("..", "preload", "index.js");
    if (isDev) {
        return path_1.default.join(__dirname, "..", "preload", "index.ts");
    }
    return path_1.default.join(__dirname, preloadRelative);
}
async function createWindow() {
    if (isCreatingWindow) {
        return;
    }
    isCreatingWindow = true;
    const preloadPath = resolvePreloadPath();
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 960,
        minHeight: 640,
        title: "StreamNow Home",
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            spellcheck: false,
        },
        show: false,
    });
    mainWindow.once("ready-to-show", () => {
        mainWindow?.show();
    });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
        return { action: "deny" };
    });
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
    const targetUrl = resolveRendererHtml();
    try {
        if (targetUrl.startsWith("file://")) {
            const filePath = (0, url_1.pathToFileURL)(path_1.default.join(__dirname, "..", "renderer", "index.html")).toString();
            await mainWindow.loadURL(filePath);
        }
        else {
            await mainWindow.loadURL(targetUrl);
        }
    }
    catch (error) {
        mainWindow.webContents.loadURL(`data:text/plain,Failed to load UI. Please ensure StreamNow Web is running.%0A${String(error)}`);
    }
    finally {
        isCreatingWindow = false;
    }
}
const hasSingleInstanceLock = electron_1.app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on("second-instance", () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.focus();
        }
    });
}
electron_1.app.whenReady().then(() => {
    if (!hasSingleInstanceLock) {
        return;
    }
    void (0, homeServer_1.startHomeServer)({
        isPackaged: electron_1.app.isPackaged,
        resourcesPath: process.resourcesPath,
        userDataPath: electron_1.app.getPath("userData"),
    })
        .catch((error) => {
        console.error("Failed to start StreamNow Home server", error);
    })
        .finally(() => {
        void createWindow();
    });
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            void createWindow();
        }
    });
});
electron_1.app.on("window-all-closed", () => {
    if (isQuitting) {
        return;
    }
    if (process.platform === "darwin") {
        return;
    }
    electron_1.app.quit();
});
electron_1.app.on("before-quit", () => {
    isQuitting = true;
    if (mainWindow) {
        mainWindow.removeAllListeners();
    }
    void (0, homeServer_1.stopHomeServer)();
});
electron_1.app.on("activate", () => {
    if (!hasSingleInstanceLock) {
        return;
    }
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        void createWindow();
    }
    else {
        const [window] = electron_1.BrowserWindow.getAllWindows();
        window?.focus();
    }
});
process.on("uncaughtException", (error) => {
    console.error("Uncaught exception in main process", error);
});
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection in main process", reason);
});
