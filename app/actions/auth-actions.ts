'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { roleDefaultRoute } from '@/lib/auth';
import { createServerActionClient } from '@/lib/supabase/server';
import { AppRole } from '@/lib/types/database';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function loginAction(
  _prevState: { error: string | null },
  formData: FormData
) {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: 'Unesite ispravnu email adresu i lozinku.' };
  }

  const supabase = await createServerActionClient();
  const { error: loginError } = await supabase.auth.signInWithPassword(parsed.data);

  if (loginError) {
    return { error: loginError.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Neuspješno učitavanje korisnika.' };
  }

  const { data: profile } = (await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()) as { data: { role: AppRole } | null };

  if (!profile) {
    return { error: 'Profil nije pronađen. Zamolite admina da postavi vašu ulogu.' };
  }

  redirect(roleDefaultRoute(profile.role));
}

export async function logoutAction() {
  const supabase = await createServerActionClient();
  await supabase.auth.signOut();
  redirect('/login');
}
