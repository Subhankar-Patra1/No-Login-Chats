import React from 'react';

/**
 * Poll Icon - SVG icon for poll messages
 * Displays three horizontal bars of decreasing width with rounded ends
 */
export default function PollIcon({ className = "w-4 h-4", ...props }) {
    return (
        <svg 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            {/* Top bar - shortest */}
            <rect x="2" y="3" width="12" height="4" rx="2" ry="2" />
            {/* Middle bar - longest */}
            <rect x="2" y="10" width="20" height="4" rx="2" ry="2" />
            {/* Bottom bar - medium (just a pill/dot-like shape) */}
            <rect x="2" y="17" width="7" height="4" rx="2" ry="2" />
        </svg>
    );
}
