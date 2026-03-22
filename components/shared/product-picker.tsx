'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DrinkSubcategory, ProductCategory } from '@/lib/types/database';

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  drink_subcategory?: DrinkSubcategory | null;
  price: number;
  is_available?: boolean;
};

export type DraftItem = {
  productId: string;
  qty: number;
  note?: string;
};

export type ShishaFlavor = {
  id: string;
  name: string;
  is_available?: boolean;
};

interface ProductPickerProps {
  products: Product[];
  shishaFlavors: ShishaFlavor[];
  items: DraftItem[];
  onChange: (items: DraftItem[]) => void;
  isLoading?: boolean;
}

export function ProductPicker({
  products,
  shishaFlavors,
  items,
  onChange,
  isLoading = false,
}: ProductPickerProps) {
  const iceNoteText = 'Sa ledom';
  const coffeeStyleOptions = ['Duza', 'Kratka', 'Obicna'] as const;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [activeCategory, setActiveCategory] = useState<ProductCategory>('drink');
  const [activeDrinkSubcategory, setActiveDrinkSubcategory] = useState<DrinkSubcategory>('cold');
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedShishaProductId, setSelectedShishaProductId] = useState('');
  const [selectedShishaFlavorIds, setSelectedShishaFlavorIds] = useState<string[]>([]);
  const [showShishaPickerCard, setShowShishaPickerCard] = useState(true);
  const [isCup, setIsCup] = useState(false);
  const [shishaCustomNote, setShishaCustomNote] = useState('');

  const selectableProducts = useMemo(
    () => products.filter((product) => product.is_available ?? true),
    [products]
  );
  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return selectableProducts.filter(
      (product) =>
        product.category === activeCategory &&
        (activeCategory !== 'drink' || product.drink_subcategory === activeDrinkSubcategory) &&
        (q ? product.name.toLowerCase().includes(q) : true)
    );
  }, [activeCategory, activeDrinkSubcategory, selectableProducts, search]);
  const selectedProducts = useMemo(
    () =>
      selectedProductIds
        .map((productId) => selectableProducts.find((product) => product.id === productId))
        .filter((product): product is Product => Boolean(product)),
    [selectedProductIds, selectableProducts]
  );
  const selectedShishaProduct = useMemo(
    () => selectableProducts.find((product) => product.id === selectedShishaProductId),
    [selectableProducts, selectedShishaProductId]
  );

  useEffect(() => {
    function onDocumentMouseDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function onDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', onDocumentMouseDown);
    document.addEventListener('keydown', onDocumentKeyDown);

    return () => {
      document.removeEventListener('mousedown', onDocumentMouseDown);
      document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, []);

  function updateDrink(productId: string, patch: Partial<DraftItem>) {
    const existing = items.find((item) => item.productId === productId);

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

  function selectProduct(productId: string) {
    if (activeCategory === 'drink') {
      setSelectedProductIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
    } else {
      setSelectedShishaProductId(productId);
      setSelectedShishaFlavorIds([]);
      setShowShishaPickerCard(true);
      setIsCup(false);
      setShishaCustomNote('');
    }
    setIsOpen(false);
    setSearch('');
  }

  function removeSelectedDrink(productId: string) {
    setSelectedProductIds((prev) => prev.filter((id) => id !== productId));
  }

  function addShishaItem() {
    if (!selectedShishaProductId || selectedShishaFlavorIds.length === 0 || selectedShishaFlavorIds.length > 3) return;

    const selectedFlavorNames = shishaFlavors
      .filter((flavor) => selectedShishaFlavorIds.includes(flavor.id))
      .map((flavor) => flavor.name);
    const flavorsText = isCup ? `(Ćup) ${selectedFlavorNames.join(', ')}` : selectedFlavorNames.join(', ');
    const extraNote = shishaCustomNote.trim();
    const shishaNote = extraNote ? `${flavorsText} | Napomena: ${extraNote}` : flavorsText;

    onChange([
      ...items,
      {
        productId: selectedShishaProductId,
        qty: 1,
        note: shishaNote,
      },
    ]);
    setSelectedShishaFlavorIds([]);
    setShowShishaPickerCard(false);
    setIsCup(false);
    setShishaCustomNote('');
  }

  function toggleShishaFlavor(flavorId: string) {
    setSelectedShishaFlavorIds((prev) => {
      if (prev.includes(flavorId)) {
        return prev.filter((id) => id !== flavorId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, flavorId];
    });
  }

  function getDrinkQty(productId: string) {
    return items
      .filter((item) => item.productId === productId)
      .reduce((sum, item) => sum + item.qty, 0);
  }

  function getDrinkNote(productId: string) {
    const note = items.find((item) => item.productId === productId)?.note ?? '';
    return stripDrinkMetaNotes(note);
  }

  function hasIceInDrinkNote(productId: string) {
    const note = items.find((item) => item.productId === productId)?.note ?? '';
    return note.toLowerCase().includes(iceNoteText.toLowerCase());
  }

  function getSelectedCoffeeStyle(productId: string) {
    const note = items.find((item) => item.productId === productId)?.note ?? '';
    const parts = note
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    return coffeeStyleOptions.find((option) =>
      parts.some((part) => part.toLowerCase() === option.toLowerCase())
    );
  }

  function stripDrinkMetaNotes(note: string) {
    return note
      .split(',')
      .map((part) => part.trim())
      .filter(
        (part) =>
          part &&
          part.toLowerCase() !== iceNoteText.toLowerCase() &&
          !coffeeStyleOptions.some((option) => option.toLowerCase() === part.toLowerCase())
      )
      .join(', ');
  }

  function mergeDrinkNote(
    customNote: string,
    includeIce: boolean,
    coffeeStyle?: (typeof coffeeStyleOptions)[number]
  ) {
    const parts = customNote
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (coffeeStyle) {
      parts.push(coffeeStyle);
    }
    if (includeIce) {
      parts.push(iceNoteText);
    }
    return parts.join(', ');
  }

  function isCoffeeDrink(product: Product) {
    const name = product.name.toLowerCase();
    return (
      name.includes('kafa') 
    );
  }

  const shishaEntriesForSelected = selectedShishaProductId
    ? items.filter((item) => item.productId === selectedShishaProductId && item.note?.trim())
    : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-md border bg-white/70 p-1">
        <Button
          type="button"
          variant={activeCategory === 'drink' ? 'default' : 'ghost'}
          onClick={() => {
            setActiveCategory('drink');
            setIsOpen(false);
            setSearch('');
          }}
        >
          Piće
        </Button>
        <Button
          type="button"
          variant={activeCategory === 'shisha' ? 'default' : 'ghost'}
          onClick={() => {
            setActiveCategory('shisha');
            setIsOpen(false);
            setSearch('');
          }}
        >
          Nargila
        </Button>
      </div>

      {activeCategory === 'drink' ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={activeDrinkSubcategory === 'cold' ? 'default' : 'outline'}
            className="h-8 rounded-full px-3 text-xs"
            onClick={() => setActiveDrinkSubcategory('cold')}
          >
            Hladno
          </Button>
          <Button
            type="button"
            variant={activeDrinkSubcategory === 'warm' ? 'default' : 'outline'}
            className="h-8 rounded-full px-3 text-xs"
            onClick={() => setActiveDrinkSubcategory('warm')}
          >
            Toplo
          </Button>
        </div>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="product-combobox">Odaberi proizvod</Label>
        <div ref={wrapperRef} className="relative">
          <Button
            id="product-combobox"
            type="button"
            variant="outline"
            className="h-11 w-full justify-between px-3"
            onClick={() => setIsOpen((prev) => !prev)}
            disabled={isLoading}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          >
            <span className="truncate text-left">
              {activeCategory === 'drink'
                ? selectedProducts.length > 0
                  ? 'Dodaj još pića...'
                  : 'Pretraži i odaberi piće...'
                : selectedShishaProduct
                  ? 'Promijeni nargilu...'
                  : 'Pretraži i odaberi nargilu...'}
            </span>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronsUpDown className="h-4 w-4 opacity-50" />}
          </Button>
          {isOpen ? (
            <div className="absolute z-30 mt-2 w-full rounded-md border bg-white p-2 shadow-md">
              <Input
                placeholder="Upiši naziv proizvoda..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-2"
                autoFocus
              />
              <div className="max-h-60 overflow-y-auto" role="listbox" aria-label="Proizvodi">
                {isLoading ? (
                  <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Učitavanje proizvoda...
                  </div>
                ) : visibleProducts.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No products found</p>
                ) : (
                  visibleProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-sm px-2 py-2 text-left text-sm hover:bg-orange-50"
                      onClick={() => selectProduct(product.id)}
                    >
                      <span className="truncate">{product.name}</span>
                      <Check
                        className={cn(
                          'h-4 w-4',
                          activeCategory === 'drink'
                            ? selectedProductIds.includes(product.id)
                              ? 'opacity-100'
                              : 'opacity-0'
                            : product.id === selectedShishaProductId
                              ? 'opacity-100'
                              : 'opacity-0'
                        )}
                      />
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <Card className="border-orange-200/60 bg-white/80">
          <CardContent className="space-y-3 p-4">
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-10 w-20 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && activeCategory === 'drink'
        ? selectedProducts.map((selectedProduct) => (
            <Card key={selectedProduct.id} className="border-orange-200/60 bg-white/80">
              <CardContent className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-sm">{selectedProduct.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{formatCurrency(selectedProduct.price)}</p>
                  </div>
                  <div className="flex shrink-0  gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 min-w-14 px-2 text-xs"
                      onClick={() => updateDrink(selectedProduct.id, { qty: getDrinkQty(selectedProduct.id) + 1 })}
                    >
                      +1
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      onClick={() => removeSelectedDrink(selectedProduct.id)}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Napomena (opcionalno)</Label>
                  <Textarea
                    placeholder="npr. kafa sa hladnim mlijekom"
                    className="min-h-12 py-2 text-xs"
                    value={getDrinkNote(selectedProduct.id)}
                    onChange={(e) =>
                      updateDrink(selectedProduct.id, {
                        note: mergeDrinkNote(
                          e.target.value,
                          hasIceInDrinkNote(selectedProduct.id),
                          getSelectedCoffeeStyle(selectedProduct.id)
                        ),
                      })
                    }
                  />
                </div>
                {isCoffeeDrink(selectedProduct) ? (
                  <div className="space-y-1">
                    <Label className="text-[11px]">Kafa</Label>
                    <div className="flex flex-wrap gap-2">
                      {coffeeStyleOptions.map((option) => {
                        const isSelected = getSelectedCoffeeStyle(selectedProduct.id) === option;
                        return (
                          <Button
                            key={option}
                            type="button"
                            variant={isSelected ? 'default' : 'outline'}
                            className="h-7 rounded-full px-3 text-[11px]"
                            onClick={() =>
                              updateDrink(selectedProduct.id, {
                                note: mergeDrinkNote(
                                  getDrinkNote(selectedProduct.id),
                                  hasIceInDrinkNote(selectedProduct.id),
                                  isSelected ? undefined : option
                                ),
                              })
                            }
                          >
                            {option}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {selectedProduct.drink_subcategory === 'cold' ? (
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={hasIceInDrinkNote(selectedProduct.id)}
                      onChange={(e) =>
                        updateDrink(selectedProduct.id, {
                          note: mergeDrinkNote(
                            getDrinkNote(selectedProduct.id),
                            e.target.checked,
                            getSelectedCoffeeStyle(selectedProduct.id)
                          ),
                        })
                      }
                    />
                    Led
                  </label>
                ) : null}
                {getDrinkQty(selectedProduct.id) > 0 ? (
                  <p className="text-xs text-muted-foreground">U narudžbi: {getDrinkQty(selectedProduct.id)}</p>
                ) : null}
              </CardContent>
            </Card>
          ))
        : null}

      {!isLoading && activeCategory === 'shisha' && selectedShishaProduct && showShishaPickerCard ? (
        <Card className="border-orange-200/60 bg-white/80">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-sm">{selectedShishaProduct.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <p className="text-xs text-muted-foreground">{formatCurrency(selectedShishaProduct.price)}</p>
            <div className="space-y-1">
              <Label className="text-xs">Odaberi do 3 okusa (obavezno)</Label>
              <div className="grid grid-cols-2 gap-2">
                {shishaFlavors.map((flavor) => {
                  const isSelected = selectedShishaFlavorIds.includes(flavor.id);
                  return (
                    <Button
                      key={flavor.id}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      className="h-10 justify-start px-3 text-xs"
                      onClick={() => toggleShishaFlavor(flavor.id)}
                    >
                      {flavor.name}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Odabrano: {selectedShishaFlavorIds.length}/3
              </p>
              {selectedShishaFlavorIds.length === 0 ? (
                <p className="text-xs text-destructive">Odaberi bar jedan okus.</p>
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={isCup}
                onChange={(e) => setIsCup(e.target.checked)}
              />
              Ćup
            </label>
            <div className="space-y-1">
              <Label className="text-xs">Napomena (opcionalno)</Label>
              <Textarea
                placeholder="npr. manje swissa"
                className="min-h-12 py-2 text-xs"
                value={shishaCustomNote}
                onChange={(e) => setShishaCustomNote(e.target.value)}
                maxLength={120}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="h-9 min-w-16 px-3 text-xs"
              disabled={selectedShishaFlavorIds.length === 0}
              onClick={addShishaItem}
            >
              Dodaj
            </Button>
            {shishaEntriesForSelected.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Dodane nargile za ovaj proizvod: {shishaEntriesForSelected.length}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && activeCategory === 'shisha' && selectedShishaProduct && !showShishaPickerCard ? (
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full"
          onClick={() => {
            setSelectedShishaFlavorIds([]);
            setIsCup(false);
            setShishaCustomNote('');
            setShowShishaPickerCard(true);
          }}
        >
          Dodaj još jednu nargilu
        </Button>
      ) : null}

      {!isLoading && activeCategory === 'shisha' && !selectedShishaProduct ? (
        <p className="text-sm text-muted-foreground">Odaberi nargilu iz pretrage.</p>
      ) : null}
    </div>
  );
}
