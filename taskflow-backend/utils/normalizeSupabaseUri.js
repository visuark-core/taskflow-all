// Normalize a Supabase connection URL to the project's IPv4 pooler so
// connections work from environments where the IPv6 host is unreachable.
const SUPABASE_POOLER_REGION = process.env.SUPABASE_POOLER_REGION || "ap-south-1";

function getPoolerHost() {
  return `aws-0-${SUPABASE_POOLER_REGION}.pooler.supabase.com`;
}

function normalizeSupabaseUri(connectionUri) {
  if (!connectionUri || process.env.SYNC_DIRECT) return connectionUri;

  const supabaseUriMatch = connectionUri.match(/@db\.([a-z0-9]+)\.supabase\.co/i);
  if (!supabaseUriMatch) return connectionUri;

  const projectRef = supabaseUriMatch[1];

  // 1. Replace the host
  connectionUri = connectionUri.replace(`db.${projectRef}.supabase.co`, getPoolerHost());

  // 2. Use the session-mode pooler (port 5432) which gives each client a
  //    dedicated backend session - so the app's per-connection
  //    `SET search_path TO ...` pin actually sticks. The transaction pooler
  //    (6543) multiplexes backends and leaks a tenant's search_path into
  //    unrelated connections (seen on production as "User not found" / wrong
  //    schema resolution). Leave the port unchanged unless SYNC_DIRECT.

  // 3. Append the project reference suffix to the username in the connection URI
  const urlMatch = connectionUri.match(/postgresql:\/\/([^:@]+)(:[^@]+)?@/);
  if (urlMatch) {
    const originalUser = urlMatch[1];
    if (!originalUser.endsWith(`.${projectRef}`)) {
      connectionUri = connectionUri.replace(`postgresql://${originalUser}`, `postgresql://${originalUser}.${projectRef}`);
    }
  }

  return connectionUri;
}

module.exports = normalizeSupabaseUri;