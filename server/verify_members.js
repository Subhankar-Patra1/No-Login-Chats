// Socket.io removed

// Use dynamic import for node-fetch
const run = async () => {
    const fetch = (await import('node-fetch')).default;

    const API_URL = 'http://localhost:3000/api';
    
    // 1. Sign Up / Login a user
    const username = `test_owner_${Date.now()}`;
    const userPayload = {
        username: username,
        displayName: "Owner User",
        password: "password123"
    };

    console.log("Creating user:", username);
    const authRes = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userPayload)
    });

    const authData = await authRes.json();
    const token = authData.token;
    
    if (!token) {
        console.error("Failed to login/signup", authData);
        return;
    }
    console.log("Logged in.");

    // 2. Create Room
    console.log("Creating room...");
    const roomRes = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            name: "Debug Room",
            type: "group"
        })
    });

    const room = await roomRes.json();
    console.log("Room created:", room.id);

    // 3. Fetch Members
    console.log("Fetching members...");
    const membersRes = await fetch(`${API_URL}/rooms/${room.id}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const members = await membersRes.json();
    console.log("\n--- Members List ---");
    console.log(members);
    
    const owner = members.find(m => m.role === 'owner');
    if (owner) {
        console.log("\n✅ SUCCESS: Owner found in list: ", owner.username);
    } else {
        console.log("\n❌ FAILURE: Owner NOT found in list!");
    }
};

run();
