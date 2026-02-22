'use client';

import { useEffect, useState, useTransition } from 'react';
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
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('drink');
  const [price, setPrice] = useState('0');
  const [edits, setEdits] = useState<Record<string, { name: string; category: ProductCategory; price: string }>>({});

  useEffect(() => {
    const next: Record<string, { name: string; category: ProductCategory; price: string }> = {};
    for (const product of products) {
      next[product.id] = {
        name: product.name,
        category: product.category,
        price: String(product.price),
      };
    }
    setEdits(next);
  }, [products]);

  function createProduct() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await createProductAction({
        name,
        category,
        price: Number(price),
        isAvailable: true,
      });
      if ('error' in result) {
        setError(result.error ?? 'Došlo je do greške.');
        return;
      }
      setName('');
      setPrice('0');
      setSuccess('Proizvod je uspješno kreiran.');
      router.refresh();
    });
  }

  function saveProduct(product: ProductRow) {
    const draft = edits[product.id];
    if (!draft) return;

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateProductAction({
        id: product.id,
        name: draft.name,
        category: draft.category,
        price: Number(draft.price),
        isAvailable: product.is_available,
      });
      if ('error' in result) {
        setError(result.error ?? 'Došlo je do greške.');
        return;
      }
      setSuccess('Proizvod je uspješno ažuriran.');
      router.refresh();
    });
  }

  function updateAvailability(product: ProductRow) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const draft = edits[product.id];
      const result = await updateProductAction({
        id: product.id,
        name: draft?.name ?? product.name,
        category: draft?.category ?? product.category,
        price: Number(draft?.price ?? product.price),
        isAvailable: !product.is_available,
      });
      if ('error' in result) {
        setError(result.error ?? 'Došlo je do greške.');
        return;
      }
      setSuccess('Dostupnost je uspješno ažurirana.');
      router.refresh();
    });
  }

  function removeProduct(id: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await deleteProductAction(id);
      if ('error' in result) {
        setError(result.error ?? 'Došlo je do greške.');
        return;
      }
      setSuccess('Proizvod je obrisan.');
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
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <div className="grid gap-3">
        {products.map((product) => (
          <Card key={product.id} className="bg-white/90">
            <CardContent className="grid gap-3 p-4 md:grid-cols-6">
              <Input
                value={edits[product.id]?.name ?? ''}
                onChange={(e) =>
                  setEdits((prev) => ({
                    ...prev,
                    [product.id]: {
                      name: e.target.value,
                      category: prev[product.id]?.category ?? product.category,
                      price: prev[product.id]?.price ?? String(product.price),
                    },
                  }))
                }
              />
              <Select
                value={edits[product.id]?.category ?? product.category}
                onChange={(e) =>
                  setEdits((prev) => ({
                    ...prev,
                    [product.id]: {
                      name: prev[product.id]?.name ?? product.name,
                      category: e.target.value as ProductCategory,
                      price: prev[product.id]?.price ?? String(product.price),
                    },
                  }))
                }
                options={[
                  { value: 'drink', label: 'Piće' },
                  { value: 'shisha', label: 'Nargila' },
                ]}
              />
              <Input
                type="number"
                value={edits[product.id]?.price ?? String(product.price)}
                onChange={(e) =>
                  setEdits((prev) => ({
                    ...prev,
                    [product.id]: {
                      name: prev[product.id]?.name ?? product.name,
                      category: prev[product.id]?.category ?? product.category,
                      price: e.target.value,
                    },
                  }))
                }
              />
              <Button
                variant={product.is_available ? 'secondary' : 'outline'}
                onClick={() => updateAvailability(product)}
              >
                {product.is_available ? 'Dostupno' : 'Nedostupno'}
              </Button>
              <Button variant="outline" onClick={() => saveProduct(product)}>
                Sačuvaj
              </Button>
              <Button variant="destructive" onClick={() => removeProduct(product.id)}>
                Obriši
              </Button>
            </CardContent>
            <div className="px-4 pb-3 text-sm text-muted-foreground">
              Trenutna cijena: {formatCurrency(product.price)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
