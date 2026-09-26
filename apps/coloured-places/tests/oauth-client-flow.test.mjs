import assert from "node:assert/strict";
import test from "node:test";

import {
  createOAuthTransaction,
  exchangeAuthorizationCode,
  normalizeInternalPath,
  safeStateEqual,
} from "../lib/oauth-client-flow.mjs";

test("OAuth transaction binds state, PKCE and the exact Registry callback", () => {
  let call = 0;
  const randomBytes = () => Buffer.alloc(32, ++call);
  const transaction = createOAuthTransaction({
    issuerUrl: "https://project.supabase.co/auth/v1",
    clientId: "registry-client",
    redirectUri: "https://registry.powerfarm.app/auth/callback",
    nextPath: "/admin?tab=apps",
    randomBytes,
  });

  assert.equal(transaction.state, "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE");
  assert.equal(transaction.codeVerifier, "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI");
  assert.equal(transaction.nextPath, "/admin?tab=apps");
  assert.equal(transaction.authorizationUrl, "https://project.supabase.co/auth/v1/oauth/authorize?response_type=code&client_id=registry-client&redirect_uri=https%3A%2F%2Fregistry.powerfarm.app%2Fauth%2Fcallback&scope=openid+email+profile+offline_access&state=AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE&code_challenge=bB1ju9q0N8VDaMu9iIaohqea2XcpfiZe6_H19fAVM7k&code_challenge_method=S256");
});

test("Registry accepts only local post-login destinations", () => {
  assert.equal(normalizeInternalPath("/account?from=login"), "/account?from=login");
  assert.equal(normalizeInternalPath("//evil.example"), "/");
  assert.equal(normalizeInternalPath("https://evil.example"), "/");
  assert.equal(normalizeInternalPath(undefined), "/");
});

test("OAuth callback state comparison rejects missing and unequal values", () => {
  assert.equal(safeStateEqual("same-state", "same-state"), true);
  assert.equal(safeStateEqual("same-state", "other-state"), false);
  assert.equal(safeStateEqual("same-state", undefined), false);
});

test("code exchange uses Basic client authentication without leaking the secret into the body", async () => {
  let request;
  const tokens = await exchangeAuthorizationCode({
    issuerUrl: "https://project.supabase.co/auth/v1",
    clientId: "registry-client",
    clientSecret: "server-secret",
    redirectUri: "https://registry.powerfarm.app/auth/callback",
    code: "issued-code",
    codeVerifier: "verifier",
    fetchImpl: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ access_token: "access", refresh_token: "refresh" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  assert.deepEqual(tokens, { accessToken: "access", refreshToken: "refresh" });
  assert.equal(request.url, "https://project.supabase.co/auth/v1/oauth/token");
  assert.equal(request.init.headers.Authorization, "Basic cmVnaXN0cnktY2xpZW50OnNlcnZlci1zZWNyZXQ=");
  assert.equal(request.init.body.toString(), "grant_type=authorization_code&code=issued-code&redirect_uri=https%3A%2F%2Fregistry.powerfarm.app%2Fauth%2Fcallback&code_verifier=verifier");
  assert.doesNotMatch(request.init.body.toString(), /server-secret|client_secret/);
});

test("callback destinations cannot use browser backslash or control normalization to leave the app", () => {
  for (const value of ["/\\evil.example", "/\n/evil.example", "/\t/evil.example"]) {
    assert.equal(normalizeInternalPath(value), "/");
  }
});
