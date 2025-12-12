import React from 'react';

export default function AISendIcon({ className = "w-6 h-6" }) {
    return (
        <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            className={className}
        >
            <path 
                d="M2.01 21L23 12 2.01 3 2 10L17 12L2 14L2.01 21Z" 
                fill="currentColor"
            />
            <path 
                d="M19 19L20.5 22L22 19L25 17.5L22 16L20.5 13L19 16L16 17.5L19 19Z" 
                fill="currentColor"
                transform="translate(-4 -4) scale(0.8)" 
            />
             <defs>
                <linearGradient id="ai-sparkle" x1="16" y1="13" x2="25" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#e879f9" />
                    <stop offset="1" stopColor="#c026d3" />
                </linearGradient>
            </defs>
             {/* Small sparkle overlay */}
             <path 
                d="M20 16L21.2 18.4L23.6 19.6L21.2 20.8L20 23.2L18.8 20.8L16.4 19.6L18.8 18.4L20 16Z" 
                fill="white"
                className="drop-shadow-sm" 
            />
        </svg>
    );
}
