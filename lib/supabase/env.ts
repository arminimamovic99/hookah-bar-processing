function getProjectRefFromUrl(url: string): string {
  const hostname = new URL(url).hostname;
  return hostname.split('.')[0] ?? '';
}

function getSupabaseEnvNamespace(): 'next_public' | 'server' {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) return 'next_public';
  if (process.env.SUPABASE_URL?.trim()) return 'server';
  throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
}

function assertExpectedDevProjectRef(url: string) {
  if (process.env.NODE_ENV !== 'development') return;

  const expectedRef = process.env.SUPABASE_DEV_PROJECT_REF?.trim();
  if (!expectedRef) return;

  const actualRef = getProjectRefFromUrl(url);
  if (actualRef !== expectedRef) {
    throw new Error(
      `Supabase project mismatch in development. Expected ${expectedRef}, got ${actualRef}. Check .env.local`
    );
  }
}

export function getSupabaseUrl(): string {
  const namespace = getSupabaseEnvNamespace();
  const url =
    namespace === 'next_public'
      ? process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
      : process.env.SUPABASE_URL?.trim();
  if (!url) throw new Error('Missing Supabase URL for selected env namespace');
  assertExpectedDevProjectRef(url);
  return url;
}

export function getSupabaseAnonKey(): string {
  const namespace = getSupabaseEnvNamespace();

  if (namespace === 'next_public') {
    const nextPublicKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim();
    if (!nextPublicKey) {
      throw new Error(
        'Missing required env var: NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'
      );
    }
    return nextPublicKey;
  }

  const serverKey =
    process.env.SUPABASE_ANON_KEY?.trim() ?? process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim();
  if (!serverKey) {
    throw new Error('Missing required env var: SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_DEFAULT_KEY');
  }
  return serverKey;
}
