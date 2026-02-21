import { AdminProductsClient } from '@/components/shared/admin-products-client';
import { LogoutButton } from '@/components/shared/logout-button';
import { requireRoles } from '@/lib/auth';
import { getAllProducts } from '@/lib/data';
import { ProductCategory } from '@/lib/types/database';

export const dynamic = 'force-dynamic';

type ProductRow = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  is_available: boolean;
};

export default async function AdminProductsPage() {
  await requireRoles(['admin']);
  const products = await getAllProducts();

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Admin · Proizvodi</h1>
        <LogoutButton />
      </div>
      <AdminProductsClient products={products as unknown as ProductRow[]} />
    </main>
  );
}
