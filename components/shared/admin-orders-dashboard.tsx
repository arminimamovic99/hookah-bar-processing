'use client';

import { useMemo, useState } from 'react';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { ProductCategory } from '@/lib/types/database';

type AdminOrderItem = {
  id: string;
  qty: number;
  note: string | null;
  products: {
    id: string;
    name: string;
    category: ProductCategory;
    price: number;
  } | null;
};

type AdminOrder = {
  id: string;
  status: 'new' | 'in_progress' | 'completed' | 'archived';
  created_at: string;
  closed_at: string | null;
  tables: { number: string } | null;
  order_station_status:
    | { bar_status: 'pending' | 'done'; shisha_status: 'pending' | 'done' }
    | { bar_status: 'pending' | 'done'; shisha_status: 'pending' | 'done' }[]
    | null;
  order_items: AdminOrderItem[] | null;
};

type ProductOption = {
  id: string;
  name: string;
  category: ProductCategory;
};

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDayIso(dateText: string) {
  return new Date(`${dateText}T00:00:00.000`);
}

function endOfDayIso(dateText: string) {
  return new Date(`${dateText}T23:59:59.999`);
}

export function AdminOrdersDashboard({
  orders,
  products,
}: {
  orders: AdminOrder[];
  products: ProductOption[];
}) {
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [singleDate, setSingleDate] = useState(today);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);

  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );
  const selectedProduct = selectedProductId ? productById.get(selectedProductId) ?? null : null;

  const resolvedDateRange = useMemo(() => {
    if (dateMode === 'single') {
      if (!singleDate) {
        return { valid: false, message: 'Odaberite datum.' };
      }
      return {
        valid: true,
        start: startOfDayIso(singleDate),
        end: endOfDayIso(singleDate),
        label: singleDate,
      };
    }

    if (!startDate || !endDate) {
      return { valid: false, message: 'Odaberite početni i završni datum.' };
    }

    if (startDate > endDate) {
      return { valid: false, message: 'Početni datum ne može biti nakon završnog datuma.' };
    }

    return {
      valid: true,
      start: startOfDayIso(startDate),
      end: endOfDayIso(endDate),
      label: `${startDate} → ${endDate}`,
    };
  }, [dateMode, singleDate, startDate, endDate]);

  const filteredByDate = useMemo(() => {
    if (!resolvedDateRange.valid || !resolvedDateRange.start || !resolvedDateRange.end) {
      return [] as AdminOrder[];
    }

    return orders.filter((order) => {
      const createdAt = new Date(order.created_at);
      return createdAt >= resolvedDateRange.start && createdAt <= resolvedDateRange.end;
    });
  }, [orders, resolvedDateRange]);

  const matchingOrders = useMemo(() => {
    if (!selectedProductId) return filteredByDate;
    return filteredByDate.filter((order) =>
      (order.order_items ?? []).some((item) => item.products?.id === selectedProductId)
    );
  }, [filteredByDate, selectedProductId]);

  const productQtyByOrderId = useMemo(() => {
    if (!selectedProductId) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const order of matchingOrders) {
      const qty = (order.order_items ?? []).reduce((sum, item) => {
        if (item.products?.id !== selectedProductId) return sum;
        return sum + item.qty;
      }, 0);
      map.set(order.id, qty);
    }
    return map;
  }, [matchingOrders, selectedProductId]);

  const productSummary = useMemo(() => {
    if (!selectedProduct) return null;
    const totalQty = Array.from(productQtyByOrderId.values()).reduce((sum, qty) => sum + qty, 0);
    return {
      productName: selectedProduct.name,
      totalQty,
      matchingOrders: matchingOrders.length,
    };
  }, [selectedProduct, productQtyByOrderId, matchingOrders.length]);

  const isDefaultTodayFilter = dateMode === 'single' && singleDate === today;

  const shishaCountInSelectedPeriod = useMemo(() => {
    if (!resolvedDateRange.valid) return 0;
    return filteredByDate.reduce((sum, order) => {
      const shishaQty = (order.order_items ?? []).reduce((acc, item) => {
        if (item.products?.category !== 'shisha') return acc;
        return acc + item.qty;
      }, 0);
      return sum + shishaQty;
    }, 0);
  }, [filteredByDate, resolvedDateRange.valid]);

  const orderCount = matchingOrders.length;
  const totalRevenue = matchingOrders.reduce((sum, order) => {
    const subtotal = (order.order_items ?? []).reduce((acc, item) => {
      const price = item.products?.price ?? 0;
      return acc + item.qty * price;
    }, 0);
    return sum + subtotal;
  }, 0);

  const productSearchTerm = productSearch.trim().toLowerCase();
  const visibleProductOptions = useMemo(() => {
    if (!productSearchTerm) return products.slice(0, 40);
    return products
      .filter((product) => product.name.toLowerCase().includes(productSearchTerm))
      .slice(0, 40);
  }, [products, productSearchTerm]);

  function getStationStatus(order: AdminOrder) {
    return Array.isArray(order.order_station_status) ? order.order_station_status[0] : order.order_station_status;
  }

  function getStationBadges(order: AdminOrder): { label: string; variant: 'success' | 'warning' }[] {
    const stationStatus = getStationStatus(order);
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

  function getOrderTotal(order: AdminOrder) {
    return (order.order_items ?? []).reduce((sum, item) => {
      const price = item.products?.price ?? 0;
      return sum + item.qty * price;
    }, 0);
  }

  return (
    <div className="space-y-4">
      <>
          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle>Filteri narudžbi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-md border bg-white/70 p-1 md:w-[320px]">
                <Button
                  type="button"
                  variant={dateMode === 'single' ? 'default' : 'ghost'}
                  onClick={() => setDateMode('single')}
                >
                  Jedan datum
                </Button>
                <Button
                  type="button"
                  variant={dateMode === 'range' ? 'default' : 'ghost'}
                  onClick={() => setDateMode('range')}
                >
                  Raspon datuma
                </Button>
              </div>

              {dateMode === 'single' ? (
                <div className="space-y-1 md:max-w-xs">
                  <Label htmlFor="single-date">Datum</Label>
                  <Input
                    id="single-date"
                    type="date"
                    value={singleDate}
                    max={today}
                    onChange={(e) => setSingleDate(e.target.value)}
                  />
                </div>
              ) : (
                <div className="grid gap-3 md:max-w-xl md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="start-date">Od datuma</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      max={today}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end-date">Do datuma</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      max={today}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1 md:max-w-xl">
                <Label htmlFor="product-filter">Proizvod (opcionalno)</Label>
                <div className="relative">
                  <Input
                    id="product-filter"
                    value={productSearch}
                    onFocus={() => setIsProductMenuOpen(true)}
                    onBlur={() => setTimeout(() => setIsProductMenuOpen(false), 120)}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setSelectedProductId('');
                      setIsProductMenuOpen(true);
                    }}
                    placeholder="Pretražite proizvod..."
                  />
                  {isProductMenuOpen ? (
                    <div className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-md border bg-white shadow-sm">
                      {visibleProductOptions.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">Nema rezultata.</p>
                      ) : (
                        visibleProductOptions.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-orange-50"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSelectedProductId(product.id);
                              setProductSearch(product.name);
                              setIsProductMenuOpen(false);
                            }}
                          >
                            {product.name}
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
                {selectedProduct ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Odabrano: {selectedProduct.name}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedProductId('');
                        setProductSearch('');
                      }}
                    >
                      Očisti proizvod
                    </Button>
                  </div>
                ) : null}
              </div>

              <p className="text-xs text-muted-foreground">
                Aktivni period: {resolvedDateRange.valid ? resolvedDateRange.label : 'Neispravan filter'}
              </p>
              {!resolvedDateRange.valid ? <p className="text-sm text-destructive">{resolvedDateRange.message}</p> : null}
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-3">
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
            <Card className="bg-white/90">
              <CardHeader>
                <CardTitle>
                  {isDefaultTodayFilter ? 'Broj nargila danas' : 'Broj nargila u odabranom periodu'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{shishaCountInSelectedPeriod}</p>
              </CardContent>
            </Card>
          </div>

          {productSummary ? (
            <Card className="border-emerald-200 bg-emerald-50/70">
              <CardHeader>
                <CardTitle>Sažetak proizvoda</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm md:grid-cols-3">
                <p>
                  <span className="text-muted-foreground">Proizvod:</span> <strong>{productSummary.productName}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Ukupno prodano:</span>{' '}
                  <strong>{productSummary.totalQty}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Broj narudžbi:</span>{' '}
                  <strong>{productSummary.matchingOrders}</strong>
                </p>
              </CardContent>
            </Card>
          ) : null}

          <div className="space-y-3">
            <h2 className="text-base font-semibold">Rezultati narudžbi</h2>
            {!resolvedDateRange.valid ? (
              <p className="text-sm text-muted-foreground">Ispravite filter datuma da biste vidjeli rezultate.</p>
            ) : matchingOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nema narudžbi za odabrane filtere.</p>
            ) : (
              <Card className="bg-white/90">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted/40 text-left">
                        <tr>
                          <th className="px-3 py-2 font-medium">Vrijeme</th>
                          <th className="px-3 py-2 font-medium">Sto</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium">Stanice</th>
                          {selectedProductId ? <th className="px-3 py-2 font-medium">Količina proizvoda</th> : null}
                          <th className="px-3 py-2 font-medium">Stavke</th>
                          <th className="px-3 py-2 font-medium text-right">Ukupno</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchingOrders.map((order) => (
                          <tr key={order.id} className="border-t align-top">
                            <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{formatDateTime(order.created_at)}</td>
                            <td className="px-3 py-3 font-medium">Sto {order.tables?.number ?? '-'}</td>
                            <td className="px-3 py-3">
                              <StatusBadge status={order.status === 'new' ? 'pending' : order.status} />
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-2">
                                {getStationBadges(order).map((badge) => (
                                  <Badge key={`${order.id}-${badge.label}`} variant={badge.variant}>
                                    {badge.label}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            {selectedProductId ? (
                              <td className="px-3 py-3">
                                <Badge variant="success" className="text-xs">
                                  {productQtyByOrderId.get(order.id) ?? 0}x
                                </Badge>
                              </td>
                            ) : null}
                            <td className="px-3 py-3">
                              <ul className="space-y-1 text-xs">
                                {(order.order_items ?? []).map((item) => (
                                  <li key={item.id}>
                                    {item.qty}x {item.products?.name ?? 'Nepoznata stavka'}
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">{formatCurrency(getOrderTotal(order))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
      </>
    </div>
  );
}
