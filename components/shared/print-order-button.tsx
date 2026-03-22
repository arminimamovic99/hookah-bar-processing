'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

type PrintItem = {
  qty: number;
  name: string;
  note?: string | null;
};

interface PrintOrderButtonProps {
  tableNumber: string;
  items: PrintItem[];
  className?: string;
}

export function PrintOrderButton({ tableNumber, items, className }: PrintOrderButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function queuePrint() {
    setIsPending(true);
    setFeedback(null);
    try {
      const lines = items.map((item) =>
        item.note?.trim()
          ? item.name.trim().toLowerCase() === 'nargila'
            ? item.note.trim()
            : `${item.qty}x ${item.name} - ${item.note.trim()}`
          : `${item.qty}x ${item.name}`
      );

      const res = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber,
          items: lines,
        }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        setFeedback(payload.error ?? 'Greška pri slanju na print.');
        return;
      }

      setFeedback('Poslano na print.');
    } catch {
      setFeedback('Greška pri slanju na print.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant="outline" size="sm" className={className} onClick={queuePrint} disabled={isPending}>
        {isPending ? 'Slanje...' : 'Print'}
      </Button>
      {feedback ? <p className="text-xs text-muted-foreground">{feedback}</p> : null}
    </div>
  );
}
