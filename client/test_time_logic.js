const formatTime = (dateString) => {
    if (!dateString) return '';
    let date;
    if (dateString instanceof Date) {
        date = dateString;
    } else {
        let s = String(dateString);
        if (s.includes(' ') && !s.includes('T')) {
            s = s.replace(' ', 'T');
        }
        s = s.replace(/(\.\d{3})\d+/, '$1');
        const hasTimezone = /[Zz]|[+\-]\d{2}(:?\d{2})?$/.test(s);
        if (!hasTimezone) {
             s += 'Z';
        }
        console.log(`Input: "${dateString}" -> Parsed: "${s}"`);
        date = new Date(s);
    }
    if (isNaN(date.getTime())) return 'Invalid';
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};

// Test Cases
const serverTime = "2025-12-12 07:30:00"; // What we suspect
const serverTimeMs = "2025-12-12 07:30:00.123456"; // With microsecs
const serverTimeISO = "2025-12-12T07:30:00.000Z"; // Fully correct
const serverTimeNoZ = "2025-12-12T07:30:00"; // Missing Z

console.log("07:30 UTC should be 1:00 PM (13:00) in IST (+5:30)");
// Note: This test runs in Server Environment. 
// If Server Env is UTC, toLocaleTimeString might fail to show conversion if we don't force timezone.
// But we want to test that 'date' is constructed correctly as UTC.

const check = (input) => {
    const res = formatTime(input);
    const dateObj = new Date(String(input).replace(' ', 'T') + (String(input).endsWith('Z') ? '' : 'Z'));
    // Actually our function modifies it.
    console.log(`Result for ${input}: ${res}`);
}

check(serverTime);
check(serverTimeMs);
check(serverTimeISO);
check(serverTimeNoZ);
