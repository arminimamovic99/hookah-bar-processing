'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRoles } from '@/lib/auth';
import { createServerActionClient } from '@/lib/supabase/server';

const createProductSchema = z.object({
  name: z.string().min(2).max(80),
  category: z.enum(['drink', 'shisha']),
  price: z.coerce.number().min(0).max(9999),
  isAvailable: z.boolean().default(true),
});

const updateProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(80),
  category: z.enum(['drink', 'shisha']),
  price: z.coerce.number().min(0).max(9999),
  isAvailable: z.boolean(),
});

export async function createProductAction(input: unknown) {
  await requireRoles(['admin']);
  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Neispravan unos.' };

  const supabase = await createServerActionClient();
  let nextName = parsed.data.name;

  if (parsed.data.category === 'shisha') {
    const { data: existingShisha, error: existingShishaError } = await supabase
      .from('products')
      .select('id')
      .eq('category', 'shisha')
      .maybeSingle();

    if (existingShishaError) return { error: existingShishaError.message };
    if (existingShisha) return { error: 'Dozvoljen je samo jedan proizvod u kategoriji nargila.' };
    nextName = 'Nargila';
  }

  const { error } = await (supabase.from('products') as never as {
    insert: (values: {
      name: string;
      category: 'drink' | 'shisha';
      price: number;
      is_available: boolean;
    }) => Promise<{ error: { message: string } | null }>;
  }).insert({
    name: nextName,
    category: parsed.data.category,
    price: parsed.data.price,
    is_available: parsed.data.isAvailable,
  });

  if (error) return { error: error.message };

  revalidatePath('/admin/products');
  revalidatePath('/waiter');
  return { success: true };
}

export async function updateProductAction(input: unknown) {
  await requireRoles(['admin']);
  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Neispravan unos.' };

  const supabase = await createServerActionClient();
  let nextName = parsed.data.name;

  if (parsed.data.category === 'shisha') {
    const { data: existingShisha, error: existingShishaError } = await supabase
      .from('products')
      .select('id')
      .eq('category', 'shisha')
      .neq('id', parsed.data.id)
      .maybeSingle();

    if (existingShishaError) return { error: existingShishaError.message };
    if (existingShisha) return { error: 'Dozvoljen je samo jedan proizvod u kategoriji nargila.' };
    nextName = 'Nargila';
  }

  const { error } = await (supabase.from('products') as never as {
    update: (values: {
      name: string;
      category: 'drink' | 'shisha';
      price: number;
      is_available: boolean;
    }) => { eq: (column: 'id', value: string) => Promise<{ error: { message: string } | null }> };
  })
    .update({
      name: nextName,
      category: parsed.data.category,
      price: parsed.data.price,
      is_available: parsed.data.isAvailable,
    })
    .eq('id', parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath('/admin/products');
  revalidatePath('/waiter');
  return { success: true };
}

export async function deleteProductAction(productId: string) {
  await requireRoles(['admin']);

  const idSchema = z.string().uuid();
  const parsed = idSchema.safeParse(productId);
  if (!parsed.success) return { error: 'Neispravan ID proizvoda.' };

  const supabase = await createServerActionClient();
  const { error } = await (supabase.from('products') as never as {
    delete: () => { eq: (column: 'id', value: string) => Promise<{ error: { message: string } | null }> };
  })
    .delete()
    .eq('id', productId);
  if (error) return { error: error.message };

  revalidatePath('/admin/products');
  revalidatePath('/waiter');
  return { success: true };
}
