import React from 'react';

const StatusDot = ({ online }) => {
    return (
        <span
            className={`absolute bottom-[-2px] right-[-2px] w-[10px] h-[10px] rounded-full border-2 border-[#0b1220] ${
                online
                    ? 'bg-[#2ee6a6] shadow-[0_0_6px_rgba(46,230,166,0.28)] animate-pulse'
                    : 'bg-[#5b6470] opacity-90'
            }`}
             style={online ? { animation: 'pulse 1.6s infinite' } : {}}
        />
    );
};

export default StatusDot;
