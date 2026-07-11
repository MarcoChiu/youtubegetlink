# 📺 YouTube Playlist Extractor — 播放清單連結與資訊擷取工具 (React + Vite 版)

🚀 **線上直接使用連結：[https://MarcoChiu.github.io/youtubegetlink/](https://MarcoChiu.github.io/youtubegetlink/)**

[![Privacy First](https://img.shields.io/badge/Privacy-100%25_Local-brightgreen?style=flat-spec)](https://github.com/MarcoChiu/youtubegetlink)
[![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Vite-blue?style=flat-spec)](https://github.com/MarcoChiu/youtubegetlink)
[![License](https://img.shields.io/badge/License-ISC-orange?style=flat-spec)](https://github.com/MarcoChiu/youtubegetlink)

一個設計精美、功能強大且**100% 在瀏覽器本地端運行**的 YouTube 播放清單連結與資訊擷取工具。本專案採用 **React + Vite** 重構，介面融入了精緻的 **磨砂玻璃質感 (Glassmorphism)** 與響應式深色模式設計，提供流暢、高品質的單頁應用程式 (SPA) 處理體驗。

> [!IMPORTANT]
> **隱私第一與無伺服器（Serverless）**：本工具箱的所有功能皆**在瀏覽器端本地完成**。我們透過公開 CORS 代理伺服器（AllOrigins / CorsProxy.io）取得公開播放清單網頁，並在本地使用正則表達式解析 `ytInitialData`，絕不將您的個人隱私資料與擷取紀錄上傳至任何第三方後端伺服器！

---

## 🌟 核心特色 (Key Features)

### 1. ⚡ 純前端網頁擷取與解析
* **免後端 CORS 解析**：自動透過公用代理伺服器擷取 YouTube 公開播放清單的網頁 HTML，並在前端以極致相容的遞迴演算法尋找影片節點。
* **高容錯備份機制**：首創 AllOrigins 代理優先，並配置 CorsProxy.io 備用代理，確保擷取服務不中斷。

### 2. 🗂️ 靈活多格式導出
* **僅連結**：僅輸出所有影片之 YouTube 播放網址。
* **標題 + 連結**：以數字列表標註影片標題與對應連結。
* **Markdown 列表**：直接生成為 Markdown 書籤超連結：`- [標題](連結)`。
* **JSON 檔案**：提供完整的影片詳細結構（包含 index, title, url, duration, author）以供程式開發串接。
* **一鍵複製與下載**：提供「複製已選項目」與直接「下載為文字/JSON/Markdown 檔案」功能。

### 3. 🔍 便利影片篩選與細緻控制
* **關鍵字即時搜尋**：輸入文字即可即時響應式過濾播放清單內的影片標題。
* **單一與批次選取**：支援一鍵「全選」、「清除選取」或在清單中勾選指定影片。
* **單獨連結複製**：清單中各影片右方均有獨立複製按鈕，方便隨時提取單一連結。

### 4. 📸 介面美學與設計
* **現代暗色毛玻璃 (Glassmorphism)**：使用半透明背景結合背景模糊（backdrop-filter），呈現高端科幻感。
* **氛圍發光 (Ambient Glow)**：動態流暢的紅色色彩光暈背景，提升視覺層次。
* **流暢微動畫 (Micro-animations)**：每個按鈕懸停、輸入框聚焦與 toast 彈出皆配有精緻的過場動畫。

---

## 📂 專案目錄結構 (Project Directory Layout)

```text
youtubegetlink/
├── src/                        # React 原始碼目錄
│   ├── components/             # React 組件
│   ├── css/                    # 樣式表目錄
│   │   ├── base.css            # 基礎配置與動畫
│   │   ├── layout.css          # 主要 Glassmorphism 佈局
│   │   ├── responsive.css      # 響應式手機版適配
│   │   └── variables.css       # 顏色與陰影變數
│   ├── utils/                  # 工具函式庫
│   │   └── youtubeScraper.js   # 核心 YouTube 前端爬蟲解析器
│   ├── App.jsx                 # 全域 Layout 與狀態控制器
│   ├── index.css               # 整合導入樣式表
│   └── main.jsx                # React 啟動點
├── vanilla-backup/             # 舊版 Vanilla JS 與 Express 後端程式碼備份
│   ├── public/                 # 舊版靜態資源
│   ├── server.js               # 舊版 Express 伺服器程式
│   └── test-allorigins.js      # CORS 測試指令碼
├── vite.config.js              # Vite 設定檔 (配置相對路徑 base: './')
├── index.html                  # 首頁 HTML 模板
├── postdeploy.js               # 發布後自動提交並 Push 主分支的 node 腳本
└── package.json                # npm 設定檔與相依套件
```

---

## 🛠️ 技術棧 (Tech Stack)

### 前端 (Frontend)
- **核心**：React 19 / Vite 6 / Vanilla CSS3
- **主要機制** (皆於瀏覽器本地執行，支援 100% 離線與無後端使用)：
  - `CORS API Proxy`：用於請求公開播放清單頁面。
  - `Regex Parser`：尋找 HTML 中內嵌的 `ytInitialData` JSON 字串。
  - `Recursive Node Extractor`：解析對應的 `lockupViewModel` 與 `playlistVideoRenderer` 並提取完整資訊。

---

## 🚀 快速開始 (Getting Started)

### 1. 本地開發環境設置
確保系統已安裝 [Node.js](https://nodejs.org/)。

```bash
# 下載/複製儲存庫
git clone https://github.com/MarcoChiu/youtubegetlink.git
cd youtubegetlink

# 安裝依賴
npm install

# 啟動前端開發伺服器 (Vite)
npm run dev
```
啟動後在瀏覽器開啟 `http://localhost:5173` 即可開始體驗！

---

## 🚀 部署與自動化 Git Pipeline

本專案支援**本地一鍵部署與自動化 Git 提交更新**：

### 本地一鍵部署 (推薦，最快速)
直接在終端機執行：
```bash
npm run deploy
```
系統會自動：
1. 執行 `npm run build` 進行 Vite 生產環境打包。
2. 使用 `gh-pages` 工具將 `dist` 產出推送到 `gh-pages` 分支完成網頁發佈。
3. 觸發 `postdeploy.js` 腳本，自動將您的原始碼變更進行 `git commit`（標記為 `deploy: YYYYMMDDHHMM` 的時間戳記）並自動 `git push` 回 `main` 主分支。

---

## 📝 授權條款 (License)

本專案採用 **ISC License** 授權開源。
