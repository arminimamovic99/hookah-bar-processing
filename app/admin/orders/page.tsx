import { AdminOrdersDashboard } from '@/components/shared/admin-orders-dashboard';
import { LogoutButton } from '@/components/shared/logout-button';
import { requireRoles } from '@/lib/auth';
import { getAdminOrdersDataset, getAllProducts } from '@/lib/data';
import { ProductCategory } from '@/lib/types/database';

export const dynamic = 'force-dynamic';

type DashboardOrder = {
  id: string;
  status: 'new' | 'in_progress' | 'completed' | 'archived';
  created_at: string;
  closed_at: string | null;
  tables: { number: string } | null;
  order_station_status:
    | { bar_status: 'pending' | 'done'; shisha_status: 'pending' | 'done' }
    | { bar_status: 'pending' | 'done'; shisha_status: 'pending' | 'done' }[]
    | null;
  order_items:
    | {
        id: string;
        qty: number;
        note: string | null;
        products: {
          id: string;
          name: string;
          category: ProductCategory;
          price: number;
        } | null;
      }[]
    | null;
};

export default async function AdminOrdersPage() {
  await requireRoles(['admin']);

  const [ordersRaw, productsRaw] = await Promise.all([getAdminOrdersDataset(), getAllProducts()]);
  const orders = ordersRaw as DashboardOrder[];
  const products = productsRaw.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
  }));

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Admin · Narudžbe</h1>
        <LogoutButton />
      </div>

      <AdminOrdersDashboard orders={orders} products={products} />
    </main>
  );
}
