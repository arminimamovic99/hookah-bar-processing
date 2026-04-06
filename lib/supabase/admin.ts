import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';
import { getSupabaseUrl } from '@/lib/supabase/env';

export function createAdminClient() {
  return createClient<Database>(
    getSupabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
