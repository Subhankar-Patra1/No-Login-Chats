import React, { useState, useRef, useEffect } from 'react';

// Global cache for static frames to avoid re-rendering canvases
const frameCache = new Map();

const BigAnimatedEmoji = ({ url, alt, size = 160, autoPlay = true }) => {
    const [error, setError] = useState(false);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [staticFrame, setStaticFrame] = useState(() => frameCache.get(url) || null);
    const timerRef = useRef(null);
    const [animKey, setAnimKey] = useState(0);
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    const ANIMATION_DURATION = 3000;

    // Capture first frame
    useEffect(() => {
        if (frameCache.has(url)) {
            setStaticFrame(frameCache.get(url));
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
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
                // Silently fail frame capture
            }
        };
        img.onerror = () => setError(true);
        img.src = url;
    }, [url, size]);

    // Handle animation lifecycle
    useEffect(() => {
        if (isPlaying) {
            setIsImageLoaded(false); // Reset load state for new animation
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
        setAnimKey(prev => prev + 1);
        setIsPlaying(true);
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

    return (
        <div 
            className="cursor-pointer select-none active:scale-95 transition-transform relative"
            style={{ width: `${size}px`, height: `${size}px` }}
            onClick={handleRestart}
            title="Click to play animation"
        >
            {/* Always show static frame or placeholder as background to prevent white flash */}
            <img 
                src={staticFrame || url}
                alt={alt}
                className="absolute inset-0 select-none drop-shadow-md object-contain"
                style={{ width: '100%', height: '100%' }}
                draggable="false"
            />

            {/* Overlay animated version when playing */}
            {isPlaying && (
                <img 
                    key={animKey}
                    src={`${url}${url.includes('?') ? '&' : '?'}anim=${animKey}`}
                    alt={alt}
                    className={`absolute inset-0 select-none drop-shadow-md object-contain transition-opacity duration-75 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    style={{ width: '100%', height: '100%' }}
                    draggable="false"
                    onLoad={() => setIsImageLoaded(true)}
                    onError={() => setError(true)}
                />
            )}
        </div>
    );
};

export default BigAnimatedEmoji;
