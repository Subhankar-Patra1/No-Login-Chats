const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

let IO = null;
let DB = null;
let REDIS = null;

// Env configuration
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.AI_MODEL || 'gpt-oss-120b'; // Fallback
const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS || '8192');
const TEMP = parseFloat(process.env.AI_TEMPERATURE || '0.2');
const RATE_LIMIT_MIN = parseInt(process.env.AI_RATE_LIMIT_PER_MIN || '6');
const RATE_LIMIT_DAILY = parseInt(process.env.AI_RATE_LIMIT_DAILY || '200');

// In-memory fallback if Redis fails/missing (though instructions rec Redis)
// For cancellation, we store abort controllers: operationId -> AbortController
const activeOperations = new Map();

function setupAI(app, io, db, redisClient) {
    IO = io;
    DB = db;
    REDIS = redisClient;

    // Routes
    app.post('/api/ai/query', handleQuery);
    app.post('/api/ai/cancel', handleCancel);
    app.get('/api/ai/session', handleGetSession);

    console.log('[AI] Service initialized with model:', MODEL);
}

async function handleGetSession(req, res) {
    let userId = null;
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) throw new Error('No token');
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
        userId = decoded.id;
    } catch (e) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Check if an AI session already exists for the user
        const existingSessionRes = await DB.query('SELECT room_id, ai_name FROM ai_sessions WHERE user_id = $1', [userId]);
        let roomId;
        let aiName = 'Sparkle AI';

        if (existingSessionRes.rows.length > 0) {
            roomId = existingSessionRes.rows[0].room_id;
            aiName = existingSessionRes.rows[0].ai_name || 'Sparkle AI';
            // [FIX] Ensure room is not hidden if user returns to it
            await DB.query('UPDATE room_members SET is_hidden = false WHERE room_id = $1 AND user_id = $2', [roomId, userId]);
        } else {
            // Create new if not exists
            roomId = await ensureAiRoom(userId);
        }
        
        res.json({ roomId, aiName });
    } catch (err) {
        console.error('[AI] Get session failed:', err);
        res.status(500).json({ error: 'Internal error' });
    }
}

// Ensure AI Room exists for user
async function ensureAiRoom(userId) {
    // Check cache/DB
    const res = await DB.query('SELECT room_id FROM ai_sessions WHERE user_id = $1', [userId]);
    if (res.rows.length > 0) {
        return res.rows[0].room_id;
    }

    // Create new room
    // 1. Create Room (private, system managed)
    const roomRes = await DB.query(`
        INSERT INTO rooms (name, type, created_by) 
        VALUES ($1, 'ai', $2) 
        RETURNING id
    `, ['AI Assistant', userId]);
    const roomId = roomRes.rows[0].id;

    // 2. Add user to room
    await DB.query(`
        INSERT INTO room_members (room_id, user_id, role) 
        VALUES ($1, $2, 'owner')
    `, [roomId, userId]);

    // 3. Create session map
    await DB.query(`
        INSERT INTO ai_sessions (user_id, room_id, ai_name) 
        VALUES ($1, $2, 'Sparkle AI')
    `, [userId, roomId]);

    // [FIX] Emit room_added so client updates list immediately
    if (IO) {
        IO.to(`user:${userId}`).emit('room_added', {
            id: roomId,
            name: 'Sparkle AI',
            type: 'ai',
            last_message: null,
            unread_count: 0,
            created_at: new Date().toISOString()
        });
    }

    return roomId;
}

