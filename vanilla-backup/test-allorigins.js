async function testAllOrigins() {
  const playlistId = 'PLOUEfMAhuY-hEEDKbY9MOgIFswmOT-a9U';
  const youtubeUrl = `https://www.youtube.com/playlist?list=${playlistId}&hl=zh-TW`;
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(youtubeUrl)}`;

  console.log('Fetching through AllOrigins:', proxyUrl);
  try {
    const res = await fetch(proxyUrl);
    const data = await res.json();
    
    const html = data.contents;
    console.log('HTML retrieved length:', html ? html.length : 0);
    
    if (html && html.includes('ytInitialData')) {
      console.log('SUCCESS! Found ytInitialData in HTML via AllOrigins!');
      const match = html.match(/ytInitialData\s*=\s*({.+?});/);
      if (match) {
        const parsed = JSON.parse(match[1]);
        console.log('Parsed successfully! Playlist Title:', parsed.metadata?.playlistMetadataRenderer?.title);
      } else {
        console.log('Regex match failed, but string exists.');
      }
    } else {
      console.log('Failed: ytInitialData not found in response contents.');
    }
  } catch (err) {
    console.error('Error fetching via AllOrigins:', err);
  }
}

testAllOrigins();
