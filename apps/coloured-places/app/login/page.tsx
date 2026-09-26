import { normalizeInternalPath } from "@/lib/oauth-client-flow.mjs";
import { redirect } from "next/navigation";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; redirect?: string }>;
}) {
  const query = await searchParams;
  const next = normalizeInternalPath(query.next ?? query.redirect ?? "/");
  redirect(`/auth/start?next=${encodeURIComponent(next)}`);
}
