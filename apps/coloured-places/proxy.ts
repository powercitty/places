import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === '/api/health' || path === '/login' || path.startsWith('/auth/')) {
    return NextResponse.next();
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const owner = process.env.POWERFARM_OWNER_ID;
  if (!url || !key || !owner) return NextResponse.json({ error: 'Powerfarm admission is not configured' }, { status: 503 });
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (path.startsWith('/api/')) return NextResponse.json({ error: 'Sign in to Powerfarm' }, { status: 401 });
    const login = new URL('/login', process.env.NEXT_PUBLIC_BASE_URL || request.url);
    login.searchParams.set('next', path + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  const { data: links, error } = await supabase.from('identity_links').select('identity_id')
    .eq('supabase_user', user.id).eq('identity_id', owner).is('unlinked_at', null);
  if (error || !links?.length) return NextResponse.json({ error: 'The registered operator identity is required' }, { status: 403 });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
