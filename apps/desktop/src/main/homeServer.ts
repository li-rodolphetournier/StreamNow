import fs from "fs";
import path from "path";
import { spawn, type ChildProcess } from "child_process";

const repoRoot = path.resolve(__dirname, "../../../../");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";

let child: ChildProcess | null = null;

const ensureDirectory = (target: string) => {
  try {
    fs.mkdirSync(target, { recursive: true });
  } catch (error) {
    console.warn(`Unable to ensure directory ${target}`, error);
  }
};

interface StartOptions {
  isPackaged?: boolean;
  resourcesPath?: string;
  userDataPath?: string;
}

export async function startHomeServer(options: StartOptions = {}): Promise<void> {
  if (child) {
    return;
  }

  const {
    isPackaged = false,
    resourcesPath = process.resourcesPath,
    userDataPath,
  } = options;

  const mediaDirectory = isPackaged
    ? path.join(userDataPath ?? process.cwd(), "home_media")
    : path.resolve(repoRoot, "home_media");

  ensureDirectory(mediaDirectory);

  if (isPackaged) {
    const homeServerDir = path.join(resourcesPath, "home-server");
    const entryPoint = path.join(homeServerDir, "index.js");

    if (!fs.existsSync(entryPoint)) {
      console.error(
        `Home server entry not found at ${entryPoint}. Did you run the packaging build?`
      );
      return;
    }

    child = spawn(process.execPath, [entryPoint], {
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
  } else {
    child = spawn(
      npmCommand,
      ["run", "home", "--workspace", "apps/home-server"],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          HOME_SERVER_PORT: process.env.HOME_SERVER_PORT ?? "4300",
          HOME_SERVER_HOST: process.env.HOME_SERVER_HOST ?? "127.0.0.1",
          HOME_SERVER_MEDIA_ROOT: mediaDirectory,
        },
        stdio: "inherit",
        shell: isWindows,
      }
    );
  }

  child.on("exit", (code: number | null, signal: NodeJS.Signals | null) => {
    if (code !== 0) {
      console.error(
        `StreamNow Home server exited unexpectedly (code=${code}, signal=${String(
          signal
        )})`
      );
    }
    child = null;
  });
}

export async function stopHomeServer(): Promise<void> {
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
  } catch (error) {
    console.error("Failed to stop StreamNow Home server cleanly", error);
  } finally {
    child = null;
  }
}

