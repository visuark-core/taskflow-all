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

  // 2. Use the transaction-mode pooler (port 6543) for fast connection sharing
  //    in serverless. The search_path leak that plagued the old production is
  //    fixed by per-query SET search_path pinning (utils/pinSearchPath applied
  //    to the primary and tenant Sequelize instances), not by session mode.
  //    Transaction mode avoids the dedicated-connection overhead that made
  //    session-mode requests take 5-9s.
  connectionUri = connectionUri.replace(":5432", ":6543");

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