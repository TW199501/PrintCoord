#!/usr/bin/env node

/**
 * PrintCoord - 自動版本號管理
 * 每次成功構建後自動增加 patch 版本號 (+0.0.1)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.join(__dirname, "../package.json");

// 讀取 package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// 解析當前版本
const currentVersion = packageJson.version;
const [major, minor, patch] = currentVersion.split(".").map(Number);

// 增加 patch 版本號
const newPatch = patch + 1;
const newVersion = `${major}.${minor}.${newPatch}`;

// 更新 package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");

console.log(`✅ 版本號已更新: ${currentVersion} → ${newVersion}`);

// 創建版本記錄
const versionLog = {
  version: newVersion,
  timestamp: new Date().toISOString(),
  previousVersion: currentVersion,
};

const versionLogPath = path.join(__dirname, "../.version-history.json");
let history = [];

if (fs.existsSync(versionLogPath)) {
  history = JSON.parse(fs.readFileSync(versionLogPath, "utf8"));
}

history.push(versionLog);
fs.writeFileSync(versionLogPath, JSON.stringify(history, null, 2) + "\n");

console.log(`📝 版本記錄已保存`);
