// Pure Client-side YouTube Scraper using CORS Proxy

// Parse URL or ID
export const parsePlaylistId = (playlistUrlOrId) => {
  let playlistId = playlistUrlOrId.trim();
  if (playlistId.includes('list=')) {
    const match = playlistId.match(/[&?]list=([^&]+)/);
    if (match) {
      playlistId = match[1];
    }
  }
  return playlistId;
};

// Validate playlist ID
export const validatePlaylistId = (playlistId) => {
  return /^[A-Za-z0-9_-]{10,56}$/.test(playlistId);
};

// Helper: Recursively extract videos from YouTube's initial data JSON
function extractVideosFromJSON(obj) {
  let videos = [];
  if (!obj) return videos;

  // New layout structure (lockupViewModel)
  if (obj.lockupViewModel) {
    try {
      const lockup = obj.lockupViewModel;
      const metadata = lockup.metadata?.lockupMetadataViewModel;
      const title = metadata?.title?.content;
      const videoId = lockup.rendererContext?.commandContext?.onTap?.innertubeCommand?.watchEndpoint?.videoId;

      if (title && videoId) {
        let duration = '';
        const overlays = lockup.contentImage?.thumbnailViewModel?.overlays || [];
        overlays.forEach(overlay => {
          if (overlay.thumbnailBottomOverlayViewModel?.badges) {
            overlay.thumbnailBottomOverlayViewModel.badges.forEach(badge => {
              if (badge.thumbnailBadgeViewModel?.text) {
                duration = badge.thumbnailBadgeViewModel.text;
              }
            });
          }
        });

        let author = '';
        const rows = metadata.metadata?.contentMetadataViewModel?.metadataRows || [];
        if (rows.length > 0 && rows[0].metadataParts?.length > 0) {
          author = rows[0].metadataParts[0].text?.content || '';
        }

        const sources = lockup.contentImage?.thumbnailViewModel?.image?.sources || [];
        const thumbnail = sources.length > 0 ? sources[sources.length - 1].url : null;

        videos.push({
          id: videoId,
          title,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail,
          duration: duration || '00:00',
          author
        });
      }
    } catch (e) {
      // Ignore parse error for individual items
    }
  }

  // Old layout structure fallback (playlistVideoRenderer)
  if (obj.playlistVideoRenderer) {
    try {
      const renderer = obj.playlistVideoRenderer;
      const videoId = renderer.videoId;
      const title = renderer.title?.runs?.[0]?.text || renderer.title?.simpleText;
      if (videoId && title) {
        const duration = renderer.lengthText?.simpleText || '00:00';
        const author = renderer.shortBylineText?.runs?.[0]?.text || '';
        const sources = renderer.thumbnail?.thumbnails || [];
        const thumbnail = sources.length > 0 ? sources[sources.length - 1].url : null;

        videos.push({
          id: videoId,
          title,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail,
          duration,
          author
        });
      }
    } catch (e) {
      // Ignore
    }
  }

  // Recurse into array or object properties
  if (Array.isArray(obj)) {
    for (const item of obj) {
      videos = videos.concat(extractVideosFromJSON(item));
    }
  } else if (typeof obj === 'object') {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        videos = videos.concat(extractVideosFromJSON(obj[key]));
      }
    }
  }

  return videos;
}

export const CUSTOM_PROXY_KEY = 'youtube_custom_proxy';

export const getCustomProxy = () => {
  return localStorage.getItem(CUSTOM_PROXY_KEY) || '';
};

export const setCustomProxy = (url) => {
  if (!url || !url.trim()) {
    localStorage.removeItem(CUSTOM_PROXY_KEY);
  } else {
    let clean = url.trim().replace(/\/+$/, '');
    localStorage.setItem(CUSTOM_PROXY_KEY, clean);
  }
};

export const testProxyConnection = async (customProxyUrl) => {
  let target = (customProxyUrl || getCustomProxy()).trim().replace(/\/+$/, '');
  if (!target) {
    return { success: false, message: '請輸入有效的 Cloudflare Worker 代理網址' };
  }
  if (!target.startsWith('http://') && !target.startsWith('https://')) {
    target = 'https://' + target;
  }

  // Ping test
  const testUrl = 'https://www.google.com';
  const proxyUrl = `${target}?url=${encodeURIComponent(testUrl)}`;
  const startTime = performance.now();

  try {
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(7000) });
    const latency = Math.round(performance.now() - startTime);
    if (!res.ok) {
      return { success: false, latency, message: `伺服器回應代碼: ${res.status}` };
    }
    return { success: true, latency, message: `連線正常 (${latency}ms)` };
  } catch (err) {
    const latency = Math.round(performance.now() - startTime);
    if (err.name === 'TimeoutError') {
      return { success: false, latency, message: '連線逾時 (超過 7 秒)' };
    }
    return { success: false, latency, message: err.message || '連線失敗，請檢查網址與 CORS 白名單' };
  }
};

