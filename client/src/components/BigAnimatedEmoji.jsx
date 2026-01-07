import React, { useState, useRef, useEffect } from 'react';

// Global cache for static frames to avoid re-rendering canvases
const frameCache = new Map();

const BigAnimatedEmoji = ({ url, alt, size = 160, autoPlay = true }) => {
    const [error, setError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [staticFrame, setStaticFrame] = useState(() => frameCache.get(url) || null);
    const [isReady, setIsReady] = useState(() => frameCache.has(url));
    const timerRef = useRef(null);
    const [animKey, setAnimKey] = useState(0);

    const ANIMATION_DURATION = 3000; // Play for 3 seconds

    // Capture first frame
    useEffect(() => {
        if (frameCache.has(url)) {
            setStaticFrame(frameCache.get(url));
            setIsReady(true);
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                // Use a high resolution for the capture
                const captureSize = Math.max(img.naturalWidth, img.naturalHeight, size * 2);
                canvas.width = captureSize;
                canvas.height = captureSize;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, captureSize, captureSize);
                const dataUrl = canvas.toDataURL('image/png', 1.0);
                frameCache.set(url, dataUrl);
                setStaticFrame(dataUrl);
            } catch (e) {
                console.error("Failed to capture frame", e);
            } finally {
                setIsReady(true);
            }
        };
        img.onerror = () => {
            setError(true);
            setIsReady(true);
        };
        img.src = url;
    }, [url, size]);

    // Handle animation duration
    useEffect(() => {
        if (isPlaying) {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                setIsPlaying(false);
            }, ANIMATION_DURATION);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isPlaying, animKey]);

    const handleRestart = () => {
        // Preload the next animation frame to prevent flickering
        const nextAnimKey = animKey + 1;
        const nextUrl = `${url}${url.includes('?') ? '&' : '?'}anim=${nextAnimKey}`;
        
        const img = new Image();
        img.onload = () => {
            setAnimKey(nextAnimKey);
            setIsPlaying(true);
        };
        img.onerror = () => {
             // If preload fails, just try to play anyway
            setAnimKey(nextAnimKey);
            setIsPlaying(true);
        };
        img.src = nextUrl;
    };

    if (error) {
        const hex = Array.from(alt)
            .map(c => c.codePointAt(0).toString(16))
            .filter(h => h !== 'fe0f')
            .join('-');
        
        return (
            <img 
                src={`https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${hex}.png`}
                alt={alt}
                className="select-none drop-shadow-md object-contain"
                style={{ width: `${size}px`, height: `${size}px` }}
                draggable="false"
            />
        );
    }

    if (!isReady && isPlaying) {
        // Show animated while loading if possible, or nothing
        return (
            <img 
                src={url}
                alt={alt}
                className="select-none drop-shadow-md object-contain"
                style={{ width: `${size}px`, height: `${size}px` }}
                draggable="false"
            />
        );
    }

    return (
        <div 
            className="cursor-pointer select-none active:scale-95 transition-transform"
            style={{ width: `${size}px`, height: `${size}px` }}
            onClick={handleRestart}
            title="Click to play animation"
        >
            {isPlaying ? (
                <img 
                    key={animKey}
                    src={`${url}${url.includes('?') ? '&' : '?'}anim=${animKey}`}
                    alt={alt}
                    className="select-none drop-shadow-md object-contain"
                    style={{ width: `${size}px`, height: `${size}px` }}
                    draggable="false"
                    onError={() => setError(true)}
                />
            ) : (
                <img 
                    src={staticFrame || url}
                    alt={alt}
                    className="select-none drop-shadow-md object-contain"
                    style={{ width: `${size}px`, height: `${size}px` }}
                    draggable="false"
                />
            )}
        </div>
    );
};

export default BigAnimatedEmoji;
