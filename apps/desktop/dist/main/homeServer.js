"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startHomeServer = startHomeServer;
exports.stopHomeServer = stopHomeServer;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const repoRoot = path_1.default.resolve(__dirname, "../../../../");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
let child = null;
const ensureDirectory = (target) => {
    try {
        fs_1.default.mkdirSync(target, { recursive: true });
    }
    catch (error) {
        console.warn(`Unable to ensure directory ${target}`, error);
    }
};
async function startHomeServer(options = {}) {
    if (child) {
        return;
    }
    const { isPackaged = false, resourcesPath = process.resourcesPath, userDataPath, } = options;
    const mediaDirectory = isPackaged
        ? path_1.default.join(userDataPath ?? process.cwd(), "home_media")
        : path_1.default.resolve(repoRoot, "home_media");
    ensureDirectory(mediaDirectory);
    if (isPackaged) {
        const homeServerDir = path_1.default.join(resourcesPath, "home-server");
        const entryPoint = path_1.default.join(homeServerDir, "index.js");
        if (!fs_1.default.existsSync(entryPoint)) {
            console.error(`Home server entry not found at ${entryPoint}. Did you run the packaging build?`);
            return;
        }
        child = (0, child_process_1.spawn)(process.execPath, [entryPoint], {
            cwd: homeServerDir,
            env: {
                ...process.env,
                NODE_ENV: "production",
                HOME_SERVER_PORT: process.env.HOME_SERVER_PORT ?? "4300",
                HOME_SERVER_HOST: process.env.HOME_SERVER_HOST ?? "127.0.0.1",
                HOME_SERVER_MEDIA_ROOT: mediaDirectory,
            },
            stdio: "pipe",
        });
        child.stdout?.on("data", (chunk) => {
            console.log(`[home-server] ${chunk.toString().trimEnd()}`);
        });
        child.stderr?.on("data", (chunk) => {
            console.error(`[home-server] ${chunk.toString().trimEnd()}`);
        });
    }
    else {
        child = (0, child_process_1.spawn)(npmCommand, ["run", "home", "--workspace", "apps/home-server"], {
            cwd: repoRoot,
            env: {
                ...process.env,
                HOME_SERVER_PORT: process.env.HOME_SERVER_PORT ?? "4300",
                HOME_SERVER_HOST: process.env.HOME_SERVER_HOST ?? "127.0.0.1",
                HOME_SERVER_MEDIA_ROOT: mediaDirectory,
            },
            stdio: "inherit",
            shell: isWindows,
        });
    }
    child.on("exit", (code, signal) => {
        if (code !== 0) {
            console.error(`StreamNow Home server exited unexpectedly (code=${code}, signal=${String(signal)})`);
        }
        child = null;
    });
}
async function stopHomeServer() {
    if (!child) {
        return;
    }
    try {
        const signal = process.platform === "win32" ? "SIGINT" : "SIGTERM";
        child.kill(signal);
        const timeout = setTimeout(() => {
            if (child && !child.killed) {
                child.kill("SIGKILL");
            }
        }, 5000);
        child.once("exit", () => clearTimeout(timeout));
    }
    catch (error) {
        console.error("Failed to stop StreamNow Home server cleanly", error);
    }
    finally {
        child = null;
    }
}
