// Front-end logic for YT Playlist Linker

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons for initial page
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // State Management
  let playlistData = null;
  let selectedVideoIds = new Set();
  let searchFilterQuery = '';

  // DOM Elements
  const playlistForm = document.getElementById('playlist-form');
  const playlistUrlInput = document.getElementById('playlist-url');
  const submitBtn = document.getElementById('submit-btn');
  const errorMessageDiv = document.getElementById('error-message');
  const errorTextSpan = errorMessageDiv.querySelector('.error-text');
  const loadingState = document.getElementById('loading-state');
  const appWorkspace = document.getElementById('app-workspace');

  // Sidebar Elements
  const playlistThumbnail = document.getElementById('playlist-thumbnail');
  const playlistBadgeCount = document.getElementById('playlist-badge-count');
  const playlistTitle = document.getElementById('playlist-title');
  const playlistAuthor = document.getElementById('playlist-author');
  const playlistVideoCount = document.getElementById('playlist-video-count');
  const playlistOriginalLink = document.getElementById('playlist-original-link');

  // Controls Elements
  const videoSearch = document.getElementById('video-search');
  const selectedCountSpan = document.getElementById('selected-count');
  const totalCountSpan = document.getElementById('total-count');
  const btnSelectAll = document.getElementById('btn-select-all');
  const btnSelectNone = document.getElementById('btn-select-none');
  const btnCopySelected = document.getElementById('btn-copy-selected');
  const btnDownloadTxt = document.getElementById('btn-download-txt');
  const videosContainer = document.getElementById('videos-container');
  const toastContainer = document.getElementById('toast-container');

  // Submit form handler
  playlistForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = playlistUrlInput.value.trim();
    if (!url) return;

    // Reset UI states
    showError(null);
    showLoading(true);
    appWorkspace.classList.add('hidden');
    selectedVideoIds.clear();
    searchFilterQuery = '';
    videoSearch.value = '';

    try {
      const response = await fetch(`/api/playlist?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '無法擷取播放清單，請確認網址是否正確。');
      }

      playlistData = data;
      
      // Select all videos by default
      playlistData.videos.forEach(video => selectedVideoIds.add(video.id));

      // Render workspace
      renderPlaylistInfo();
      renderVideosList();
      updateSelectionStats();

      // Show Workspace
      showLoading(false);
      appWorkspace.classList.remove('hidden');

      showToast('🎉 成功載入播放清單！', 'success');

    } catch (err) {
      console.error(err);
      showLoading(false);
      showError(err.message);
      showToast('❌ 載入失敗，請檢查網址', 'error');
    }
  });

  // Render Sidebar Info
  function renderPlaylistInfo() {
    playlistTitle.textContent = playlistData.title;
    playlistVideoCount.textContent = `${playlistData.videoCount} 部`;
    playlistBadgeCount.textContent = playlistData.videos.length;
    playlistOriginalLink.href = playlistData.url;
    
    if (playlistData.author) {
      playlistAuthor.textContent = playlistData.author.name;
    } else {
      playlistAuthor.textContent = '未知創作者';
    }

    if (playlistData.thumbnail) {
      playlistThumbnail.src = playlistData.thumbnail;
    } else {
      playlistThumbnail.src = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&q=80';
    }
  }

  // Render Videos list with filter
  function renderVideosList() {
    videosContainer.innerHTML = '';
    
    if (!playlistData || !playlistData.videos) return;

    // Filter videos based on search
    const filteredVideos = playlistData.videos.filter(video => 
      video.title.toLowerCase().includes(searchFilterQuery.toLowerCase())
    );

    if (filteredVideos.length === 0) {
      videosContainer.innerHTML = `
        <div class="loading-state" style="padding:2rem 0;">
          <p>找不到符合 "${searchFilterQuery}" 的影片</p>
        </div>
      `;
      return;
    }

    filteredVideos.forEach((video, index) => {
      const isSelected = selectedVideoIds.has(video.id);
      const videoIndexNum = playlistData.videos.indexOf(video) + 1;

      const videoElement = document.createElement('div');
      videoElement.className = `video-item ${isSelected ? 'selected' : ''}`;
      videoElement.dataset.id = video.id;

      // Handle item click for selecting/deselecting (except when clicking direct copy button)
      videoElement.innerHTML = `
        <div class="checkbox-wrapper">
          <div class="video-checkbox"></div>
        </div>
        <div class="video-index">${videoIndexNum}</div>
        <img src="${video.thumbnail || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=120&q=80'}" class="video-item-thumbnail" alt="thumbnail">
        <div class="video-details">
          <div class="video-item-title" title="${escapeHtml(video.title)}">${escapeHtml(video.title)}</div>
          <div class="video-meta-row">
            <span class="video-duration">${video.duration || '00:00'}</span>
            ${video.author ? `<span>• ${escapeHtml(video.author)}</span>` : ''}
          </div>
        </div>
        <button class="video-link-icon-btn copy-single-btn" data-url="${video.url}" title="複製單一連結">
          <i data-lucide="copy"></i>
        </button>
      `;

      // Handle main element click (toggle select)
      videoElement.addEventListener('click', (e) => {
        // If clicking the copy icon button or its child icon, copy the single link directly and do not toggle select
        if (e.target.closest('.copy-single-btn')) {
          const singleUrl = e.target.closest('.copy-single-btn').dataset.url;
          copyToClipboard(singleUrl);
          showToast('📋 已複製影片連結！', 'success');
          return;
        }

        toggleVideoSelection(video.id, videoElement);
      });

      videosContainer.appendChild(videoElement);
    });

    // Re-initialize dynamic Lucide icons
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  // Toggle Video Selection
  function toggleVideoSelection(id, element) {
    if (selectedVideoIds.has(id)) {
      selectedVideoIds.delete(id);
      element.classList.remove('selected');
    } else {
      selectedVideoIds.add(id);
      element.classList.add('selected');
    }
    updateSelectionStats();
  }

  // Update selection counters in toolbar
  function updateSelectionStats() {
    if (!playlistData) return;
    selectedCountSpan.textContent = selectedVideoIds.size;
    totalCountSpan.textContent = playlistData.videos.length;
  }

  // Search input event
  videoSearch.addEventListener('input', (e) => {
    searchFilterQuery = e.target.value;
    renderVideosList();
  });

  // Select all (only matches search or all)
  btnSelectAll.addEventListener('click', () => {
    if (!playlistData) return;
    playlistData.videos.forEach(video => {
      // Add all to selection
      selectedVideoIds.add(video.id);
    });
    renderVideosList();
    updateSelectionStats();
    showToast('✅ 已選取所有影片', 'success');
  });

  // Select none
  btnSelectNone.addEventListener('click', () => {
    selectedVideoIds.clear();
    renderVideosList();
    updateSelectionStats();
    showToast('⏹️ 已清除選取', 'success');
  });

  // Copy selected button handler
  btnCopySelected.addEventListener('click', () => {
    if (selectedVideoIds.size === 0) {
      showToast('⚠️ 請先選取至少一部影片！', 'error');
      return;
    }

    const formattedText = generateExportText();
    copyToClipboard(formattedText);
    showToast(`📋 已成功複製 ${selectedVideoIds.size} 部影片資訊！`, 'success');
  });

  // Download TXT file handler
  btnDownloadTxt.addEventListener('click', () => {
    if (selectedVideoIds.size === 0) {
      showToast('⚠️ 請先選取至少一部影片！', 'error');
      return;
    }

    const formattedText = generateExportText();
    const activeFormat = document.querySelector('input[name="export-format"]:checked').value;
    let mimeType = 'text/plain';
    let fileExtension = 'txt';

    if (activeFormat === 'json') {
      mimeType = 'application/json';
      fileExtension = 'json';
    } else if (activeFormat === 'markdown') {
      fileExtension = 'md';
    }

    const blob = new Blob([formattedText], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Create clean filename based on playlist title
    const safeTitle = playlistData.title.replace(/[/\\?%*:|"<>]/g, '-');
    link.href = url;
    link.setAttribute('download', `${safeTitle}_links.${fileExtension}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 檔案開始下載！', 'success');
  });

  // Generate string output based on selected videos and active format
  function generateExportText() {
    const activeFormat = document.querySelector('input[name="export-format"]:checked').value;
    
    // Filter out videos that are actually selected
    const selectedVideos = playlistData.videos.filter(video => selectedVideoIds.has(video.id));

    switch (activeFormat) {
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
  }

  // Clipboard copy function
  function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed'; // Avoid scrolling to bottom
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback clipboard copy failed: ', err);
    }
    document.body.removeChild(textarea);
  }

  // Toast System
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-circle';

    toast.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Auto remove toast after 3 seconds (matching CSS animation time)
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // Toggle visible elements
  function showLoading(show) {
    if (show) {
      loadingState.classList.remove('hidden');
      submitBtn.disabled = true;
      submitBtn.querySelector('span').textContent = '讀取中...';
    } else {
      loadingState.classList.add('hidden');
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = '擷取清單';
    }
  }

  function showError(msg) {
    if (msg) {
      errorTextSpan.textContent = msg;
      errorMessageDiv.classList.remove('hidden');
    } else {
      errorTextSpan.textContent = '';
      errorMessageDiv.classList.add('hidden');
    }
  }

  // Helper function to escape HTML special characters
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
