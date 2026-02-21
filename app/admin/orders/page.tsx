import Link from 'next/link';
import { LogoutButton } from '@/components/shared/logout-button';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireRoles } from '@/lib/auth';
import { getAdminOrders } from '@/lib/data';
import { formatCurrency, formatDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

interface AdminOrdersPageProps {
  searchParams: Promise<{
    view?: 'today' | 'week';
    status?: 'all' | 'new' | 'in_progress' | 'completed';
  }>;
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  await requireRoles(['admin']);
  const params = await searchParams;

  const view = params.view === 'week' ? 'week' : 'today';
  const status = params.status ?? 'all';
  const statusLabelMap: Record<'all' | 'new' | 'in_progress' | 'completed', string> = {
    all: 'Sve',
    new: 'Novo',
    in_progress: 'U toku',
    completed: 'Završeno',
  };
  const categoryLabelMap: Record<'drink' | 'shisha', string> = {
    drink: 'piće',
    shisha: 'nargila',
  };

  const orders = await getAdminOrders(view, status);

  const orderCount = orders.length;
  const totalRevenue = orders.reduce((sum, order) => {
    const subtotal = (order.order_items ?? []).reduce((acc, item) => {
      const price = item.products?.price ?? 0;
      return acc + item.qty * price;
    }, 0);

    return sum + subtotal;
  }, 0);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Admin · Narudžbe</h1>
        <LogoutButton />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={`/admin/orders?view=today&status=${status}`} className="rounded border px-3 py-1 text-sm">
          Danas
        </Link>
        <Link href={`/admin/orders?view=week&status=${status}`} className="rounded border px-3 py-1 text-sm">
          Ova sedmica
        </Link>
        {(['all', 'new', 'in_progress', 'completed'] as const).map((s) => (
          <Link key={s} href={`/admin/orders?view=${view}&status=${s}`} className="rounded border px-3 py-1 text-sm">
            {statusLabelMap[s]}
          </Link>
        ))}
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Broj narudžbi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{orderCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Prihod</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3">
        {orders.map((order) => {
          const station = Array.isArray(order.order_station_status)
            ? order.order_station_status[0]
            : order.order_station_status;

          return (
            <Card key={order.id} className="bg-white/90">
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Sto {order.tables?.number ?? '-'}</p>
                  <div className="flex gap-2">
                    <StatusBadge status={order.status} />
                    <StatusBadge status={station?.bar_status ?? 'pending'} />
                    <StatusBadge status={station?.shisha_status ?? 'pending'} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                <ul className="space-y-1 text-sm">
                  {(order.order_items ?? []).map((item, idx) => (
                    <li key={`${order.id}-${idx}`}>
                      {item.qty}x {item.products?.name ?? 'Nepoznato'} ({item.products?.category ? categoryLabelMap[item.products.category] : '-'})
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
