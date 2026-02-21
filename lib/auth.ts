import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppRole } from '@/lib/types/database';

export type CurrentUser = {
  id: string;
  role: AppRole;
  email: string | null;
};

export async function getCurrentUserProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, email')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  return profile as CurrentUser;
}

export async function requireRoles(roles: AppRole[]) {
  const profile = await getCurrentUserProfile();

  if (!profile || !roles.includes(profile.role)) {
    redirect('/login');
  }

  return profile;
}

export function roleDefaultRoute(role: AppRole) {
  if (role === 'waiter') return '/waiter';
  if (role === 'bar') return '/station/bar';
  if (role === 'shisha') return '/station/shisha';
  return '/admin/orders';
}
