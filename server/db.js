process.env.PGTZ = 'UTC'; // Force Postgres to treat timestamps as UTC
const { Pool } = require('pg');
require('dotenv').config();

const dns = require('dns');
const url = require('url');

let pool;

const getPool = async () => {
    if (pool) return pool;

    const dbUrl = process.env.DATABASE_URL;
    const params = url.parse(dbUrl);
    const hostname = params.hostname;

    return new Promise((resolve) => {
        dns.resolve4(hostname, (err, addresses) => {
            if (err) {
                console.error('DNS Resolution failed, using original URL:', err);
                pool = new Pool({
                    connectionString: dbUrl,
                    ssl: { rejectUnauthorized: false }
                });
            } else {
                const ip = addresses[0];
                console.log(`Resolved ${hostname} to ${ip}`);
                const config = {
                    user: params.auth.split(':')[0],
                    password: params.auth.split(':')[1],
                    host: ip,
                    port: params.port,
                    database: params.pathname.split('/')[1],
                    ssl: { rejectUnauthorized: false }
                };
                pool = new Pool(config);
            }

            pool.on('connect', (client) => {
                client.query("SET TIME ZONE 'UTC'");
            });

            pool.on('error', (err, client) => {
                console.error('Unexpected error on idle client', err);
                process.exit(-1);
            });

            resolve(pool);
        });
    });
};

// Create tables
const createTables = async () => {
    try {
        const p = await getPool();
        await p.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                display_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                recovery_code_hash TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS rooms (
                id SERIAL PRIMARY KEY,
                code TEXT UNIQUE,
                name TEXT,
                type TEXT CHECK(type IN ('group', 'direct')) NOT NULL,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS room_members (
                room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                role TEXT DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (room_id, user_id)
            );

            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                type TEXT DEFAULT 'text',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );


            -- Migration for existing users table
            ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_code_hash TEXT;

            -- Migration for messages table
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent'; -- sent, delivered, seen
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_message_id INTEGER REFERENCES messages(id);
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted_for_everyone BOOLEAN DEFAULT FALSE;
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for_user_ids TEXT[] DEFAULT '{}';
        `);
        console.log("Tables created successfully");
    } catch (err) {
        console.error("Error creating tables:", err);
    }
};

// Initialize tables on startup
createTables();

module.exports = {
    query: async (text, params) => {
        const p = await getPool();
        return p.query(text, params);
    },
};
