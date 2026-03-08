async function test() {
    try {
        console.log("Fetching https://plxqfqnrnxgxpetpqcck.supabase.co/rest/v1/");
        const res = await fetch("https://plxqfqnrnxgxpetpqcck.supabase.co/rest/v1/");
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Response:", text);
    } catch (err) {
        console.error("Fetch failed:", err);
    }
}
test();
