export function formatCurrency(value: number) {
  return new Intl.NumberFormat('bs-BA', { style: 'currency', currency: 'BAM' }).format(value);
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('bs-BA', {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso));
}
