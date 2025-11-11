import { contextBridge } from "electron";
import os from "os";

contextBridge.exposeInMainWorld("streamnowDesktop", {
  platform: os.platform(),
});

export {};

