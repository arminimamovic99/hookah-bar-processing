import Link from 'next/link';
import { LogoutButton } from '@/components/shared/logout-button';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireRoles } from '@/lib/auth';
import { getAdminOrders, getWaiterOrders } from '@/lib/data';
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
  const currentOrders = await getWaiterOrders();
  const submittedOrders = [...currentOrders].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return -1;
    if (a.status !== 'completed' && b.status === 'completed') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const orderCount = orders.length;
  const totalRevenue = orders.reduce((sum, order) => {
    const subtotal = (order.order_items ?? []).reduce((acc, item) => {
      const price = item.products?.price ?? 0;
      return acc + item.qty * price;
    }, 0);

    return sum + subtotal;
  }, 0);

  function getStationBadges(order: (typeof submittedOrders)[number]) {
    const stationStatus = Array.isArray(order.order_station_status)
      ? order.order_station_status[0]
      : order.order_station_status;
    const hasDrink = (order.order_items ?? []).some((item) => item.products?.category === 'drink');
    const hasShisha = (order.order_items ?? []).some((item) => item.products?.category === 'shisha');
    const badges: { label: string; variant: 'success' | 'warning' }[] = [];

    if (hasDrink) {
      badges.push({
        label: stationStatus?.bar_status === 'done' ? 'Piće gotovo' : 'Čeka se piće',
        variant: stationStatus?.bar_status === 'done' ? 'success' : 'warning',
      });
    }

    if (hasShisha) {
      badges.push({
        label: stationStatus?.shisha_status === 'done' ? 'Shisha gotova' : 'Čeka se shisha',
        variant: stationStatus?.shisha_status === 'done' ? 'success' : 'warning',
      });
    }

    return badges;
  }

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

      <div className="mb-6 space-y-3">
        <h2 className="text-base font-semibold">Pregled trenutnih narudžbi</h2>
        {submittedOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Još nema poslanih narudžbi danas.</p>
        ) : (
          submittedOrders.map((order) => (
            <Card
              key={order.id}
              className={
                order.status === 'completed' ? 'border-emerald-200 bg-white/90' : 'border-orange-200 bg-white/90'
              }
            >
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Sto {order.tables?.number ?? '-'}</p>
                  <StatusBadge status={order.status === 'new' ? 'pending' : order.status} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {getStationBadges(order).map((badge) => (
                    <Badge key={`${order.id}-${badge.label}`} variant={badge.variant}>
                      {badge.label}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* <div className="grid gap-3">
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
      </div> */}
    </main>
  );
}
