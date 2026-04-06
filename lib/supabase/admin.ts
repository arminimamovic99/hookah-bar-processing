import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';
import { getSupabaseUrl } from '@/lib/supabase/env';

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    throw new Error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient<Database>(
    getSupabaseUrl(),
    serviceRoleKey
  );
}
