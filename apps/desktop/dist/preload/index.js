"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const os_1 = __importDefault(require("os"));
electron_1.contextBridge.exposeInMainWorld("streamnowDesktop", {
    platform: os_1.default.platform(),
});
