const express = require('express');
const axios = require('axios');
const router = express.Router();

const TENOR_KEY = process.env.TENOR_API_KEY;
const BASE_URL = process.env.TENOR_BASE_URL || 'https://tenor.googleapis.com/v2';

// Helper to format Tenor response
const formatResults = (results) => {
    return results.map(item => {
        const formats = item.media_formats;
        return {
            id: item.id,
            title: item.content_description,
            // Preview image (fallback to static)
            preview_url: formats.tinygifpreview?.url || formats.nanogifpreview?.url || formats.tinygif?.url || formats.nanogif?.url, 
            // Autoplay preview (MP4) for grid
            autoplay_url: formats.tinymp4?.url || formats.nanomp4?.url || formats.mp4?.url,
            // Full resolution: Prefer MP4 if available
            gif_url: formats.gif?.url,
            mp4_url: formats.mp4?.url,
            // Helper to decide what to send
            url: formats.mp4?.url || formats.gif?.url, 
            type: formats.mp4 ? 'mp4' : 'gif',
            width: formats.mp4?.dims?.[0] || formats.gif?.dims?.[0],
            height: formats.mp4?.dims?.[1] || formats.gif?.dims?.[1]
        };
    });
};

// GET /api/gifs/trending
router.get('/trending', async (req, res) => {
    try {
        const limit = req.query.limit || 24;
        const pos = req.query.pos;
        
        const params = {
            key: TENOR_KEY,
            limit,
            client_key: 'no_login_chat'
        };
        if (pos) params.pos = pos;

        const response = await axios.get(`${BASE_URL}/featured`, { params });

        console.log('Tenor /featured response status:', response.status);
        console.log('Tenor /featured results count:', response.data.results?.length);

        const data = response.data;
        res.json({
            results: formatResults(data.results),
            next: data.next
        });
    } catch (err) {
        console.error('Tenor Trending Error:', err.message);
        res.status(500).json({ error: `Failed to fetch trending GIFs: ${err.message}` });
    }
});

// GET /api/gifs/search
router.get('/search', async (req, res) => {
    try {
        const q = req.query.q;
        const limit = req.query.limit || 24;
        const pos = req.query.pos;

        if (!q) return res.status(400).json({ error: 'Query required' });

        const params = {
            key: TENOR_KEY,
            q,
            limit,
            client_key: 'no_login_chat'
        };
        if (pos) params.pos = pos;

        const response = await axios.get(`${BASE_URL}/search`, { params });

        const data = response.data;
        res.json({
            results: formatResults(data.results),
            next: data.next
        });
    } catch (err) {
        console.error('Tenor Search Error:', err.message);
        res.status(500).json({ error: `Failed to search GIFs: ${err.message}` });
    }
});

// GET /api/gifs/random ?? API docs say /posts?random=true doesn't exist in v2 exactly same way?
// V2 has /posts with random=true? Or just use search with random?
// Tenor v2 doesn't explicitly have a 'random' endpoint in the same way v1 did, but let's check.
// Actually, usually search with "q" and picking random might work, or there might be specific param.
// Prompt says: GET /api/gifs/random?q=...
// Let's just implement search with random ordering if possible, or just standard search.
// Tenor v2 has /search?q=...&random=true
router.get('/random', async (req, res) => {
    try {
        const q = req.query.q || 'funny';
        const limit = req.query.limit || 24;
        
        const response = await axios.get(`${BASE_URL}/search`, {
            params: {
                key: TENOR_KEY,
                q,
                limit,
                random: true,
                client_key: 'no_login_chat'
            }
        });

        res.json({
            results: formatResults(response.data.results),
            next: response.data.next
        });
    } catch (err) {
        console.error('Tenor Random Error:', err.message);
        res.status(500).json({ error: `Failed to fetch random GIFs: ${err.message}` });
    }
});

module.exports = router;
