/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/types/database';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env';

export async function createServerComponentClient(): Promise<any> {
  const cookieStore = await cookies();
  const anonKey = getSupabaseAnonKey();
  const url = getSupabaseUrl();

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component where setting cookies may not be allowed.
          }
        },
      },
    }
  ) as any;
}

export async function createServerActionClient(): Promise<any> {
  const cookieStore = await cookies();
  const anonKey = getSupabaseAnonKey();
  const url = getSupabaseUrl();

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  ) as any;
}

export const createClient = createServerComponentClient;
