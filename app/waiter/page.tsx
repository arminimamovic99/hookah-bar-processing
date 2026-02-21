import { requireRoles } from '@/lib/auth';
import { StationOrder } from '@/components/shared/order-card';
import { getActiveTables, getAvailableProducts, getWaiterOrders } from '@/lib/data';
import { LogoutButton } from '@/components/shared/logout-button';
import { WaiterOrderingClient } from '@/components/shared/waiter-ordering-client';

export const dynamic = 'force-dynamic';

export default async function WaiterPage() {
  await requireRoles(['waiter', 'admin']);

  const tables = await getActiveTables();
  const products = await getAvailableProducts();
  const orders = await getWaiterOrders();

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Konobar</h1>
        <LogoutButton />
      </div>
      <WaiterOrderingClient tables={tables} products={products} activeOrders={orders as unknown as StationOrder[]} />
    </main>
  );
}
