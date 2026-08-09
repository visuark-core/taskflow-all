async function run() {
  const url = 'https://taskflow-all.vercel.app/assets/index-C08No7Os.js';
  console.log(`Downloading compiled bundle: ${url}...`);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to download bundle: Status ${res.status}`);
      process.exit(1);
    }
    const code = await res.text();
    console.log('Downloaded successfully. Length:', code.length);

    // Search for patterns matching the backend url
    const match = code.match(/https?:\/\/[a-zA-Z0-9-]+\.vercel\.app\/api/g);
    console.log('\n--- FOUND API URL PATTERNS IN COMPILED JS ---');
    if (match) {
      console.log('Matches:', [...new Set(match)]);
    } else {
      console.log('No vercel.app api url matches found.');
      // Look for any VITE_API_URL occurrence
      const contextMatch = code.match(/(VITE_API_URL|http:[^\s'"]+5000)/g);
      console.log('Fallback matches:', contextMatch);
    }
    process.exit(0);
  } catch (err) {
    console.error('Failed to parse compiled bundle:', err);
    process.exit(1);
  }
}

run();
