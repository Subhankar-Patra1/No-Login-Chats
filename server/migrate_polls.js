// Migration: Create polls tables
const db = require('./db');

const migrate = async () => {
    try {
        await db.query(`
            -- Create polls table
            CREATE TABLE IF NOT EXISTS polls (
                id SERIAL PRIMARY KEY,
                message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
                room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
                question TEXT NOT NULL,
                created_by INTEGER REFERENCES users(id),
                is_multiple_choice BOOLEAN DEFAULT FALSE,
                is_anonymous BOOLEAN DEFAULT FALSE,
                is_closed BOOLEAN DEFAULT FALSE,
                closed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Create poll options table
            CREATE TABLE IF NOT EXISTS poll_options (
                id SERIAL PRIMARY KEY,
                poll_id INTEGER REFERENCES polls(id) ON DELETE CASCADE,
                option_text TEXT NOT NULL,
                option_order INTEGER DEFAULT 0
            );

            -- Create poll votes table
            CREATE TABLE IF NOT EXISTS poll_votes (
                id SERIAL PRIMARY KEY,
                poll_id INTEGER REFERENCES polls(id) ON DELETE CASCADE,
                option_id INTEGER REFERENCES poll_options(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(poll_id, option_id, user_id)
            );

            -- Add poll_id column to messages table
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS poll_id INTEGER REFERENCES polls(id);

            -- Create indexes
            CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
            CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id);
        `);
        console.log("✅ Polls migration completed successfully");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err);
        process.exit(1);
    }
};

migrate();
