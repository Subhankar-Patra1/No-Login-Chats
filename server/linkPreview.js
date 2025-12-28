/**
 * Link Preview Module
 * Fetches metadata for Spotify and YouTube links
 */

// Regex patterns for detecting music links
const SPOTIFY_REGEX = /https?:\/\/open\.spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/i;
const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
const YOUTUBE_MUSIC_REGEX = /https?:\/\/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i;

/**
 * Detect if a message contains music links
 * @param {string} text - Message text
 * @returns {Object|null} - Link info or null
 */
function detectMusicLink(text) {
    // Check Spotify
    const spotifyMatch = text.match(SPOTIFY_REGEX);
    if (spotifyMatch) {
        return {
            platform: 'spotify',
            type: spotifyMatch[1], // track, album, playlist, artist
            id: spotifyMatch[2],
            url: spotifyMatch[0]
        };
    }

    // Check YouTube Music
    const ytMusicMatch = text.match(YOUTUBE_MUSIC_REGEX);
    if (ytMusicMatch) {
        return {
            platform: 'youtube',
            type: 'music',
            id: ytMusicMatch[1],
            url: ytMusicMatch[0]
        };
    }

    // Check YouTube
    const youtubeMatch = text.match(YOUTUBE_REGEX);
    if (youtubeMatch) {
        return {
            platform: 'youtube',
            type: 'video',
            id: youtubeMatch[1],
            url: youtubeMatch[0]
        };
    }

    return null;
}

/**
 * Fetch Spotify preview using oEmbed API
 * @param {string} url - Spotify URL
 * @returns {Object} - Preview data
 */
async function fetchSpotifyPreview(url) {
    try {
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
        const response = await fetch(oembedUrl);
        
        if (!response.ok) {
            throw new Error('Spotify oEmbed failed');
        }
        
        const data = await response.json();
        
        return {
            platform: 'spotify',
            title: data.title,
            thumbnail: data.thumbnail_url,
            html: data.html, // Embed iframe HTML
            provider: data.provider_name,
            url: url,
            embedUrl: url.replace('open.spotify.com', 'open.spotify.com/embed')
        };
    } catch (err) {
        console.error('Spotify preview error:', err);
        return null;
    }
}

/**
 * Fetch YouTube preview using oEmbed API
 * @param {string} videoId - YouTube video ID
 * @param {string} originalUrl - Original URL
 * @returns {Object} - Preview data
 */
async function fetchYouTubePreview(videoId, originalUrl) {
    try {
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;
        const response = await fetch(oembedUrl);
        
        if (!response.ok) {
            throw new Error('YouTube oEmbed failed');
        }
        
        const data = await response.json();
        
        return {
            platform: 'youtube',
            title: data.title,
            author: data.author_name,
            authorUrl: data.author_url,
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            thumbnailHigh: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            html: data.html,
            url: originalUrl,
            videoId: videoId,
            embedUrl: `https://www.youtube.com/embed/${videoId}`
        };
    } catch (err) {
        console.error('YouTube preview error:', err);
        // Return basic preview even if oEmbed fails
        return {
            platform: 'youtube',
            title: 'YouTube Video',
            thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            url: originalUrl,
            videoId: videoId,
            embedUrl: `https://www.youtube.com/embed/${videoId}`
        };
    }
}

/**
 * Get link preview for a message
 * @param {string} text - Message text
 * @returns {Object|null} - Preview data or null
 */
async function getLinkPreview(text) {
    const linkInfo = detectMusicLink(text);
    
    if (!linkInfo) {
        return null;
    }
    
    if (linkInfo.platform === 'spotify') {
        return await fetchSpotifyPreview(linkInfo.url);
    }
    
    if (linkInfo.platform === 'youtube') {
        return await fetchYouTubePreview(linkInfo.id, linkInfo.url);
    }
    
    return null;
}

module.exports = {
    detectMusicLink,
    fetchSpotifyPreview,
    fetchYouTubePreview,
    getLinkPreview,
    SPOTIFY_REGEX,
    YOUTUBE_REGEX
};
