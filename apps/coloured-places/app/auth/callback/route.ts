import { NextResponse, type NextRequest } from "next/server";
import { exchangeAuthorizationCode, safeStateEqual, normalizeInternalPath } from "@/lib/oauth-client-flow.mjs";
import {
  PF_OAUTH_NEXT,
  PF_OAUTH_STATE,
  PF_OAUTH_VERIFIER,
  registryOAuthConfig,
} from "@/lib/oauth-client-config";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const config = registryOAuthConfig();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(PF_OAUTH_STATE)?.value;
  const codeVerifier = request.cookies.get(PF_OAUTH_VERIFIER)?.value;
  const next = normalizeInternalPath(request.cookies.get(PF_OAUTH_NEXT)?.value ?? "/");
  const failed = () => NextResponse.json({ error: "Login could not be completed. Start again at /login." }, { status: 401 });

  if (!code || !codeVerifier || !safeStateEqual(expectedState, state ?? undefined)) return failed();

  try {
    const tokens = await exchangeAuthorizationCode({
      issuerUrl: config.issuerUrl,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      code,
      codeVerifier,
    });
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.setSession({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
    if (error) return failed();
  } catch {
    return failed();
  }

  const response = NextResponse.redirect(new URL(next, config.registryBaseUrl));
  response.cookies.delete(PF_OAUTH_STATE);
  response.cookies.delete(PF_OAUTH_VERIFIER);
  response.cookies.delete(PF_OAUTH_NEXT);
  return response;
}
