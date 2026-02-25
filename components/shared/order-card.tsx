import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { ProductCategory, StationStatus } from '@/lib/types/database';
import { StatusBadge } from './status-badge';

export type StationOrderItem = {
  id: string;
  qty: number;
  note: string | null;
  products: {
    name: string;
    category: ProductCategory;
    price?: number;
  } | null;
};

export type StationOrder = {
  id: string;
  table_id: string;
  created_at: string;
  status: 'new' | 'in_progress' | 'completed';
  tables: {
    number: string;
  } | null;
  order_station_status:
    | {
        bar_status: StationStatus;
        shisha_status: StationStatus;
      }
    | {
        bar_status: StationStatus;
        shisha_status: StationStatus;
      }[]
    | null;
  order_items: StationOrderItem[] | null;
};

interface OrderCardProps {
  order: StationOrder;
  station?: ProductCategory;
  onDone?: (orderId: string) => void;
  loading?: boolean;
}

export function OrderCard({ order, station, onDone, loading }: OrderCardProps) {
  const relevantItems = (order.order_items ?? []).filter((item) =>
    station ? item.products?.category === station : true
  );

  const stationStatus = Array.isArray(order.order_station_status)
    ? order.order_station_status[0]
    : order.order_station_status;
  const currentStatus =
    station === 'drink' ? stationStatus?.bar_status : station === 'shisha' ? stationStatus?.shisha_status : undefined;

  return (
    <Card className="border-orange-200/60 bg-white/90">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Sto {order.tables?.number ?? '-'}</CardTitle>
          <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={order.status} />
          {currentStatus ? <StatusBadge status={currentStatus} /> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {relevantItems.map((item) => (
            <li key={item.id} className="rounded-md border border-orange-100 p-2 text-sm">
              <p className="font-medium">
                {item.qty}x {item.products?.name ?? 'Nepoznata stavka'}
              </p>
              {item.products?.category === 'shisha' ? (
                <>
                  <p className="text-md text-muted-foreground font-bold">Mješavina okusa: {item.note?.trim() || 'Nije uneseno'}</p>
                  <button className='bg-primary text-sm rounded-md p-2 text-white my-2 font-semibold'>Printaj</button>
                </>
              ) : item.note ? (
                <p className="text-xs text-muted-foreground">
                  Napomena: {item.note}
                </p>
              ) : null}
            </li>
          ))}
        </ul>

        {onDone && station && currentStatus !== 'done' && relevantItems.length > 0 ? (
          <Button disabled={loading} onClick={() => onDone(order.id)} className="w-full bg-success">
            {loading ? 'Spremanje...' : 'Označi kao gotovo'}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
