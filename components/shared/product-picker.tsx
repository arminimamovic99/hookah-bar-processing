'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/format';
import { ProductCategory } from '@/lib/types/database';

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
};

export type DraftItem = {
  productId: string;
  qty: number;
  note?: string;
};

interface ProductPickerProps {
  products: Product[];
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
}

export function ProductPicker({ products, items, onChange }: ProductPickerProps) {
  const [activeCategory, setActiveCategory] = useState<ProductCategory>('drink');
  const [search, setSearch] = useState('');

  const grouped = useMemo(
    () => ({
      drink: products.filter((p) => p.category === 'drink'),
      shisha: products.filter((p) => p.category === 'shisha'),
    }),
    [products]
  );

  const current = useMemo(() => new Map(items.map((i) => [i.productId, i])), [items]);
  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return grouped[activeCategory].filter((product) =>
      q ? product.name.toLowerCase().includes(q) : true
    );
  }, [activeCategory, grouped, search]);

  function update(productId: string, patch: Partial<DraftItem>) {
    const existing = current.get(productId);

    const nextItem: DraftItem = {
      productId,
      qty: patch.qty ?? existing?.qty ?? 1,
      note: patch.note ?? existing?.note,
    };

    const next = items.filter((item) => item.productId !== productId);

    if (nextItem.qty > 0) {
      next.push(nextItem);
    }

    onChange(next);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-md border bg-white/70 p-1">
        <Button
          type="button"
          variant={activeCategory === 'drink' ? 'default' : 'ghost'}
          onClick={() => setActiveCategory('drink')}
        >
          Piće
        </Button>
        <Button
          type="button"
          variant={activeCategory === 'shisha' ? 'default' : 'ghost'}
          onClick={() => setActiveCategory('shisha')}
        >
          Nargila
        </Button>
      </div>

      <div className="space-y-1">
        <Label htmlFor="product-search">Pretraga proizvoda</Label>
        <Input
          id="product-search"
          placeholder={activeCategory === 'drink' ? 'Pretraži piće...' : 'Pretraži nargilu...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {visibleProducts.map((product) => {
          const item = current.get(product.id);
          return (
            <Card key={product.id} className="border-orange-200/60 bg-white/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{product.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{formatCurrency(product.price)}</p>
                <div className="flex items-end gap-2">
                  <div className="w-20 space-y-1">
                    <Label className="text-xs">Količina</Label>
                    <Input
                      type="number"
                      min={0}
                      value={item?.qty ?? 0}
                      onChange={(e) => update(product.id, { qty: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => update(product.id, { qty: (item?.qty ?? 0) + 1 })}
                  >
                    +1
                  </Button>
                </div>
                {(item?.qty ?? 0) > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {product.category === 'shisha' ? 'Mješavina okusa (obavezno)' : 'Napomena (opcionalno)'}
                    </Label>
                    <Textarea
                      placeholder={
                        product.category === 'shisha'
                          ? 'npr. swiss ice, limun borovnica'
                          : 'npr. bez leda'
                      }
                      value={item?.note ?? ''}
                      onChange={(e) => update(product.id, { note: e.target.value })}
                    />
                    {product.category === 'shisha' && !item?.note?.trim() ? (
                      <p className="text-xs text-destructive">Mješavina okusa je obavezna.</p>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {visibleProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nema proizvoda za ovu pretragu.</p>
        ) : null}
      </div>
    </div>
  );
}
