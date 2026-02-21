import { LogoutButton } from '@/components/shared/logout-button';
import { StationOrder } from '@/components/shared/order-card';
import { StationBoardClient } from '@/components/shared/station-board-client';
import { requireRoles } from '@/lib/auth';
import { getStationOrders } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function ShishaStationPage() {
  await requireRoles(['shisha', 'admin']);
  const orders = await getStationOrders('shisha');

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Nargila stanica</h1>
        <LogoutButton />
      </div>
      <StationBoardClient orders={orders as unknown as StationOrder[]} station="shisha" grid />
    </main>
  );
}
