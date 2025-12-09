import { useState, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useAuth } from '../context/AuthContext';

export default function ChatWindow({ socket, room, user, onBack, showGroupInfo, setShowGroupInfo }) {
    const { token } = useAuth();
    // [MODIFIED] Initialize with props instead of empty array
    const [messages, setMessages] = useState(room.initialMessages || []); 
    const [isExpired, setIsExpired] = useState(false);
    const [replyTo, setReplyTo] = useState(null); 
    // const [showInfoModal, setShowInfoModal] = useState(false); 

    const handleLeave = async () => {
        if (!confirm('Are you sure you want to leave this group?')) return;
        
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/${room.id}/leave`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            window.location.reload(); 
        } catch (err) {
            console.error(err);
        }
    };

    // [NEW] Update messages when room or initialMessages changes (forcing reset if room changes, though usually key change handles this)
    useEffect(() => {
        if (room.initialMessages) {
             setMessages(room.initialMessages);
        }
    }, [room.initialMessages]);


    useEffect(() => {
        if (!socket || !room) return;

        // Check expiry
        if (room.expires_at && new Date(room.expires_at) < new Date()) {
            setIsExpired(true);
        } else {
            setIsExpired(false);
        }

        // [REMOVED] Internal fetch logic - now handled by parent


        // Join room
        socket.emit('join_room', room.id);

        // Listen for messages
        const handleNewMessage = (msg) => {
            console.log('Received new_message:', msg, 'Current room:', room.id);
            // [MODIFIED] Robust comparison for room ID (string vs number)
            if (String(msg.room_id) === String(room.id)) {
                setMessages(prev => {
                    // [MODIFIED] Check for strict duplicates by ID first
                    // This handles the case where the sender receives their own message back from the server
                    if (prev.some(m => m.id === msg.id)) {
                        return prev;
                    }

                    // Hydrate msg if needed (for other users who get the message with just ID)
                    let processedMsg = { ...msg };
                    if (!processedMsg.replyTo && processedMsg.reply_to_message_id) {
                        const original = prev.find(m => m.id === processedMsg.reply_to_message_id);
                        if (original) {
                            const raw = original.content || "";
                            const normalized = raw.replace(/\s+/g, " ").trim();
                            const maxLen = 120;
                            const snippet = normalized.length > maxLen ? normalized.slice(0, maxLen) + "…" : normalized;
                            processedMsg.replyTo = {
                                id: original.id,
                                sender: original.display_name || original.username,
                                text: snippet,
                                type: original.type,
                                audio_duration_ms: original.audio_duration_ms
                            };
                        }
                    }

                    // Check for optimistic message to replace using tempId if available
                    let optimisticIndex = -1;

                    if (processedMsg.tempId) {
                         optimisticIndex = prev.findIndex(m => m.id === processedMsg.tempId);
                    } else {
                        // Fallback: match by content and user_id (reversed to find latest)
                        // [MODIFIED] Added timestamp check to be safer? No, rely on content/user for now as before.
                        const reversedIndex = [...prev].reverse().findIndex(m => 
                            m.status === 'sending' && 
                            m.content === processedMsg.content && 
                            m.user_id === processedMsg.user_id
                        );
                        if (reversedIndex !== -1) {
                            optimisticIndex = prev.length - 1 - reversedIndex;
                        }
                    }
                    
                    if (optimisticIndex !== -1) {
                        const newMsgs = [...prev];
                        // Preserve replyTo from the optimistic message if the server message doesn't have it
                        const preservedMsg = { 
                            ...processedMsg, 
                            replyTo: processedMsg.replyTo || prev[optimisticIndex].replyTo 
                        };
                        newMsgs[optimisticIndex] = preservedMsg; // Replace with real message
                        return newMsgs;
                    }
                    return [...prev, processedMsg];
                });
            } else {
                console.log('Message not for this room');
            }
        };

        const handleStatusUpdate = ({ messageIds, status, roomId }) => {
            if (roomId === room.id) {
                setMessages(prev => prev.map(msg => 
                    messageIds.includes(msg.id) ? { ...msg, status } : msg
                ));
            }
        };

        const handleMessageDeleted = ({ messageId, is_deleted_for_everyone, content }) => {
            setMessages(prev => prev.map(msg => 
                String(msg.id) === String(messageId) ? { ...msg, is_deleted_for_everyone: true, content: "" } : msg
            ));
        };

        socket.on('new_message', handleNewMessage);
        socket.on('messages_status_update', handleStatusUpdate);
        socket.on('message_deleted', handleMessageDeleted);

        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('messages_status_update', handleStatusUpdate);
            socket.off('message_deleted', handleMessageDeleted);
        };
    }, [socket, room, token]);

    const handleLocalDelete = (messageId) => {
        setMessages(prev => prev.filter(m => m.id !== messageId));
    };

    const handleSend = (content, replyToMsg) => { // [MODIFY] accept replyToMsg
        if (socket && !isExpired) {
            // Optimistic Update
            const tempId = `temp-${Date.now()}`;
            const tempMsg = {
                id: tempId,
                room_id: room.id,
                user_id: user.id,
                content,
                replyTo: replyToMsg || null, // [NEW] include replyTo
                created_at: new Date().toISOString(),
                username: user.username,
                display_name: user ? user.display_name : 'Me',
                status: 'sending'
            };
            setMessages(prev => [...prev, tempMsg]);
            
            socket.emit('send_message', { 
                roomId: room.id, 
                content,
                replyToMessageId: replyToMsg ? replyToMsg.id : null,
                tempId 
            });
            setReplyTo(null); // [NEW] Clear reply after sending
        }
    };

    const uploadAudioWithProgress = async (formData, tempId) => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${import.meta.env.VITE_API_URL}/api/messages/audio`);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = event.loaded / event.total;
                    setMessages(prev => prev.map(m => 
                        m.id === tempId ? { ...m, uploadProgress: percent } : m
                    ));
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error('Upload failed'));
                }
            };

            xhr.onerror = () => reject(new Error('Network error'));
            
            xhr.send(formData);
        });
    };

    const handleSendAudio = async (blob, durationMs, waveform, replyToMsg) => { // [MODIFIED] Helper function
        const tempId = `temp-${Date.now()}`;
        const tempMsg = {
            id: tempId,
            room_id: room.id,
            user_id: user.id,
            type: 'audio',
            content: null,
            audio_url: URL.createObjectURL(blob),
            audio_duration_ms: durationMs,
            audio_waveform: waveform,
            replyTo: replyToMsg || null,
            created_at: new Date().toISOString(),
            username: user.username,
            display_name: user ? user.display_name : 'Me',
            status: 'sending',
            uploadStatus: 'uploading',
            uploadProgress: 0,
            localBlob: blob // Save for retry
        };
        setMessages(prev => [...prev, tempMsg]);
        setReplyTo(null);

        const formData = new FormData();
        formData.append('audio', blob);
        formData.append('roomId', room.id);
        formData.append('durationMs', durationMs);
        formData.append('waveform', JSON.stringify(waveform));
        if (replyToMsg) formData.append('replyToMessageId', replyToMsg.id);
        formData.append('tempId', tempId);

        try {
            await uploadAudioWithProgress(formData, tempId);
            // Socket event will handle success replacement
        } catch (err) {
            console.error(err);
            setMessages(prev => prev.map(m => 
                m.id === tempId ? { ...m, uploadStatus: 'failed', status: 'error' } : m
            ));
        }
    };

    const handleRetryAudio = async (msg) => {
        if (!msg.localBlob) return; // Should have it
        
        // Reset to uploading state
        setMessages(prev => prev.map(m => 
            m.id === msg.id ? { ...m, uploadStatus: 'uploading', uploadProgress: 0, status: 'sending' } : m
        ));

        const formData = new FormData();
        formData.append('audio', msg.localBlob);
        formData.append('roomId', room.id);
        formData.append('durationMs', msg.audio_duration_ms);
        formData.append('waveform', JSON.stringify(msg.audio_waveform));
        if (msg.replyTo) formData.append('replyToMessageId', msg.replyTo.id);
        formData.append('tempId', msg.id); // Reuse tempId

        try {
            await uploadAudioWithProgress(formData, msg.id);
        } catch (err) {
            console.error(err);
            setMessages(prev => prev.map(m => 
                m.id === msg.id ? { ...m, uploadStatus: 'failed', status: 'error' } : m
            ));
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-900/20 via-slate-950 to-slate-950 pointer-events-none" />

            {/* Header */}
            <div className="p-4 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-md flex items-center gap-4 shadow-sm z-10">
                <button 
                    onClick={onBack}
                    className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>

                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 truncate">
                        {room.type === 'group' && (
                            <span className="material-symbols-outlined text-violet-400 shrink-0">tag</span>
                        )}
                        <span className="truncate">{room.name}</span>
                        {room.type === 'group' && (
                            <span className="text-xs bg-slate-800 px-2 py-1 rounded-md text-slate-400 font-mono border border-slate-700 ml-2 shrink-0">
                                {room.code}
                            </span>
                        )}
                    </h2>
                    {room.type === 'direct' && room.username && (
                        <p className="text-xs text-slate-400 font-medium truncate">
                            {room.username.startsWith('@') ? room.username : `@${room.username}`}
                        </p>
                    )}

                    {room.expires_at && (
                        <p className={`text-xs mt-0.5 flex items-center gap-1 ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}>
                            <span className="material-symbols-outlined text-[14px]">
                                {isExpired ? 'timer_off' : 'timer'}
                            </span>
                            {isExpired ? 'Expired' : `Expires: ${new Date(room.expires_at).toLocaleString()}`}
                        </p>
                    )}
                </div>

                {room.type === 'group' && (
                    <button 
                        onClick={() => setShowGroupInfo(true)}
                        className="p-2 text-slate-400 hover:text-white transition-all"
                    >
                        <span className="material-symbols-outlined">info</span>
                    </button>
                )}
            </div>

            <MessageList 
                messages={messages} 
                setMessages={setMessages} 
                currentUser={user} 
                roomId={room.id} 
                socket={socket} 
                onReply={setReplyTo} 
                onDelete={handleLocalDelete}
                onRetry={handleRetryAudio} // [NEW] Pass retry handler
            />
            
            <MessageInput 
                onSend={(content) => handleSend(content, replyTo)} 
                onSendAudio={(blob, duration, waveform) => handleSendAudio(blob, duration, waveform, replyTo)} // [MODIFIED] Use handler
                disabled={isExpired} 
                replyTo={replyTo}          
                setReplyTo={setReplyTo}    
            />


        </div>
    );
}