// POST /api/ai/query
async function handleQuery(req, res) {
    // Auth Check
    let userId = null;
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) throw new Error('No token');
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
        userId = decoded.id;
    } catch (e) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, roomId: reqRoomId, regenerateId } = req.body; // [NEW] regenerateId
    
    // Rate Limit (Simple Redis implementation)
    // ... (skipping as per previous file)

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        return res.status(400).json({ error: 'Empty prompt' });
    }
    
    // Moderation (Basic)
    const blocked = ['nsfw', 'porn', 'sex', 'kill', 'suicide']; // simplified list
    if (blocked.some(w => prompt.toLowerCase().includes(w))) {
        return res.status(403).json({ error: 'Content policy violation' });
    }

    try {
        let roomId = reqRoomId;
        if (!roomId) {
            roomId = await ensureAiRoom(userId);
        }

        // Get current AI name
        const sessionRes = await DB.query('SELECT ai_name FROM ai_sessions WHERE user_id = $1', [userId]);
        const aiName = sessionRes.rows[0]?.ai_name || 'Sparkle AI';

        const operationId = uuidv4();
        const createdAt = new Date(); // [FIX] Use explicit Node time
        
        let userMsgId = null;

        if (!regenerateId) {
            // Save User Message (ONLY if not regenerating)
            const msgRes = await DB.query(`
                INSERT INTO messages (room_id, user_id, content, meta, created_at, status) 
                VALUES ($1, $2, $3, $4, $5, 'seen')
                RETURNING id, created_at
            `, [
                roomId, 
                userId, 
                prompt, 
                JSON.stringify({ is_prompt: true, operationId }),
                createdAt
            ]);

            userMsgId = msgRes.rows[0].id;
        }

        // Respond immediately
        res.json({ ok: true, operationId, roomId, userMessageId: userMsgId });

        // Start Background Generation
        generateResponse(userId, roomId, prompt, operationId, aiName, userMsgId, regenerateId); // [FIX] Pass regenerateId

    } catch (err) {
        console.error('[AI] Query failed:', err);
        if (!res.headersSent) res.status(500).json({ error: 'Internal error', details: err.message });
    }
}

async function handleCancel(req, res) {
    const { operationId } = req.body;
    if (activeOperations.has(operationId)) {
        const controller = activeOperations.get(operationId);
        controller.abort();
        activeOperations.delete(operationId);
        return res.json({ ok: true });
    }
    res.status(404).json({ error: 'Operation not found' });
}

