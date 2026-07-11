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
      if (obj.hasOwnProperty(key)) {
        videos = videos.concat(extractVideosFromJSON(obj[key]));
      }
    }
  }

  return videos;
}

// Main scrape function
export const scrapePlaylist = async (playlistUrlOrId) => {
  const playlistId = parsePlaylistId(playlistUrlOrId);
  if (!validatePlaylistId(playlistId)) {
    throw new Error('無效的 YouTube 播放清單格式，請確認您貼入的網址包含正確的播放清單 ID (list=)。');
  }

  const targetUrl = `https://www.youtube.com/playlist?list=${playlistId}&hl=zh-TW`;

  // Define proxies to try sequentially
  const fetchThroughAllOrigins = async (url) => {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`AllOrigins 回傳錯誤 ${res.status}`);
    const data = await res.json();
    return data.contents;
  };

  const fetchThroughCorsProxyIo = async (url) => {
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`Corsproxy.io 回傳錯誤 ${res.status}`);
    return await res.text();
  };

  let html = null;
  let errors = [];

  // Try AllOrigins first
  try {
    console.log('[Scraper] Fetching via AllOrigins...');
    html = await fetchThroughAllOrigins(targetUrl);
  } catch (err) {
    console.warn('[Scraper] AllOrigins failed:', err.message);
    errors.push(`AllOrigins: ${err.message}`);
    
    // Try CorsProxy.io fallback
    try {
      console.log('[Scraper] Fetching via CorsProxy.io...');
      html = await fetchThroughCorsProxyIo(targetUrl);
    } catch (err2) {
      console.warn('[Scraper] CorsProxy.io failed:', err2.message);
      errors.push(`CorsProxy.io: ${err2.message}`);
    }
  }

  if (!html) {
    throw new Error(`無法擷取播放清單內容。已嘗試所有代理伺服器均失敗：\n${errors.join('\n')}`);
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
