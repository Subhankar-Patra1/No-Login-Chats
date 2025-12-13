
const db = require('./db');

async function inspect() {
    try {
        console.log('--- USERS ---');
        const users = await db.query('SELECT id, username, display_name FROM users ORDER BY id DESC LIMIT 5');
        console.log(JSON.stringify(users.rows, null, 2));

        console.log('\n--- ROOMS ---');
        const rooms = await db.query('SELECT id, type, created_by FROM rooms ORDER BY id DESC LIMIT 5');
        console.log(JSON.stringify(rooms.rows, null, 2));

        console.log('\n--- ROOM MEMBERS ---');
        const members = await db.query('SELECT room_id, user_id, is_hidden, role FROM room_members ORDER BY room_id DESC, user_id ASC LIMIT 10');
        console.log(JSON.stringify(members.rows, null, 2));
        
        console.log('\n--- MESSAGES ---');
        const msgs = await db.query('SELECT id, room_id, user_id, content FROM messages ORDER BY id DESC LIMIT 5');
        console.log(JSON.stringify(msgs.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

inspect();