// Main scrape function
export const scrapePlaylist = async (playlistUrlOrId) => {
  const playlistId = parsePlaylistId(playlistUrlOrId);
  if (!validatePlaylistId(playlistId)) {
    throw new Error('無效的 YouTube 播放清單格式，請確認您貼入的網址包含正確的播放清單 ID (list=)。');
  }

  const targetUrl = `https://www.youtube.com/playlist?list=${playlistId}&hl=zh-TW`;

  // Custom Worker proxy fetcher
  const fetchThroughCustomWorker = async (url, workerUrl) => {
    let baseUrl = workerUrl.trim().replace(/\/+$/, '');
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }
    const proxyUrl = `${baseUrl}?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`專屬代理伺服器回應 ${res.status}`);
    return await res.text();
  };

  // Define fallback public proxies
  const fetchThroughAllOrigins = async (url) => {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`AllOrigins 回傳錯誤 ${res.status}`);
    const data = await res.json();
    return data.contents;
  };

  const fetchThroughCorsProxyIo = async (url) => {
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`Corsproxy.io 回傳錯誤 ${res.status}`);
    return await res.text();
  };

  let html = null;
  let errors = [];
  const customProxy = getCustomProxy();

  // 1. If custom Cloudflare Worker proxy configured, try it first
  if (customProxy) {
    try {
      console.log('[Scraper] Fetching via Custom Cloudflare Worker Proxy...');
      html = await fetchThroughCustomWorker(targetUrl, customProxy);
    } catch (err) {
      console.warn('[Scraper] Custom Worker failed, falling back to public proxies:', err.message);
      errors.push(`專屬 Cloudflare 代理: ${err.message}`);
    }
  }

  // 2. If no custom proxy or custom proxy failed, try AllOrigins
  if (!html) {
    try {
      console.log('[Scraper] Fetching via AllOrigins...');
      html = await fetchThroughAllOrigins(targetUrl);
    } catch (err) {
      console.warn('[Scraper] AllOrigins failed:', err.message);
      errors.push(`AllOrigins: ${err.message}`);
    }
  }

  // 3. Fallback to CorsProxy.io
  if (!html) {
    try {
      console.log('[Scraper] Fetching via CorsProxy.io...');
      html = await fetchThroughCorsProxyIo(targetUrl);
    } catch (err) {
      console.warn('[Scraper] CorsProxy.io failed:', err.message);
      errors.push(`CorsProxy.io: ${err.message}`);
    }
  }

  if (!html) {
    throw new Error(`無法擷取播放清單內容。已嘗試所有可用代理伺服器均失敗：\n${errors.join('\n')}\n建議配置專屬 Cloudflare Worker 代理以獲取最佳穩定度。`);
  }

  // Extract ytInitialData
  const regex = /ytInitialData\s*=\s*({.+?});/;
  const match = html.match(regex);

  if (!match) {
    throw new Error('無法從網頁內容中擷取播放清單資料。該清單可能是私人清單、已被刪除，或是 YouTube 觸發了安全驗證。');
  }

  let ytInitialData;
  try {
    ytInitialData = JSON.parse(match[1]);
  } catch (err) {
    throw new Error('解析 YouTube 初始資料失敗，可能結構已變更。');
  }

  // Extract basic metadata
  const playlistMeta = ytInitialData.metadata?.playlistMetadataRenderer || {};
  const title = playlistMeta.title || '無標題播放清單';
  const description = playlistMeta.description || '';

  // Extract Channel Name
  let authorName = '未知創作者';
  try {
    const sidebarItems = ytInitialData.sidebar?.playlistSidebarRenderer?.items || [];
    const secondaryInfo = sidebarItems.find(item => item.playlistSidebarSecondaryInfoRenderer);
    if (secondaryInfo) {
      authorName = secondaryInfo.playlistSidebarSecondaryInfoRenderer.videoOwner?.videoOwnerRenderer?.title?.runs?.[0]?.text || authorName;
    }
  } catch (e) {
    console.warn('Could not extract playlist author name', e.message);
  }

  // Extract Videos
  const allVideos = extractVideosFromJSON(ytInitialData);

  // Filter duplicates
  const uniqueVideos = [];
  const seenIds = new Set();
  for (const v of allVideos) {
    if (!seenIds.has(v.id)) {
      seenIds.add(v.id);
      uniqueVideos.push(v);
    }
  }

  if (uniqueVideos.length === 0) {
    throw new Error('此播放清單中未找到任何影片。請確認該清單為公開狀態且包含有效影片。');
  }

  // Determine cover thumbnail
  let thumbnail = null;
  try {
    const sidebarItems = ytInitialData.sidebar?.playlistSidebarRenderer?.items || [];
    const primaryInfo = sidebarItems.find(item => item.playlistSidebarPrimaryInfoRenderer);
    if (primaryInfo) {
      const thumbRenderer = primaryInfo.playlistSidebarPrimaryInfoRenderer.thumbnailRenderer;
      const thumbnails = thumbRenderer?.playlistVideoThumbnailRenderer?.thumbnail?.thumbnails ||
        thumbRenderer?.playlistCustomThumbnailRenderer?.thumbnail?.thumbnails || [];
      if (thumbnails.length > 0) {
        thumbnail = thumbnails[thumbnails.length - 1].url;
      }
    }
  } catch (e) {
    console.warn('Could not extract playlist cover thumbnail', e.message);
  }

  if (!thumbnail && uniqueVideos.length > 0) {
    thumbnail = uniqueVideos[0].thumbnail;
  }

  return {
    title,
    description,
    id: playlistId,
    url: `https://www.youtube.com/playlist?list=${playlistId}`,
    videoCount: uniqueVideos.length,
    author: { name: authorName },
    thumbnail,
    videos: uniqueVideos
  };
};
