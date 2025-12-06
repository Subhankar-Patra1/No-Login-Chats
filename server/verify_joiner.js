const API_URL = 'http://localhost:3000/api';

const run = async () => {
    const fetch = (await import('node-fetch')).default;

    // 1. Create Owner
    const ownerName = `owner_${Date.now()}`;
    console.log(`Creating Owner: ${ownerName}`);
    const ownerAuth = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: ownerName, displayName: "The Owner", password: "password123" })
    });
    const ownerData = await ownerAuth.json();
    const ownerToken = ownerData.token;

    // 2. Create Room
    console.log("Creating Room...");
    const roomRes = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ownerToken}`
        },
        body: JSON.stringify({ name: "Visibility Room", type: "group" })
    });
    const room = await roomRes.json();
    console.log(`Room created: ${room.name} (${room.code})`);

    // 3. Create Joiner
    const joinerName = `joiner_${Date.now()}`;
    console.log(`Creating Joiner: ${joinerName}`);
    const joinerAuth = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: joinerName, displayName: "The Joiner", password: "password123" })
    });
    const joinerData = await joinerAuth.json();
    const joinerToken = joinerData.token;

    // 4. Join Room
    console.log("Joining Room...");
    await fetch(`${API_URL}/rooms/join`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${joinerToken}`
        },
        body: JSON.stringify({ code: room.code })
    });

    // 5. Fetch Members as Joiner
    console.log("Fetching members as Joiner...");
    const membersRes = await fetch(`${API_URL}/rooms/${room.id}/members`, {
        headers: { 'Authorization': `Bearer ${joinerToken}` }
    });
    const members = await membersRes.json();

    console.log("\n--- Members List Seen by Joiner ---");
    console.log(members);

    const ownerInList = members.find(m => m.username === ownerName);
    if (ownerInList && ownerInList.role === 'owner') {
        console.log("\n✅ SUCCESS: Joiner sees Owner in the list.");
    } else {
        console.log("\n❌ FAILURE: Owner MISSING from list!");
    }
};

run();
