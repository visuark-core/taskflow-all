async function run() {
  const url = 'https://taskflow-backend-ten.vercel.app/api/request-logs';
  console.log(`Polling Vercel request logs from ${url}...`);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Error fetching logs: Status ${res.status}`);
      process.exit(1);
    }
    const body = await res.json();
    console.log(`\nFound ${body.count} request logs on Vercel:`);
    console.log('========================================================================');
    
    // Sort logs by time (earliest to latest)
    const logs = body.logs || [];
    logs.forEach((log, index) => {
      console.log(`[#${index + 1}] Time: ${log.time}`);
      console.log(`Method: ${log.method} | URL: ${log.url}`);
      console.log(`Status: ${log.status} | Duration: ${log.duration}ms`);
      console.log(`Headers: Origin: ${log.headers.origin} | Auth: ${log.headers.authorization}`);
      console.log('------------------------------------------------------------------------');
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Fetch failed:', err);
    process.exit(1);
  }
}

run();
