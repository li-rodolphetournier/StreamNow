const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const releaseDir = path.resolve(__dirname, "..", "release");

const isWindows = process.platform === "win32";

if (isWindows) {
  const tasks = ["StreamNow Home.exe", "StreamNow Home", "StreamNow Home Setup.exe"];
  for (const task of tasks) {
    const result = spawnSync("taskkill", ["/IM", task, "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
    if (result.error) {
      // Ignore if command not available or process not found.
    }
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const tryRemove = async (target) => {
  const maxAttempts = 5;

  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    try {
      fs.rmSync(target, { recursive: true, force: true, maxRetries: 0 });
      return true;
    } catch (error) {
      if (attempt === maxAttempts) {
        console.warn(`Unable to cleanup release directory after ${maxAttempts + 1} attempts`, error);
        return false;
      }

      const delay = 200 * (attempt + 1);
      await sleep(delay);
    }
  }

  return false;
};

tryRemove(releaseDir).catch((error) => {
  console.warn("Failed to cleanup release directory", error);
});

