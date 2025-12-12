import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

const AiChatContext = createContext();

export function useAiChat() {
    return useContext(AiChatContext);
}

export function AiChatProvider({ children, socket }) {
    const { token, user } = useAuth();
    // [FIX] Add ref to track cancelled operations to ignore their late socket events
    const cancelledOpIds = useRef(new Set());
    
    // State shape: { [roomId]: { messages: [], isAiThinking: false, currentAiOp: null } }
    const [chats, setChats] = useState(() => {
        try {
            const saved = localStorage.getItem('sparkle_ai_chats');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error("Failed to load AI chats:", e);
            return {};
        }
    });

    // Save to local storage whenever chats change
    useEffect(() => {
        try {
            // We only want to save messages, not necessarily the 'isAiThinking' ephemeral state if we can help it, 
            // but saving everything is easier for restoring specific states. 
            // However, 'currentAiOp' (streaming) might break if we try to resume a stream that's dead.
            // So we should clean ephemeral states before saving.
            const serializableChats = Object.entries(chats).reduce((acc, [roomId, chat]) => {
                acc[roomId] = {
                    ...chat,
                    isAiThinking: false, // Reset thinking on reload
                    currentAiOp: null    // Reset streaming on reload
                    // messages are kept
                };
                return acc;
            }, {});
            localStorage.setItem('sparkle_ai_chats', JSON.stringify(serializableChats));
        } catch (e) {
            console.error("Failed to save AI chats:", e);
        }
    }, [chats]);


    // Helper to get chat state safely
    const getChatState = useCallback((roomId) => {
        return chats[roomId] || { messages: [], isAiThinking: false, currentAiOp: null, insertIndex: -1 };
    }, [chats]);

    // Register a room to ensure it exists in state
    const registerRoom = useCallback((roomId, initialMessages = []) => {
        setChats(prev => {
            if (prev[roomId]) return prev; // Already exists
            return {
                ...prev,
                [roomId]: {
                    messages: initialMessages,
                    isAiThinking: false,
                    currentAiOp: null,
                    insertIndex: -1
                }
            };
        });
    }, []);

    // Socket Event Handlers
    useEffect(() => {
        if (!socket) return;

        const handleAiPartial = ({ operationId, chunk, roomId }) => {
            // [FIX] Ignore checking if this op was cancelled locally
            if (cancelledOpIds.current.has(operationId)) return;

            // NOTE: The backend needs to send roomId with ai:partial events for this to work globally!
            // If the backend DOES NOT send roomId, we might have a problem if we are not "in" the room.
            // However, typically `join_room` is enough for the socket to receive it.
            // Let's assume for now we might need to rely on the current active room if roomId isn't present,
            // BUT given we want background processing, the event SHOULD probably carry the roomId or we check which chat matches the op?
            // Actually, `currentAiOp` is stored in state. We can search for the opId.
            
            setChats(prevChats => {
                let targetRoomId = roomId;

                // If no roomId in event, find which room has this operation (or is thinking)
                // This is a bit inefficient but safe
                if (!targetRoomId) {
                    for (const [rId, state] of Object.entries(prevChats)) {
                         if (state.currentAiOp?.id === operationId || state.isAiThinking) { // isAiThinking is less specific
                             targetRoomId = rId;
                             break;
                         }
                    }
                }

                if (!targetRoomId || !prevChats[targetRoomId]) return prevChats;

                const chat = prevChats[targetRoomId];
                
                // Stop thinking skeleton once we get data
                const isAiThinking = false;
                
                let newOp = chat.currentAiOp;

                // First chunk or new op
                if (!newOp || newOp.id !== operationId) {
                     // Mark user message as seen
                     const msgs = chat.messages;
                     const lastUserMsgIndex = msgs.findLastIndex(m => m.user_id === user?.id);
                     let newMessages = msgs;
                     
                     if (lastUserMsgIndex !== -1 && msgs[lastUserMsgIndex].status !== 'seen') {
                         newMessages = [...msgs];
                         newMessages[lastUserMsgIndex] = { ...newMessages[lastUserMsgIndex], status: 'seen' };
                     }

                     return {
                         ...prevChats,
                         [targetRoomId]: {
                             ...chat,
                             messages: newMessages,
                             isAiThinking: false,
                             currentAiOp: { id: operationId, content: chunk, isStreaming: true }
                         }
                     };
                }

                // Append chunk
                return {
                    ...prevChats,
                    [targetRoomId]: {
                        ...chat,
                        isAiThinking: false,
                        currentAiOp: { ...newOp, content: newOp.content + chunk }
                    }
                };
            });
        };

        const handleAiDone = ({ operationId, savedMessageId, roomId }) => {
             // [FIX] Ignore if cancelled
             if (cancelledOpIds.current.has(operationId)) {
                 // Clean up the set to avoid memory leaks over time?
                 // Or keep it for session duration. Session duration is fine.
                 return;
             }

             setChats(prevChats => {
                let targetRoomId = roomId;
                if (!targetRoomId) {
                    for (const [rId, state] of Object.entries(prevChats)) {
                         if (state.currentAiOp?.id === operationId) {
                             targetRoomId = rId;
                             break;
                         }
                    }
                }
                if (!targetRoomId || !prevChats[targetRoomId]) return prevChats;

                return {
                    ...prevChats,
                    [targetRoomId]: {
                        ...prevChats[targetRoomId],
                        currentAiOp: null,
                        isAiThinking: false
                    }
                };
             });
        };

        const handleAiError = ({ operationId, error, cancelled, roomId }) => {
            // [FIX] Ignore if cancelled locally (we already handled visual cancellation)
            if (cancelledOpIds.current.has(operationId)) return;

            setChats(prevChats => {
                let targetRoomId = roomId;
                 if (!targetRoomId) {
                    for (const [rId, state] of Object.entries(prevChats)) {
                         if (state.currentAiOp?.id === operationId || state.isAiThinking) {
                             targetRoomId = rId;
                             break;
                         }
                    }
                }
                if (!targetRoomId || !prevChats[targetRoomId]) return prevChats;

                const chat = prevChats[targetRoomId];
                let newMessages = chat.messages;

                if (!cancelled) {
                    const errorMsg = {
                        id: `error-${Date.now()}`,
                        room_id: targetRoomId,
                        user_id: 'ai-system',
                        type: 'system',
                        content: `Error: ${error}`,
                        created_at: new Date().toISOString()
                    };
                    newMessages = [...newMessages, errorMsg];
                }

                return {
                    ...prevChats,
                    [targetRoomId]: {
                        ...chat,
                        messages: newMessages,
                        currentAiOp: null,
                        isAiThinking: false,
                        insertIndex: -1
                    }
                };
            });
        };

        const handleNewMessage = (msg) => {
            setChats(prevChats => {
                const targetRoomId = msg.room_id;
                // Only care if we are tracking this room
                if (!prevChats[targetRoomId]) return prevChats;

                const chat = prevChats[targetRoomId];
                
                // Check if message already exists
                const existingMessageIndex = chat.messages.findIndex(m => m.id === msg.id);
                
                let newMessages = [...chat.messages];

                // [FIX] Extract msgOpId early for use in entire scope
                let msgOpId = msg.meta?.operationId;
                if (!msgOpId && typeof msg.meta === 'string') {
                    try { msgOpId = JSON.parse(msg.meta).operationId; } catch(e){}
                }

                if (existingMessageIndex !== -1) {
                    // [FIX] Update existing message (Upsert)
                    newMessages[existingMessageIndex] = msg;
                } else {
                    // [FIX] Smart Merge: Check if we have a locally cancelled/finalized message with the same operationId

                    if (msgOpId) {
                        // Find if we have a message with valid meta.operationId == msgOpId
                        const existingIdx = newMessages.findIndex(m => {
                            let mOpId = m.meta?.operationId;
                            if (!mOpId && typeof m.meta === 'string') {
                                try { mOpId = JSON.parse(m.meta).operationId; } catch(e){}
                            }
                            return mOpId === msgOpId;
                        });

                        if (existingIdx !== -1) {
                            // Found a match (likely our local placeholder)! Replace it.
                            newMessages[existingIdx] = msg;
                        } else if (chat.insertIndex > -1) {
                            // [NEW] Insert at specific index for regeneration
                            newMessages.splice(chat.insertIndex, 0, msg);
                        } else {
                            // Regular append logic
                            if (msg.tempId) {
                                const idx = newMessages.findIndex(m => m.id === msg.tempId);
                                if (idx !== -1) {
                                    newMessages[idx] = { ...msg, replyTo: newMessages[idx].replyTo };
                                } else {
                                    newMessages.push(msg);
                                }
                            } else {
                                newMessages.push(msg);
                            }
                        }
                    } else {
                         // Fallback for messages without opId
                         if (msg.tempId) {
                             const idx = newMessages.findIndex(m => m.id === msg.tempId);
                             if (idx !== -1) {
                                 newMessages[idx] = { ...msg, replyTo: newMessages[idx].replyTo };
                             } else {
                                 newMessages.push(msg);
                             }
                         } else {
                             newMessages.push(msg);
                         }
                    }
                }
                

                // [FIX] If this message completes the current AI op, clear the streaming state now to avoid duplication
                // THIS logic is less critical now if handled by ai:done cancellation, but good for safety
                let newCurrentAiOp = chat.currentAiOp;
                let newIsAiThinking = chat.isAiThinking;
                let newInsertIndex = chat.insertIndex;

                if (chat.currentAiOp && chat.currentAiOp.id === msgOpId && !cancelledOpIds.current.has(msgOpId)) {
                    newCurrentAiOp = null;
                    newIsAiThinking = false;
                    newInsertIndex = -1; // Reset insertion index
                }

                return {
                    ...prevChats,
                    [targetRoomId]: {
                        ...chat,
                        messages: newMessages,
                        currentAiOp: newCurrentAiOp,
                        isAiThinking: newIsAiThinking,
                        insertIndex: newInsertIndex
                    }
                };
            });
        };

        const handleChatCleared = ({ roomId }) => {
            setChats(prev => {
                if (!prev[roomId]) return prev;
                return {
                    ...prev,
                    [roomId]: {
                        ...prev[roomId],
                        messages: []
                    }
                };
            });
        };

        socket.on('ai:partial', handleAiPartial);
        socket.on('ai:done', handleAiDone);
        socket.on('ai:error', handleAiError);
        socket.on('new_message', handleNewMessage);
        socket.on('chat:cleared', handleChatCleared);

        return () => {
            socket.off('ai:partial', handleAiPartial);
            socket.off('ai:done', handleAiDone);
            socket.off('ai:error', handleAiError);
            socket.off('new_message', handleNewMessage);
            socket.off('chat:cleared', handleChatCleared);
        };
    }, [socket, user]);


    // Actions
    const sendQuery = async (roomId, content, replyToMsg) => {
        if (!user) return;
        
        const tempId = `temp-${Date.now()}`;
        const tempMsg = {
            id: tempId,
            room_id: roomId,
            user_id: user.id,
            content,
            replyTo: replyToMsg || null,
            created_at: new Date().toISOString(),
            username: user.username,
            display_name: user.display_name || 'Me',
            status: 'sending'
        };

        // Optimistic update
        setChats(prev => ({
            ...prev,
            [roomId]: {
                ...prev[roomId],
                messages: [...(prev[roomId]?.messages || []), tempMsg],
                isAiThinking: true,
                insertIndex: -1
            }
        }));

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/query`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({
                    roomId: roomId,
                    prompt: content
                })
            });
            
            if (!res.ok) throw new Error('AI Query failed');
            
            // Update temp message status to sent
            setChats(prev => {
                if (!prev[roomId]) return prev;
                return {
                    ...prev,
                    [roomId]: {
                         ...prev[roomId],
                         messages: prev[roomId].messages.map(m => m.id === tempId ? { ...m, status: 'sent' } : m)
                    }
                };
            });

        } catch (err) {
            console.error(err);
             setChats(prev => {
                if (!prev[roomId]) return prev;
                return {
                    ...prev,
                    [roomId]: {
                         ...prev[roomId],
                         messages: prev[roomId].messages.map(m => m.id === tempId ? { ...m, status: 'error' } : m),
                         isAiThinking: false
                    }
                };
            });
        }
    };

    const cancelAi = async (roomId) => {
        const chat = chats[roomId];
        if (!chat || !chat.currentAiOp) return;
        
        const opId = chat.currentAiOp.id;
        
        // [FIX] Add to cancelled set immediately
        cancelledOpIds.current.add(opId);

        // [FIX] Convert the streaming message to a permanent message LOCALLY immediately
        const finalizedMessage = {
            id: `local-cancelled-${opId}`, // Temporary ID, will be replaced by server message later via handleNewMessage
            room_id: roomId,
            user_id: 'ai-assistant',
            display_name: 'Sparkle AI', // We might want to get this from state but this is good default
            author_name: 'Assistant',
            content: chat.currentAiOp.content,
            created_at: new Date().toISOString(),
            type: 'text',
            avatar_thumb_url: null,
            meta: { ai: true, operationId: opId, cancelled: true } // IMPORTANT: Include opId for merging
        };

        setChats(prev => {
             if (!prev[roomId]) return prev;
             
             return {
                 ...prev,
                 [roomId]: {
                     ...prev[roomId],
                     messages: chat.insertIndex > -1 
                        ? [...prev[roomId].messages.slice(0, chat.insertIndex), finalizedMessage, ...prev[roomId].messages.slice(chat.insertIndex)]
                        : [...prev[roomId].messages, finalizedMessage],
                     currentAiOp: null, // Clear streaming
                     isAiThinking: false, // Clear thinking
                     insertIndex: -1
                 }
             };
        });

        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/ai/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ operationId: opId })
            });
            // We do not wait for socket return because we already finalized partially.
            // When server sends "new_message", it will replace our "local-cancelled" one due to opId match.
        } catch (e) {
            console.error(e);
        }
    };

    const clearAiChat = async (roomId, room) => {
        setChats(prev => {
             if (!prev[roomId]) return prev;
             return {
                 ...prev,
                 [roomId]: {
                     ...prev[roomId],
                     messages: []
                 }
             };
        });
        
        // Also call API
    };
    
    // We expose a setter for messages mostly for sync (like when loading initial)
    const setMessages = (roomId, newMessages) => {
         setChats(prev => ({
             ...prev,
             [roomId]: {
                 ...(prev[roomId] || { isAiThinking: false, currentAiOp: null }),
                 messages: newMessages
             }
         }));
    };
    
    const deleteMessageLocal = (roomId, messageId) => {
        setChats(prev => {
             if (!prev[roomId]) return prev;
             return {
                 ...prev,
                 [roomId]: {
                     ...prev[roomId],
                     messages: prev[roomId].messages.filter(m => m.id !== messageId)
                 }
             };
        });
    };

    const regenerate = async (roomId, prompt, insertIndex = -1, regenerateId = null) => {
        // Find if we are already thinking?
        setChats(prev => ({
            ...prev,
            [roomId]: {
                ...prev[roomId],
                isAiThinking: true,
                insertIndex: insertIndex // [NEW] Set insertion index
            }
        }));

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/query`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({
                    roomId: roomId,
                    prompt: prompt,
                    regenerateId: regenerateId
                })
            });
            
            if (!res.ok) throw new Error('AI Query failed');
            // Success - socket will handle rest
        } catch (err) {
            console.error(err);
             setChats(prev => ({
                ...prev,
                [roomId]: {
                     ...prev[roomId],
                     ...prev[roomId],
                     isAiThinking: false,
                     insertIndex: -1
                }
            }));
        }

    };

    // [NEW] Sync messages from server to ensure persistence state is loaded
    const syncMessages = useCallback(async (roomId, aiName = 'Sparkle AI') => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/rooms/${roomId}/messages`, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });
            if (res.ok) {
                const data = await res.json();
                
                // Normalize AI messages
                const normalizedData = data.map(m => {
                     // Check if it's an AI message
                     let isAi = m.author_name === 'Assistant';
                     if (!isAi && m.meta) {
                         try {
                             const meta = typeof m.meta === 'string' ? JSON.parse(m.meta) : m.meta;
                             if (meta.ai) isAi = true;
                         } catch (e) {}
                     }

                     if (isAi) {
                         return {
                             ...m,
                             user_id: 'ai-assistant', 
                             display_name: aiName,    
                             avatar_thumb_url: null   
                         };
                     }
                     return m;
                });

                setChats(prev => {
                     // Keep optimistic messages that are not in the new list?
                     const existing = prev[roomId]?.messages || [];
                     const pending = existing.filter(m => m.status === 'sending' || m.status === 'error');
                     
                     // Also AI logic might need to ensure we don't clear an active stream...
                     // But sync is usually initial. If active stream, we might have data in currentAiOp.
                     
                     return {
                         ...prev,
                         [roomId]: {
                             ...(prev[roomId] || { isAiThinking: false, currentAiOp: null }),
                             messages: [...normalizedData, ...pending]
                         }
                     };
                });
            }
        } catch (e) {
            console.error("Failed to sync messages:", e);
        }
    }, [token]);

    return (
        <AiChatContext.Provider value={{ 
            chats, 
            getChatState, 
            registerRoom, 
            sendQuery, 
            cancelAi,
            clearAiChat,
            setMessages,
            deleteMessageLocal,
            regenerate,
            syncMessages // [NEW] Expose sync
        }}>
            {children}
        </AiChatContext.Provider>
    );
}