async function generateResponse(userId, roomId, prompt, operationId, aiName, currentMsgId, regenerateId) {
    const abortController = new AbortController();
    activeOperations.set(operationId, abortController);

    let fullText = '';
    let tokensUsed = 0;

    try {
        // Emit partial to USER only
        const userSocket = `user:${userId}`;

        const systemPrompt = `You are ${aiName}, a helpful coding assistant. 
        If the user explicitly asks to change your name to something else (e.g. "Change your name to Jarvis"), 
        you MUST start your response with the tag <<NAME_CHANGE:NewName>> followed by your confirmation.
        Example: User: "Call yourself Jarvis" -> AI: "<<NAME_CHANGE:Jarvis>>Okay, I will call myself Jarvis from now on."
        Be concise and helpful.`;

        // [NEW] Fetch previous context
        let contextMessages = [];
        try {
            let cutoffDate = null;
            if (regenerateId) {
                 // Get the date of the message we are regenerating
                 const rRes = await DB.query('SELECT created_at FROM messages WHERE id = $1', [regenerateId]);
                 if (rRes.rows.length) cutoffDate = rRes.rows[0].created_at;
            }

            let query = `
                SELECT content, author_name, meta, user_id, created_at
                FROM messages
                WHERE room_id = $1 
                  AND (meta IS NULL OR meta::text NOT LIKE '%"cancelled":true%')
                  AND status != 'error'
            `;
            const params = [roomId];

            if (currentMsgId) {
                 query += ` AND id != $2`;
                 params.push(currentMsgId);
            }

            if (cutoffDate) {
                 query += ` AND created_at < $${params.length + 1}`;
                 params.push(cutoffDate);
            }

            query += ` ORDER BY created_at DESC LIMIT 20`;

            const historyRes = await DB.query(query, params);
            
            contextMessages = historyRes.rows.reverse().map(m => {
                let role = 'user';
                // Check if AI
                if (m.author_name === 'Assistant') {
                    role = 'assistant';
                } else if (m.meta) {
                    try {
                        const meta = typeof m.meta === 'string' ? JSON.parse(m.meta) : m.meta;
                        if (meta.ai) role = 'assistant';
                    } catch (e) {}
                }
                
                return { role, content: m.content };
            });
        } catch (e) {
            console.error("[AI] Failed to fetch history:", e);
        }

        const messages = [
            { role: 'system', content: systemPrompt },
            ...contextMessages,
            { role: 'user', content: prompt }
        ];

        const https = require('https');
        const agent = new https.Agent({ family: 4 });

        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: MODEL,
            messages: messages,
            stream: true,
            max_tokens: MAX_TOKENS,
            temperature: TEMP
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            signal: abortController.signal,
            responseType: 'stream',
            httpsAgent: agent
        });

        // Handle Stream
        const stream = response.data;
        
        let foundNameChange = false;
        let newAiName = null;

        stream.on('data', async (chunk) => {
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                if (line.includes('[DONE]')) return;
                if (line.startsWith('data: ')) {
                    try {
                        const json = JSON.parse(line.replace('data: ', ''));
                        const token = json.choices[0]?.delta?.content || '';
                        if (token) {
                            fullText += token;
                            tokensUsed++;

                            // Check for name change tag in the accumulating text
                            let textToEmit = token;
                            
                            if (!foundNameChange && fullText.includes('<<NAME_CHANGE:')) {
                                const match = fullText.match(/<<NAME_CHANGE:(.*?)>>/);
                                if (match) {
                                    foundNameChange = true;
                                    newAiName = match[1];
                                    
                                    // Remove tag from fullText
                                    fullText = fullText.replace(match[0], '');
                                    
                                    // Update DB
                                    await DB.query('UPDATE ai_sessions SET ai_name = $1 WHERE user_id = $2', [newAiName, userId]);
                                }
                            }
                            
                            IO.to(userSocket).emit('ai:partial', { operationId, chunk: token, roomId }); // [FIX] Ensure roomId is sent
                        }
                    } catch (e) {
                         // ignore parse errors
                    }
                }
            }
        });


        // Helper to save and finish
        const finishGeneration = async (isCancelled = false) => {
             activeOperations.delete(operationId);

             // Cleanup fullText (remove tag if present)
             if (fullText.includes('<<NAME_CHANGE:')) {
                 const match = fullText.match(/<<NAME_CHANGE:(.*?)>>/);
                 if (match) {
                     newAiName = match[1];
                     fullText = fullText.replace(match[0], '');
                     await DB.query('UPDATE ai_sessions SET ai_name = $1 WHERE user_id = $2', [newAiName, userId]);
                 }
             }

             if (fullText.trim()) {
                 const currentName = newAiName || aiName;
                 const meta = JSON.stringify({ ai: true, model: MODEL, operationId, cancelled: isCancelled });

                 let savedMsgId;
                 let savedCreatedAt;

                 if (regenerateId) {
                     // [FIX] Update existing message
                     const updateRes = await DB.query(`
                        UPDATE messages 
                        SET content = $1, meta = $2
                        WHERE id = $3
                        RETURNING id, created_at
                     `, [fullText, meta, regenerateId]);
                     
                     if (updateRes.rows.length > 0) {
                         savedMsgId = updateRes.rows[0].id;
                         savedCreatedAt = updateRes.rows[0].created_at;
                     }
                 } else {
                     const createdAt = new Date(); 
                     const saveRes = await DB.query(`
                        INSERT INTO messages (room_id, user_id, content, author_name, meta, created_at)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        RETURNING id, created_at
                     `, [
                        roomId,
                        userId, 
                        fullText, 
                        'Assistant', 
                        meta,
                        createdAt
                     ]);
                     
                     if (saveRes.rows.length > 0) {
                        savedMsgId = saveRes.rows[0].id;
                        savedCreatedAt = createdAt;
                     }
                 }
                 
                 if (savedMsgId) {
                    // Emit to ROOM
                    IO.to(`room:${roomId}`).emit('new_message', {
                        id: savedMsgId,
                        room_id: roomId,
                        user_id: userId, 
                        content: fullText,
                        author_name: 'Assistant',
                        display_name: currentName, 
                        created_at: new Date(savedCreatedAt).toISOString(),
                        ai: true,
                        meta: { ai: true, model: MODEL, operationId, cancelled: isCancelled } 
                    });

                    // Emit Done to USER
                    IO.to(userSocket).emit('ai:done', { operationId, savedMessageId: savedMsgId, cancelled: isCancelled, roomId });

                    // Log call
                    await DB.query(`
                       INSERT INTO ai_calls (user_id, room_id, operation_id, model, tokens_used, status)
                       VALUES ($1, $2, $3, $4, $5, $6)
                    `, [userId, roomId, operationId, MODEL, tokensUsed, isCancelled ? 'cancelled' : 'completed']);
                 }
             }
        };

        stream.on('end', async () => {
             await finishGeneration(false);
        });

    } catch (err) {
        if (axios.isCancel(err)) {
             console.log('[AI] Cancelled by user. Saving partial response.');
             // [FIX] Save partial response on cancellation
             await finishGeneration(true);
        } else {
             activeOperations.delete(operationId);
             console.error('[AI] Generation Error:', err.message);
             IO.to(`user:${userId}`).emit('ai:error', { operationId, error: 'Failed to generate response' });
        }
    }
}

module.exports = { setupAI };
