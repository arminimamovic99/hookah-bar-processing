'use client';

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
    </div>
  );
}
