export const PF_OAUTH_STATE = "pf_oauth_state";
export const PF_OAUTH_VERIFIER = "pf_oauth_verifier";
export const PF_OAUTH_NEXT = "pf_oauth_next";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function registryOAuthConfig() {
  const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const registryBaseUrl = required("NEXT_PUBLIC_BASE_URL").replace(/\/$/, "");
  return {
    issuerUrl: `${supabaseUrl}/auth/v1`,
    clientId: required("POWERFARM_OAUTH_CLIENT_ID"),
    clientSecret: required("POWERFARM_OAUTH_CLIENT_SECRET"),
    registryBaseUrl,
    redirectUri: `${registryBaseUrl}/auth/callback`,
  };
}
