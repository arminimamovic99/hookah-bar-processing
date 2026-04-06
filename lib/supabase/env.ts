function getProjectRefFromUrl(url: string): string {
  const hostname = new URL(url).hostname;
  return hostname.split('.')[0] ?? '';
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? process.env.SUPABASE_URL?.trim();
  if (!url) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  }
  assertExpectedDevProjectRef(url);
  return url;
}

export function getSupabaseAnonKey(): string {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? process.env.SUPABASE_ANON_KEY?.trim();
  if (anonKey) return anonKey;

  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ??
    process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim();
  if (!publishableKey) {
    throw new Error(
      'Missing required env var: NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY / SUPABASE_ANON_KEY / SUPABASE_PUBLISHABLE_DEFAULT_KEY'
    );
  }
  return publishableKey;
}
