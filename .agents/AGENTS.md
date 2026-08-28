# YouTube Get Link & Global Project Standards - AI Agent Rules

These rules must be strictly followed by all AI agents operating within this workspace to maintain the established architectural, port allocation, and UX standards.

## 🚀 Unified Workspace & Port Allocation Rules (全域工程與 Port 規範)
所有在 `c:\Marco\DeveloperAI\` 底下的專案必須遵守統一的技術架構與連續 Port 編排：

### 1. Port Allocation Matrix (Port 循序分配表)
- `3000`: `localhosttoolbox`
- `3001`: `memorizewords`
- `3002`: `youtubegetlink`
- `3003`: `livepoll`
- `3004`: `kline`
- `3005`: `fs533610tt`
- `3006`: `HIIT`
- **`3007+`**: **未來任何新專案必須依序往下遞增分配 (3007, 3008, 3009...)，不可跳號或與現有專案衝突。**

### 2. Standard Tech Stack (統一技術標準)
- **Framework**: React + Vite (SPA 架構)
- **Base URL**: `base: './'` (確保 GitHub Pages 部署路徑正確)
- **Build Define**: `__BUILD_TIME__` (在 `vite.config.js` 中定義當前打包時間)
- **Deployment**: `gh-pages` + `postdeploy.js` (自動提交與推送原始碼到 main 分支)
