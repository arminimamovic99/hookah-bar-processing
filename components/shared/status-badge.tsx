import { Badge } from '@/components/ui/badge';
import { OrderStatus, StationStatus } from '@/lib/types/database';

function labelForStatus(status: OrderStatus | StationStatus) {
  if (status === 'new') return 'Novo';
  if (status === 'in_progress') return 'U toku';
  if (status === 'completed') return 'Završeno';
  if (status === 'pending') return 'Čeka';
  if (status === 'done') return 'Gotovo';
  return status;
}

export function StatusBadge({
  status,
}: {
  status: OrderStatus | StationStatus;
}) {
  if (status === 'completed' || status === 'done') {
    return <Badge variant="success">{labelForStatus(status)}</Badge>;
  }

  if (status === 'in_progress' || status === 'pending') {
    return <Badge variant="warning">{labelForStatus(status)}</Badge>;
  }

  return <Badge variant="muted">{labelForStatus(status)}</Badge>;
}
