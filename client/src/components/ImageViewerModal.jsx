import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext'; // [NEW]
import { renderTextWithEmojis } from '../utils/emojiRenderer';
import { linkifyText } from '../utils/linkify';

export default function ImageViewerModal({ images = [], startIndex = 0, onClose, onGoToMessage }) {
    const { token } = useAuth(); // [NEW] Use token
    // Normalize input to array
    const imageList = Array.isArray(images) ? images : [images];
    const initialIndex = Math.min(Math.max(0, startIndex), imageList.length - 1);

    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [scale, setScale] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    const currentImage = imageList[currentIndex];

    // Reset zoom on index change
    useEffect(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }, [currentIndex]);

    const handleWheel = (e) => {
        e.stopPropagation();
        setScale(prev => {
            const newScale = prev - e.deltaY * 0.001;
            return Math.min(Math.max(1, newScale), 5); // Limit zoom 1x to 5x
        });
    };

    const handleMouseDown = (e) => {
        if (scale > 1) {
            setIsDragging(true);
            setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging && scale > 1) {
            setPosition({
                x: e.clientX - startPos.x,
                y: e.clientY - startPos.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleNext = (e) => {
        e.stopPropagation();
        if (currentIndex < imageList.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrev = (e) => {
        e.stopPropagation();
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleDownload = async () => {
         try {
             const url = currentImage.src || currentImage.url;
             // Use Proxy to bypass CORS and force download
             const proxyUrl = `${import.meta.env.VITE_API_URL}/api/messages/proxy-download?url=${encodeURIComponent(url)}`;
             
             const response = await fetch(proxyUrl, {
                 headers: { Authorization: `Bearer ${token}` }
             });
             
             if (!response.ok) throw new Error('Proxy fetch failed');

             const blob = await response.blob();
             const blobUrl = window.URL.createObjectURL(blob);
             
             const a = document.createElement('a');
             a.href = blobUrl;
             // Filename from header or fallback
             const contentDisp = response.headers.get('Content-Disposition');
             let filename = `image-${currentIndex + 1}.png`;
             if (contentDisp && contentDisp.includes('filename=')) {
                 filename = contentDisp.split('filename=')[1].replace(/"/g, '');
             }
             
             a.download = filename;
             document.body.appendChild(a);
             a.click();
             document.body.removeChild(a);
             window.URL.revokeObjectURL(blobUrl);
         } catch (error) {
             console.error('Download failed:', error);
             // Fallback
             window.open(currentImage.src || currentImage.url, '_blank');
         }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') handleNext(e);
            if (e.key === 'ArrowLeft') handlePrev(e);
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, imageList.length]);

    if (!currentImage) return null;
    
    // Support object structure { src/url, alt/caption } or just string
    const imgSrc = currentImage.src || currentImage.url || currentImage;
    const imgAlt = currentImage.alt || currentImage.caption || "";

    return createPortal(
        <div 
            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200 select-none"
            onClick={onClose} 
        >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                 <div className="flex items-center gap-4 pointer-events-auto">
                     <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                     >
                         <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                     </button>
                     
                     {/* Sender Info - Only if available */}
                     {currentImage.senderName && (
                         <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700 border border-white/10">
                                 {currentImage.senderAvatar ? (
                                     <img src={currentImage.senderAvatar} alt={currentImage.senderName} className="w-full h-full object-cover" />
                                 ) : (
                                     <div className="w-full h-full flex items-center justify-center text-white font-medium text-sm">
                                         {currentImage.senderName[0]?.toUpperCase()}
                                     </div>
                                 )}
                             </div>
                             <div className="flex flex-col">
                                 <span className="text-white font-medium text-sm leading-tight flex items-center gap-1">
                                     {renderTextWithEmojis(currentImage.senderName)} 
                                     {currentImage.isMe && <span className="opacity-60 ml-0.5 mt-0.5 text-[10px]">(You)</span>}
                                 </span>
                                 <span className="text-white/60 text-xs">
                                     {new Date(currentImage.date).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                                 </span>
                             </div>
                         </div>
                     )}

                     {!currentImage.senderName && (
                         <span className="text-white/80 text-sm font-medium">
                            {currentIndex + 1} / {imageList.length}
                         </span>
                     )}
                 </div>

                 <div className="flex items-center gap-2 pointer-events-auto">
                     {/* Go to Message */}
                     {currentImage.messageId && onGoToMessage && (
                         <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onGoToMessage(currentImage.messageId);
                                onClose();
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors mr-2"
                            title="Go to Message"
                         >
                             <span className="material-symbols-outlined text-[20px]">chat</span>
                             <span className="text-xs font-medium hidden sm:inline">Show in Chat</span>
                         </button>
                     )}

                     <button
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            handleDownload();
                        }}
                        className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                        title="Download"
                     >
                         <span className="material-symbols-outlined text-[24px]">download</span>
                     </button>
                 </div>
            </div>

            {/* Navigation Buttons */}
            {imageList.length > 1 && (
                <>
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all z-50 pointer-events-auto ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    >
                        <span className="material-symbols-outlined text-[32px]">chevron_left</span>
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={currentIndex === imageList.length - 1}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all z-50 pointer-events-auto ${currentIndex === imageList.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    >
                        <span className="material-symbols-outlined text-[32px]">chevron_right</span>
                    </button>
                </>
            )}

            {/* Image Area */}
            <div 
                className="flex-1 flex items-center justify-center overflow-hidden w-full h-full relative"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <img 
                    src={imgSrc} 
                    alt={imgAlt} 
                    className="max-w-full max-h-full object-contain transition-transform duration-75 ease-linear origin-center"
                    style={{ 
                        transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                        cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                    }}
                    onClick={(e) => e.stopPropagation()} 
                />
            </div>

            {/* Caption Footer */}
            {imgAlt && (
                <div 
                    className="absolute bottom-0 left-0 right-0 p-6 bg-black/60 text-white text-center backdrop-blur-sm z-50 transition-opacity pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <p className="text-base font-medium whitespace-pre-wrap">
                        {linkifyText(imgAlt)}
                    </p>
                </div>
            )}
        </div>,
        document.body
    );
}
