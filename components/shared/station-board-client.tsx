'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { markStationDoneAction } from '@/app/actions/station-actions';
import { OrderCard, StationOrder } from '@/components/shared/order-card';
import { createClient } from '@/lib/supabase/client';
import { ProductCategory } from '@/lib/types/database';

interface StationBoardClientProps {
  orders: StationOrder[];
  station: ProductCategory;
  grid?: boolean;
}

export function StationBoardClient({ orders, station, grid = false }: StationBoardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const visibleOrders = useMemo(
    () => orders.filter((order) => (order.order_items ?? []).some((item) => item.products?.category === station)),
    [orders, station]
  );

  useEffect(() => {
    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const triggerRefresh = () => {
      router.refresh();
      if (refreshTimer) clearTimeout(refreshTimer);
      // Handle insert race (order row arrives before items row).
      refreshTimer = setTimeout(() => router.refresh(), 700);
    };

    const channel = supabase
      .channel(`station-${station}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_station_status' }, triggerRefresh)
      .subscribe();

    const poll = setInterval(() => router.refresh(), 5000);

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      clearInterval(poll);
      channel.unsubscribe();
    };
  }, [router, station]);

  function markDone(orderId: string) {
    setError(null);
    startTransition(async () => {
      const result = await markStationDoneAction({ orderId, station: station === 'drink' ? 'bar' : 'shisha' });
      if ('error' in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {visibleOrders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Trenutno nema novih narudžbi.</p>
      ) : (
        <div className={grid ? 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-4'}>
          {visibleOrders.map((order) => (
            <OrderCard key={order.id} order={order} station={station} onDone={markDone} loading={isPending} />
          ))}
        </div>
      )}
    </div>
  );
}
