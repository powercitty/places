import { createHash, randomBytes as systemRandomBytes, timingSafeEqual } from "node:crypto";

export function normalizeInternalPath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.includes("\\") || /[\u0000-\u001f]/.test(value)) return "/";
  return value;
}

export function safeStateEqual(expected, received) {
  if (typeof expected !== "string" || typeof received !== "string") return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

function issuerBase(value) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("OAuth issuer must use HTTPS");
  return url.toString().replace(/\/$/, "");
}

export function createOAuthTransaction({
  issuerUrl,
  clientId,
  redirectUri,
  nextPath,
  randomBytes = systemRandomBytes,
}) {
  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  const authorizationUrl = new URL(`${issuerBase(issuerUrl)}/oauth/authorize`);
  authorizationUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid email profile offline_access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  }).toString();

  return {
    authorizationUrl: authorizationUrl.toString(),
    state,
    codeVerifier,
    nextPath: normalizeInternalPath(nextPath),
  };
}

export async function exchangeAuthorizationCode({
  issuerUrl,
  clientId,
  clientSecret,
  redirectUri,
  code,
  codeVerifier,
  fetchImpl = fetch,
}) {
  const response = await fetchImpl(`${issuerBase(issuerUrl)}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.access_token !== "string" || typeof payload.refresh_token !== "string") {
    throw new Error("OAuth code exchange failed");
  }
  return { accessToken: payload.access_token, refreshToken: payload.refresh_token };
}
