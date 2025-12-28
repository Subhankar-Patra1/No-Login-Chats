import { useState, useEffect, useRef } from 'react';

/**
 * YouTube inline preview/embed component
 * WhatsApp-style: Shows small thumbnail on side, expands to full player on click
 */
export default function YouTubePreview({ url, videoId }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [metadata, setMetadata] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const iframeRef = useRef(null);

    // Extract video ID from URL if not provided
    const extractedId = videoId || extractYouTubeId(url);

    useEffect(() => {
        if (!extractedId) return;
        
        // Fetch metadata using noembed (free service, no API key needed)
        const fetchMetadata = async () => {
            try {
                const watchUrl = `https://www.youtube.com/watch?v=${extractedId}`;
                const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(watchUrl)}`);
                const data = await response.json();
                
                if (data.title) {
                    setMetadata({
                        title: data.title,
                        author: data.author_name,
                        thumbnail: `https://img.youtube.com/vi/${extractedId}/hqdefault.jpg`
                    });
                }
            } catch (err) {
                console.error('Failed to fetch YouTube metadata:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMetadata();
    }, [extractedId]);

    if (!extractedId) return null;

    const thumbnailUrl = `https://img.youtube.com/vi/${extractedId}/hqdefault.jpg`;

    // If playing, show full embed
    if (isPlaying) {
        return (
            <div className="-mx-2 -mb-1 mt-2 rounded-lg overflow-hidden bg-slate-800/80 min-w-[280px] sm:min-w-[320px]">
                <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                    <iframe
                        ref={iframeRef}
                        src={`https://www.youtube.com/embed/${extractedId}?autoplay=1&rel=0`}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="YouTube video player"
                    />
                </div>
                {/* Close button */}
                <button 
                    onClick={() => setIsPlaying(false)}
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
            onClick={() => setIsPlaying(true)}
        >
            <div className="flex items-center gap-3 p-2">
                {/* Left: Title & Author */}
                <div className="flex-1 min-w-0">
                    {isLoading ? (
                        <div className="animate-pulse">
                            <div className="h-3 bg-slate-700 rounded w-3/4 mb-1.5"></div>
                            <div className="h-2.5 bg-slate-700 rounded w-1/2"></div>
                        </div>
                    ) : (
                        <>
                            <h4 className="text-white font-medium text-xs line-clamp-2 leading-snug">
                                {metadata?.title || 'YouTube Video'}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1">
                                <svg className="w-3 h-3 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                </svg>
                                <span className="text-[10px] text-slate-400 truncate">
                                    {metadata?.author || 'YouTube'}
                                </span>
                            </div>
                        </>
                    )}
                </div>
                
                {/* Right: Thumbnail with play overlay */}
                <div className="relative w-20 h-14 rounded-md overflow-hidden shrink-0 group/thumb bg-slate-700">
                    <img 
                        src={thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.target.src = `https://img.youtube.com/vi/${extractedId}/mqdefault.jpg`;
                        }}
                    />
                    {/* Play icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/thumb:bg-black/40 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24" style={{ marginLeft: '2px' }}>
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
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeId(url) {
    if (!url) return null;
    
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/ // Just the ID
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    
    return null;
}

// Export helper
export { extractYouTubeId };
