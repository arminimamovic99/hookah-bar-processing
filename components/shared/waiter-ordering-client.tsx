'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { closeTableOrdersAction, createOrderAction } from '@/app/actions/order-actions';
import { OrderCard, StationOrder } from '@/components/shared/order-card';
import { ProductPicker, Product, DraftItem, ShishaFlavor } from '@/components/shared/product-picker';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableOption, TableSelector } from '@/components/shared/table-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { CircleX } from 'lucide-react';

interface WaiterOrderingClientProps {
  tables: TableOption[];
  products: Product[];
  shishaFlavors: ShishaFlavor[];
  activeOrders: StationOrder[];
}

export function WaiterOrderingClient({ tables, products, shishaFlavors, activeOrders }: WaiterOrderingClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'new' | 'active'>('new');
  const [tableId, setTableId] = useState(tables[0]?.id ?? '');
  const [orders, setOrders] = useState<StationOrder[]>(activeOrders);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isClosingTable, startCloseTransition] = useTransition();
  const [closingTableId, setClosingTableId] = useState<string | null>(null);

  const openOrders = useMemo(
    () => orders.filter((order) => order.status !== 'completed'),
    [orders]
  );
  const submittedOrders = useMemo(
    () =>
      [...orders].sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return -1;
        if (a.status !== 'completed' && b.status === 'completed') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }),
    [orders]
  );
  const tableOrders = useMemo(
    () => openOrders.filter((order) => order.table_id === tableId),
    [openOrders, tableId]
  );
  const productCategoryMap = useMemo(
    () => new Map(products.map((product) => [product.id, product.category])),
    [products]
  );
  const hasMissingShishaFlavor = useMemo(
    () =>
      items.some(
        (item) =>
          item.qty > 0 &&
          productCategoryMap.get(item.productId) === 'shisha' &&
          !item.note?.trim()
      ),
    [items, productCategoryMap]
  );
  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );
  const orderSummaryItems = useMemo(
    () =>
      items
        .map((item, index) => ({ item, sourceIndex: index }))
        .filter(({ item }) => item.qty > 0)
        .map(({ item, sourceIndex }, index) => {
          const product = productMap.get(item.productId);
          const name = product?.name ?? 'Nepoznat proizvod';
          const unitPrice = product?.price ?? 0;
          return {
            id: `${item.productId}-${index}`,
            sourceIndex,
            name,
            category: product?.category ?? null,
            qty: item.qty,
            note: item.note?.trim() || null,
            lineTotal: unitPrice * item.qty,
          };
        }),
    [items, productMap]
  );
  const orderTotal = useMemo(
    () => orderSummaryItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [orderSummaryItems]
  );
  function removeOrderSummaryItem(sourceIndex: number) {
    setItems((prev) => prev.filter((_, index) => index !== sourceIndex));
  }
  const orderSummaryBlock = (
    <>
      <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border border-orange-200/70 bg-white/80 p-2">
        {orderSummaryItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">Narudžba je prazna.</p>
        ) : (
          orderSummaryItems.map((item) => (
            <div key={item.id} className="text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {item.qty}x {item.name}
                  </p>

                  <p>{formatCurrency(item.lineTotal)}</p>
                </div>
                <div className="flex gap-1 items-center h-full">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="p-2 text-xs text-muted-foreground"
                    onClick={() => removeOrderSummaryItem(item.sourceIndex)}
                    aria-label={`Ukloni ${item.name} iz narudžbe`}
                  >
                    Ukloni
                    <CircleX/>
                  </Button>
                </div>
              </div>
              {item.note ? (
                <p className="text-muted-foreground">
                  {item.category === 'shisha' ? 'Okus' : 'Napomena'}: {item.note}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between text-lg font-bold">
        <p>Ukupno</p>
        <p>{formatCurrency(orderTotal)}</p>
      </div>
    </>
  );

  useEffect(() => {
    setOrders(activeOrders);
  }, [activeOrders]);

  useEffect(() => {
    setIsProductsLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let isUnmounted = false;

    const fetchLatestOrders = async () => {
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      const activeQuery = supabase
        .from('orders')
        .select(
          'id, status, table_id, created_at, tables(number), order_station_status(bar_status, shisha_status), order_items(id, qty, is_new, note, products(name, category, price))'
        )
        .in('status', ['new', 'in_progress'])
        .order('created_at', { ascending: false });

      const completedTodayQuery = supabase
        .from('orders')
        .select(
          'id, status, table_id, created_at, tables(number), order_station_status(bar_status, shisha_status), order_items(id, qty, is_new, note, products(name, category, price))'
        )
        .eq('status', 'completed')
        .gte('created_at', from.toISOString())
        .order('created_at', { ascending: false });

      const [{ data: activeOrders, error: activeError }, { data: completedOrders, error: completedError }] =
        await Promise.all([activeQuery, completedTodayQuery]);

      if (!activeError && !completedError && !isUnmounted) {
        const merged = [...(activeOrders ?? []), ...(completedOrders ?? [])] as StationOrder[];
        const deduped = Array.from(
          new Map<string, StationOrder>(merged.map((order) => [order.id, order])).values()
        ).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setOrders(deduped);
      }
    };

    const triggerRefresh = () => {
      void fetchLatestOrders();
      if (refreshTimer) clearTimeout(refreshTimer);
      // Handle multi-write order flow and cross-table timing.
      refreshTimer = setTimeout(() => void fetchLatestOrders(), 700);
    };

    const channel = supabase
      .channel('waiter-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, triggerRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_station_status' }, triggerRefresh)
      .subscribe();

    void fetchLatestOrders();
    const poll = setInterval(() => void fetchLatestOrders(), 5000);

    return () => {
      isUnmounted = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      clearInterval(poll);
      channel.unsubscribe();
    };
  }, [router]);

  function submitOrder() {
    setFeedback(null);
    startTransition(async () => {
      const payload = {
        tableId,
        items: items
          .filter((item) => item.qty > 0)
          .map((item) => ({ productId: item.productId, qty: item.qty, note: item.note })),
      };

      const result = await createOrderAction(payload);
      if ('error' in result) {
        setFeedback(result.error ?? 'Došlo je do greške.');
        return;
      }

      setFeedback('Narudžba je poslana.');
      setItems([]);
      router.refresh();
    });
  }

  function closeTableOrders(targetTableId = tableId) {
    setFeedback(null);
    startCloseTransition(async () => {
      setClosingTableId(targetTableId);
      const result = await closeTableOrdersAction({ tableId: targetTableId });
      if ('error' in result) {
        setFeedback(result.error ?? 'Došlo je do greške.');
        setClosingTableId(null);
        return;
      }
      setFeedback('Sto je zatvoren.');
      setItems([]);
      setClosingTableId(null);
      router.refresh();
    });
  }

  function getStationBadges(order: StationOrder): { label: string; variant: 'success' | 'warning' }[] {
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

  function getOrderTotal(order: StationOrder) {
    return (order.order_items ?? []).reduce((sum, item) => {
      const price = item.products?.price ?? 0;
      return sum + item.qty * price;
    }, 0);
  }

  return (
    <div className="space-y-4 pb-56 md:pb-0">
      <div className="grid grid-cols-2 gap-2 rounded-md border bg-white/70 p-1">
        <Button
          type="button"
          variant={activeTab === 'new' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('new')}
        >
          Nova narudžba
        </Button>
        <Button
          type="button"
          variant={activeTab === 'active' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('active')}
          className="relative"
        >
          Aktivne narudžbe
          {submittedOrders.length > 0 ? (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-xs text-white">
              {submittedOrders.length}
            </span>
          ) : null}
        </Button>
      </div>

      {activeTab === 'new' ? (
        <>
          <Card className="border-orange-300 bg-white/90">
            <CardHeader>
              <CardTitle>Nova narudžba</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <TableSelector tables={tables} value={tableId} onChange={setTableId} />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isClosingTable || !tableId || tableOrders.length === 0}
                onClick={() => closeTableOrders()}
              >
                {isClosingTable ? 'Zatvaranje...' : 'Zatvori sto'}
              </Button>
              <ProductPicker
                products={products}
                shishaFlavors={shishaFlavors}
                hasActiveOrderForTable={tableOrders.length > 0}
                items={items}
                onChange={setItems}
                isLoading={isProductsLoading}
              />
              {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
              <div className="hidden space-y-2 md:block">{orderSummaryBlock}</div>
              <Button
                onClick={submitOrder}
                disabled={
                  isPending || !tableId || items.every((item) => item.qty <= 0) || hasMissingShishaFlavor
                }
                className="hidden w-full md:inline-flex"
              >
                {isPending ? 'Slanje...' : 'Pošalji narudžbu'}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-base font-semibold">Aktivne narudžbe</h2>
            {tableOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Još nema aktivnih narudžbi.</p>
            ) : (
              tableOrders.map((order) => <OrderCard key={order.id} order={order} />)
            )}
          </div>

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-orange-200/70 bg-background/95 p-3 backdrop-blur md:hidden">
            <div className="mb-3 space-y-2">{orderSummaryBlock}</div>
            <Button
              onClick={submitOrder}
              disabled={
                isPending || !tableId || items.every((item) => item.qty <= 0) || hasMissingShishaFlavor
              }
              className="h-11 w-full"
            >
              {isPending ? 'Slanje...' : 'Pošalji narudžbu'}
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Sve poslane narudžbe</h2>
          {submittedOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Još nema poslanih narudžbi.</p>
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
                    <p className="text-sm font-semibold">Idi na sto {order.tables?.number ?? '-'}</p>
                    <StatusBadge status={order.status === 'new' ? 'pending' : order.status} />
                  </div>
                  {order.status !== 'completed' ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isClosingTable}
                      onClick={() => closeTableOrders(order.table_id)}
                    >
                      {isClosingTable && closingTableId === order.table_id ? 'Zatvaranje...' : 'Zatvori sto'}
                    </Button>
                  ) : null}
                  <p className="text-xs font-semibold">Ukupno: {formatCurrency(getOrderTotal(order))}</p>
                  {/* <PrintOrderButton
                    tableNumber={order.tables?.number ?? '-'}
                    items={(order.order_items ?? []).map((item) => ({
                      qty: item.qty,
                      name: item.products?.name ?? 'Nepoznata stavka',
                      note: item.note,
                    }))}
                  /> */}
                  <div className="flex flex-wrap gap-2">
                    {getStationBadges(order).map((badge) => (
                      <Badge key={badge.label} variant={badge.variant}>
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
      )}
    </div>
  );
}
