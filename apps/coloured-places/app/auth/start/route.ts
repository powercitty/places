import { NextResponse, type NextRequest } from "next/server";
import { createOAuthTransaction } from "@/lib/oauth-client-flow.mjs";
import {
  PF_OAUTH_NEXT,
  PF_OAUTH_STATE,
  PF_OAUTH_VERIFIER,
  registryOAuthConfig,
} from "@/lib/oauth-client-config";

export async function GET(request: NextRequest) {
  const config = registryOAuthConfig();
  const transaction = createOAuthTransaction({
    issuerUrl: config.issuerUrl,
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    nextPath: request.nextUrl.searchParams.get("next") ?? "/",
  });
  const response = NextResponse.redirect(transaction.authorizationUrl);
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: true,
    path: "/",
    maxAge: 600,
  };
  response.cookies.set(PF_OAUTH_STATE, transaction.state, options);
  response.cookies.set(PF_OAUTH_VERIFIER, transaction.codeVerifier, options);
  response.cookies.set(PF_OAUTH_NEXT, transaction.nextPath, options);
  return response;
}
