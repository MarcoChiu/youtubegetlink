const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

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

// API endpoint to fetch playlist
app.get('/api/playlist', async (req, res) => {
  const playlistUrlOrId = req.query.url;

  if (!playlistUrlOrId) {
    return res.status(400).json({ error: 'Please provide a YouTube playlist URL or ID.' });
  }

  try {
    let playlistId = playlistUrlOrId.trim();

    // Parse watch?v=...&list=... or playlist?list=...
    if (playlistId.includes('list=')) {
      const match = playlistId.match(/[&?]list=([^&]+)/);
      if (match) {
        playlistId = match[1];
      }
    }

    // Validate playlist ID format
    if (!/^[A-Za-z0-9_-]{10,56}$/.test(playlistId)) {
      return res.status(400).json({
        error: 'Invalid YouTube Playlist format. Make sure you pasted a valid URL containing a playlist ID.'
      });
    }

    const targetUrl = `https://www.youtube.com/playlist?list=${playlistId}&hl=zh-TW`;
    console.log(`[API] Scraping playlist URL: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (!response.ok) {
      throw new Error(`YouTube server returned status ${response.status}`);
    }

    const html = await response.text();

    // Extract ytInitialData
    const regex = /ytInitialData\s*=\s*({.+?});/;
    const match = html.match(regex);

    if (!match) {
      return res.status(404).json({
        error: 'Could not extract playlist data. The playlist may be private, deleted, or YouTube returned a validation screen.'
      });
    }

    const ytInitialData = JSON.parse(match[1]);

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
      return res.status(404).json({
        error: 'No videos found in this playlist. Verify it is public and contains active videos.'
      });
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

    // Fallback cover thumbnail to first video's thumbnail
    if (!thumbnail && uniqueVideos.length > 0) {
      thumbnail = uniqueVideos[0].thumbnail;
    }

    const responseData = {
      title,
      description,
      id: playlistId,
      url: `https://www.youtube.com/playlist?list=${playlistId}`,
      videoCount: uniqueVideos.length,
      author: { name: authorName },
      thumbnail,
      videos: uniqueVideos
    };

    return res.json(responseData);
  } catch (error) {
    console.error('Error fetching playlist:', error);
    return res.status(500).json({
      error: 'Failed to retrieve playlist details due to an internal server error.',
      details: error.message
    });
  }
});

// Fallback all non-API routes to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

