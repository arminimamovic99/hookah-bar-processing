import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const printSchema = z.object({
  tableNumber: z.string().min(1),
  items: z.array(z.string().min(1)).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = printSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !['shisha'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const content = [
      'UltraSpot',
      '--------------------------',
      `Sto: ${parsed.data.tableNumber}`,
      '',
      ...parsed.data.items,
      '',
      // now.toLocaleTimeString('bs-BA', {
      //   hour: '2-digit',
      //   minute: '2-digit',
      // }),
      '--------------------------',
    ].join('\n');

    const { error } = await supabase.from('print_jobs').insert({
      table_number: parsed.data.tableNumber,
      content,
      status: 'pending',
      type: 'label',
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to queue print job' }, { status: 500 });
  }
}
