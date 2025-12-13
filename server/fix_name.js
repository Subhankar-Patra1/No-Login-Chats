
const db = require('./db');

async function fixName() {
    try {
        await db.query("UPDATE users SET display_name = 'SenderUser' WHERE username = 'SenderUser'");
        console.log("Updated display_name for SenderUser");
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

fixName();
