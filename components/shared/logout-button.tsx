import { logoutAction } from '@/app/actions/auth-actions';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" size="sm">
        Odjavi se
      </Button>
    </form>
  );
}
