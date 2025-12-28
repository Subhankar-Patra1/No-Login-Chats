import { useState, useEffect } from 'react';

/**
 * Spotify inline preview component
 * WhatsApp-style: Shows album art on right, expands to embed player on click
 */
export default function SpotifyPreview({ url }) {
    const [metadata, setMetadata] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showEmbed, setShowEmbed] = useState(false);
    const [error, setError] = useState(false);

    // Extract Spotify info from URL
    const spotifyInfo = extractSpotifyInfo(url);

    useEffect(() => {
        if (!spotifyInfo) {
            setIsLoading(false);
            return;
        }

        const fetchMetadata = async () => {
            try {
                const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch Spotify metadata');
                }
                
                const data = await response.json();
                setMetadata({
                    title: data.title,
                    thumbnail: data.thumbnail_url,
                    provider: data.provider_name
                });
            } catch (err) {
                console.error('Spotify preview error:', err);
                setError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMetadata();
    }, [url, spotifyInfo?.id]);

    if (!spotifyInfo || error) return null;

    // Generate embed URL
    const embedUrl = `https://open.spotify.com/embed/${spotifyInfo.type}/${spotifyInfo.id}?utm_source=generator&theme=0`;

    // If showing embed, show full player
    if (showEmbed) {
        return (
            <div className="-mx-2 -mb-1 mt-2 rounded-lg overflow-hidden bg-slate-800/80 min-w-[280px] sm:min-w-[320px]">
                <iframe
                    src={embedUrl}
                    width="100%"
                    height={spotifyInfo.type === 'track' ? 152 : 352}
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                />
                {/* Close button */}
                <button 
                    onClick={() => setShowEmbed(false)}
                    className="w-full py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors flex items-center justify-center gap-1"
                >
                    <span className="material-symbols-outlined text-sm">close</span>
                    Close player
                </button>
            </div>
        );
    }

    // Compact preview (WhatsApp style) - thumbnail on right
    return (
        <div 
            className="-mx-2 -mb-1 mt-2 rounded-lg overflow-hidden bg-slate-800/60 cursor-pointer hover:bg-slate-700/60 transition-colors border border-slate-700/30"
            onClick={() => setShowEmbed(true)}
        >
            <div className="flex items-center gap-3 p-2">
                {/* Left: Title & Spotify branding */}
                <div className="flex-1 min-w-0">
                    {isLoading ? (
                        <div className="animate-pulse">
                            <div className="h-3 bg-slate-700 rounded w-3/4 mb-1.5"></div>
                            <div className="h-2.5 bg-slate-700 rounded w-1/2"></div>
                        </div>
                    ) : (
                        <>
                            <h4 className="text-white font-medium text-xs line-clamp-2 leading-snug">
                                {metadata?.title || 'Spotify'}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1">
                                <svg className="w-3 h-3 text-[#1DB954] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                                </svg>
                                <span className="text-[10px] text-slate-400 capitalize">
                                    {spotifyInfo.type}
                                </span>
                            </div>
                        </>
                    )}
                </div>
                
                {/* Right: Album art with play overlay */}
                <div className="relative w-14 h-14 rounded-md overflow-hidden shrink-0 group/thumb bg-slate-700">
                    {metadata?.thumbnail ? (
                        <img 
                            src={metadata.thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                            </svg>
                        </div>
                    )}
                    {/* Play icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover/thumb:bg-black/50 transition-colors">
                        <div className="w-7 h-7 rounded-full bg-[#1DB954] flex items-center justify-center shadow-md">
                            <svg className="w-3.5 h-3.5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Extract Spotify info from URL
 */
function extractSpotifyInfo(url) {
    if (!url) return null;
    
    const match = url.match(/open\.spotify\.com\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/i);
    
    if (match) {
        return {
            type: match[1],
            id: match[2],
            url: url
        };
    }
    
    return null;
}

// Export helper
export { extractSpotifyInfo };
