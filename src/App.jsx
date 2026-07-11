/* global __BUILD_TIME__ */
import React, { useState, useEffect } from 'react';
import { scrapePlaylist } from './utils/youtubeScraper';

// SVG Icons
const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const AlertCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const CheckboxIcon = ({ checked }) => (
  <div className={`video-checkbox ${checked ? 'checked' : ''}`}>
    {checked && (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    )}
  </div>
);

function App() {
  const [inputUrl, setInputUrl] = useState('');
  const [playlistData, setPlaylistData] = useState(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [exportFormat, setExportFormat] = useState('title-link');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState([]);

  // Set document title with build time
  useEffect(() => {
    document.title = `YouTube 播放清單連結擷取器 (${typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'Dev'} build)`;
  }, []);

  // Toast notifier
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const handleFetchPlaylist = async (e) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    setLoading(true);
    setError('');
    setPlaylistData(null);
    setSelectedVideoIds(new Set());

    try {
      const data = await scrapePlaylist(inputUrl);
      setPlaylistData(data);
      
      // Select all videos by default
      const defaultSelected = new Set(data.videos.map(v => v.id));
      setSelectedVideoIds(defaultSelected);

      showToast('🎉 成功載入播放清單！', 'success');
    } catch (err) {
      console.error(err);
      setError(err.message);
      showToast('❌ 載入失敗，請檢查網址', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Single Video
  const handleToggleSelect = (id) => {
    const nextSelected = new Set(selectedVideoIds);
    if (nextSelected.has(id)) {
      nextSelected.delete(id);
    } else {
      nextSelected.add(id);
    }
    setSelectedVideoIds(nextSelected);
  };

  // Select All
  const handleSelectAll = () => {
    if (!playlistData) return;
    const allIds = new Set(playlistData.videos.map(v => v.id));
    setSelectedVideoIds(allIds);
    showToast('✅ 已選取所有影片', 'success');
  };

  // Select None
  const handleSelectNone = () => {
    setSelectedVideoIds(new Set());
    showToast('⏹️ 已清除選取', 'success');
  };

  // Generate string export output
  const generateExportText = () => {
    if (!playlistData) return '';
    const selectedVideos = playlistData.videos.filter(v => selectedVideoIds.has(v.id));

    switch (exportFormat) {
      case 'link-only':
        return selectedVideos.map(v => v.url).join('\n');
      
      case 'title-link':
        return selectedVideos.map((v, i) => `${i + 1}. ${v.title}\n${v.url}`).join('\n\n');
      
      case 'markdown':
        return selectedVideos.map(v => `- [${v.title}](${v.url})`).join('\n');
      
      case 'json':
        const exportObj = selectedVideos.map((v, i) => ({
          index: i + 1,
          title: v.title,
          url: v.url,
          duration: v.duration,
          author: v.author
        }));
        return JSON.stringify(exportObj, null, 2);
      
      default:
        return '';
    }
  };

  // Clipboard copy
  const handleCopySelected = () => {
    if (selectedVideoIds.size === 0) {
      showToast('⚠️ 請先選取至少一部影片！', 'error');
      return;
    }

    const text = generateExportText();
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast(`📋 已成功複製 ${selectedVideoIds.size} 部影片資訊！`, 'success');
    } catch (err) {
      console.error(err);
      showToast('❌ 複製失敗，請手動複製', 'error');
    } finally {
      document.body.removeChild(textarea);
    }
  };

  // Copy Single Link
  const handleCopySingle = (e, url) => {
    e.stopPropagation();
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('📋 已複製單一連結！', 'success');
    } catch (err) {
      console.error(err);
    } finally {
      document.body.removeChild(textarea);
    }
  };

  // Download export text
  const handleDownload = () => {
    if (selectedVideoIds.size === 0) {
      showToast('⚠️ 請先選取至少一部影片！', 'error');
      return;
    }

    const text = generateExportText();
    let fileExtension = 'txt';
    let mimeType = 'text/plain';

    if (exportFormat === 'json') {
      fileExtension = 'json';
      mimeType = 'application/json';
    } else if (exportFormat === 'markdown') {
      fileExtension = 'md';
    }

    const blob = new Blob([text], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = playlistData.title.replace(/[/\\?%*:|"<>]/g, '-');
    link.href = url;
    link.setAttribute('download', `${safeTitle}_links.${fileExtension}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('📥 檔案開始下載！', 'success');
  };

  // Filters
  const filteredVideos = playlistData
    ? playlistData.videos.filter(v =>
        v.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <>
      {/* Ambient background glows */}
      <div className="ambient-glow"></div>
      <div className="ambient-glow-2"></div>

      <div className="app-container">
        {/* Main Header */}
        <header className="app-header">
          <div className="header-logo">
            <div className="logo-icon">📺</div>
            <div className="logo-titles">
              <h1>YouTube Playlist Extractor</h1>
              <span className="logo-subtitle">播放清單連結與資訊擷取工具</span>
            </div>
          </div>
        </header>

        {/* Search input Form */}
        <section className="search-section">
          <form onSubmit={handleFetchPlaylist} className="search-form">
            <input
              type="text"
              placeholder="貼上 YouTube 播放清單網址，例如：https://www.youtube.com/playlist?list=..."
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              disabled={loading}
              className="search-input"
            />
            <button type="submit" disabled={loading} className="fetch-btn">
              {loading ? (
                <>
                  <div className="spinner"></div>
                  <span>分析中...</span>
                </>
              ) : (
                <span>擷取清單</span>
              )}
            </button>
          </form>

          {error && (
            <div className="error-banner">
              <AlertCircleIcon />
              <span className="error-text">{error}</span>
            </div>
          )}
        </section>

        {/* Main content grid */}
        {loading && !playlistData && (
          <div className="loading-state-center">
            <div className="spinner big"></div>
            <p>正在分析 YouTube 播放清單網頁，請稍候...</p>
          </div>
        )}

        {playlistData && (
          <div className="main-grid">
            {/* Sidebar Left: Playlist Info */}
            <aside className="playlist-sidebar">
              <div className="sidebar-card">
                <div className="thumbnail-wrapper">
                  <img
                    src={playlistData.thumbnail || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&q=80'}
                    alt="Playlist Cover"
                    className="playlist-cover"
                  />
                  <div className="video-count-badge">
                    {playlistData.videoCount}
                  </div>
                </div>

                <div className="playlist-details">
                  <h2 className="playlist-title">{playlistData.title}</h2>
                  <div className="playlist-meta">
                    <span className="meta-author">
                      👤 {playlistData.author?.name || '未知創作者'}
                    </span>
                  </div>
                  {playlistData.description && (
                    <p className="playlist-desc">{playlistData.description}</p>
                  )}
                  
                  <a
                    href={playlistData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="original-link"
                  >
                    <span>開啟原播放清單</span>
                    <ExternalLinkIcon />
                  </a>
                </div>
              </div>
            </aside>

            {/* Main Area Right: Videos Grid list */}
            <main className="videos-panel">
              {/* Toolbar */}
              <div className="toolbar">
                <div className="toolbar-row top">
                  {/* Search box */}
                  <div className="search-box-wrapper">
                    <SearchIcon />
                    <input
                      type="text"
                      placeholder="搜尋影片標題..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="filter-input"
                    />
                  </div>

                  {/* Format selector */}
                  <div className="format-selector">
                    <span className="format-label">導出格式：</span>
                    <div className="radio-group">
                      <label className={`radio-label ${exportFormat === 'title-link' ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="format"
                          value="title-link"
                          checked={exportFormat === 'title-link'}
                          onChange={() => setExportFormat('title-link')}
                        />
                        標題 + 連結
                      </label>
                      <label className={`radio-label ${exportFormat === 'link-only' ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="format"
                          value="link-only"
                          checked={exportFormat === 'link-only'}
                          onChange={() => setExportFormat('link-only')}
                        />
                        僅連結
                      </label>
                      <label className={`radio-label ${exportFormat === 'markdown' ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="format"
                          value="markdown"
                          checked={exportFormat === 'markdown'}
                          onChange={() => setExportFormat('markdown')}
                        />
                        Markdown
                      </label>
                      <label className={`radio-label ${exportFormat === 'json' ? 'active' : ''}`}>
                        <input
                          type="radio"
                          name="format"
                          value="json"
                          checked={exportFormat === 'json'}
                          onChange={() => setExportFormat('json')}
                        />
                        JSON
                      </label>
                    </div>
                  </div>
                </div>

                <div className="toolbar-row bottom">
                  {/* Selection stats */}
                  <div className="selection-stats">
                    已選取 <strong>{selectedVideoIds.size}</strong> / {playlistData.videos.length} 部影片
                  </div>

                  {/* Action buttons */}
                  <div className="action-buttons">
                    <button onClick={handleSelectAll} className="btn-secondary">
                      全選
                    </button>
                    <button onClick={handleSelectNone} className="btn-secondary">
                      清除選取
                    </button>
                    <button onClick={handleCopySelected} className="btn-primary">
                      <CopyIcon />
                      複製已選
                    </button>
                    <button onClick={handleDownload} className="btn-primary success">
                      下載檔案
                    </button>
                  </div>
                </div>
              </div>

              {/* Videos List */}
              <div className="videos-list">
                {filteredVideos.length === 0 ? (
                  <div className="empty-state">
                    <p>找不到符合搜尋字詞的影片</p>
                  </div>
                ) : (
                  filteredVideos.map((video, index) => {
                    const isSelected = selectedVideoIds.has(video.id);
                    const absoluteIndex = playlistData.videos.indexOf(video) + 1;
                    return (
                      <div
                        key={video.id}
                        onClick={() => handleToggleSelect(video.id)}
                        className={`video-item ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="checkbox-wrapper">
                          <CheckboxIcon checked={isSelected} />
                        </div>
                        <div className="video-index">{absoluteIndex}</div>
                        <img
                          src={video.thumbnail || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=120&q=80'}
                          alt="Video Thumbnail"
                          className="video-item-thumbnail"
                          loading="lazy"
                        />
                        <div className="video-details">
                          <div className="video-item-title" title={video.title}>
                            {video.title}
                          </div>
                          <div className="video-meta-row">
                            <span className="video-duration">{video.duration}</span>
                            {video.author && <span>• {video.author}</span>}
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleCopySingle(e, video.url)}
                          className="copy-single-btn"
                          title="複製連結"
                        >
                          <CopyIcon />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </main>
          </div>
        )}

        {/* Empty state when no playlist is loaded */}
        {!playlistData && !loading && (
          <section className="intro-card-section">
            <div className="intro-card">
              <div className="intro-icon">🎬</div>
              <h2>貼上網址，一鍵擷取</h2>
              <p>支援任意 YouTube 公開播放清單 (Playlist) 連結。自動分析並過濾重複項目，可自行搜尋篩選、批次導出為多種連結格式或存為檔案。</p>
              <div className="intro-features">
                <div className="feature-item">
                  <span className="f-icon">🔒</span>
                  <h4>純前端處理</h4>
                  <p>透過公用 CORS 代理，所有擷取與解析程序 100% 在您的瀏覽器進行，不經第三方伺服器儲存。</p>
                </div>
                <div className="feature-item">
                  <span className="f-icon">⚡</span>
                  <h4>多格式導出</h4>
                  <p>一鍵拷貝為「僅連結、Markdown 列表、帶有標題的有序清單或標準 JSON 格式」支援下載。</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Toast Toast alerts */}
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast ${t.type}`}>
              {t.type === 'success' ? <CheckCircleIcon /> : <AlertCircleIcon />}
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default App;
