'use client';

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env';

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (client) return client;
  const anonKey = getSupabaseAnonKey();
  const url = getSupabaseUrl();

  client = createBrowserClient<Database>(url, anonKey);

  return client;
}
