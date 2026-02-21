'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export type TableOption = {
  id: string;
  number: string;
};

interface TableSelectorProps {
  tables: TableOption[];
  value: string;
  onChange: (value: string) => void;
}

export function TableSelector({ tables, value, onChange }: TableSelectorProps) {
  const [manualNumber, setManualNumber] = useState('');

  function handleManualInput(nextNumber: string) {
    setManualNumber(nextNumber);
    const found = tables.find((table) => table.number === nextNumber.trim());
    if (found) onChange(found.id);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="table">Sto</Label>
      <Select
        id="table"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        options={[
          { value: '', label: 'Odaberite sto' },
          ...tables.map((table) => ({ value: table.id, label: `Sto ${table.number}` })),
        ]}
      />
      <div className="space-y-1">
        <Label htmlFor="table-number" className="text-xs text-muted-foreground">
          Ili unesite broj stola
        </Label>
        <Input
          id="table-number"
          placeholder="npr. 4"
          value={manualNumber}
          onChange={(e) => handleManualInput(e.target.value)}
        />
      </div>
    </div>
  );
}
