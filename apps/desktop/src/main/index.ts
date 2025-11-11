import { app, BrowserWindow, shell } from "electron";
import path from "path";
import { pathToFileURL } from "url";
import { startHomeServer, stopHomeServer } from "./homeServer";

const isDev = process.env.NODE_ENV !== "production";

let mainWindow: BrowserWindow | null = null;
let isCreatingWindow = false;
let isQuitting = false;

function resolveRendererHtml(): string {
  const explicitUrl = process.env.STREAMNOW_DESKTOP_URL;
  if (explicitUrl) {
    return explicitUrl;
  }

  if (isDev) {
    return "http://localhost:3000/home";
  }

  const rendererPath = path.join(__dirname, "..", "renderer", "index.html");
  return pathToFileURL(rendererPath).toString();
}

function resolvePreloadPath(): string {
  const preloadRelative = path.join("..", "preload", "index.js");
  if (isDev) {
    return path.join(__dirname, "..", "preload", "index.ts");
  }
  return path.join(__dirname, preloadRelative);
}

async function createWindow(): Promise<void> {
  if (isCreatingWindow) {
    return;
  }
  isCreatingWindow = true;

  const preloadPath = resolvePreloadPath();

  mainWindow = new BrowserWindow({
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
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  const targetUrl = resolveRendererHtml();
  try {
    if (targetUrl.startsWith("file://")) {
      const filePath = pathToFileURL(path.join(__dirname, "..", "renderer", "index.html")).toString();
      await mainWindow.loadURL(filePath);
    } else {
      await mainWindow.loadURL(targetUrl);
    }
  } catch (error) {
    mainWindow.webContents.loadURL(
      `data:text/plain,Failed to load UI. Please ensure StreamNow Web is running.%0A${String(
        error
      )}`
    );
  } finally {
    isCreatingWindow = false;
  }
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  if (!hasSingleInstanceLock) {
    return;
  }

  void startHomeServer({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    userDataPath: app.getPath("userData"),
  })
    .catch((error) => {
      console.error("Failed to start StreamNow Home server", error);
    })
    .finally(() => {
      void createWindow();
    });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (isQuitting) {
    return;
  }

  if (process.platform === "darwin") {
    return;
  }

  app.quit();
});

app.on("before-quit", () => {
  isQuitting = true;
  if (mainWindow) {
    mainWindow.removeAllListeners();
  }
  void stopHomeServer();
});

app.on("activate", () => {
  if (!hasSingleInstanceLock) {
    return;
  }

  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  } else {
    const [window] = BrowserWindow.getAllWindows();
    window?.focus();
  }
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception in main process", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection in main process", reason);
});

