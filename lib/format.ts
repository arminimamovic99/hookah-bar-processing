export function formatCurrency(value: number) {
  return new Intl.NumberFormat('bs-BA', { style: 'currency', currency: 'BAM' }).format(value);
}

export function formatDateTime(iso: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));

  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '';

  return `${day} ${month} ${hour}:${minute}`;
}
