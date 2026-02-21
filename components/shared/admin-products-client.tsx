'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createProductAction, deleteProductAction, updateProductAction } from '@/app/actions/admin-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { formatCurrency } from '@/lib/format';
import { ProductCategory } from '@/lib/types/database';

type ProductRow = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  is_available: boolean;
};

export function AdminProductsClient({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('drink');
  const [price, setPrice] = useState('0');

  function createProduct() {
    setError(null);
    startTransition(async () => {
      const result = await createProductAction({
        name,
        category,
        price: Number(price),
        isAvailable: true,
      });
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setName('');
      setPrice('0');
      router.refresh();
    });
  }

  function updateProduct(product: ProductRow, patch: Partial<ProductRow>) {
    setError(null);
    startTransition(async () => {
      const result = await updateProductAction({
        id: product.id,
        name: patch.name ?? product.name,
        category: patch.category ?? product.category,
        price: patch.price ?? product.price,
        isAvailable: patch.is_available ?? product.is_available,
      });
      if ('error' in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function removeProduct(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteProductAction(id);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Dodaj proizvod</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label>Naziv</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Kategorija</Label>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory)}
              options={[
                { value: 'drink', label: 'Piće' },
                { value: 'shisha', label: 'Nargila' },
              ]}
            />
          </div>
          <div className="space-y-1">
            <Label>Cijena</Label>
            <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button disabled={isPending} onClick={createProduct} className="w-full">
              Kreiraj
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3">
        {products.map((product) => (
          <Card key={product.id} className="bg-white/90">
            <CardContent className="grid gap-3 p-4 md:grid-cols-6">
              <Input defaultValue={product.name} onBlur={(e) => updateProduct(product, { name: e.target.value })} />
              <Select
                defaultValue={product.category}
                onChange={(e) => updateProduct(product, { category: e.target.value as ProductCategory })}
                options={[
                  { value: 'drink', label: 'Piće' },
                  { value: 'shisha', label: 'Nargila' },
                ]}
              />
              <Input
                type="number"
                defaultValue={product.price}
                onBlur={(e) => updateProduct(product, { price: Number(e.target.value) })}
              />
              <Button
                variant={product.is_available ? 'secondary' : 'outline'}
                onClick={() => updateProduct(product, { is_available: !product.is_available })}
              >
                {product.is_available ? 'Dostupno' : 'Nedostupno'}
              </Button>
              <p className="flex items-center text-sm text-muted-foreground">{formatCurrency(product.price)}</p>
              <Button variant="destructive" onClick={() => removeProduct(product.id)}>
                Obriši
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
