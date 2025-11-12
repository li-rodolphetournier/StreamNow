/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

function copyRecursive(source, destination) {
  if (!fs.existsSync(source)) {
    return;
  }

  const stats = fs.statSync(source);

  if (stats.isDirectory()) {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(destination, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

const root = path.resolve(__dirname, "..");
const rendererSrc = path.join(root, "src", "renderer");
const rendererDest = path.join(root, "dist", "renderer");

copyRecursive(rendererSrc, rendererDest);

