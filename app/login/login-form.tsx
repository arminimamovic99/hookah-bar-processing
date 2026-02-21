'use client';

import { useActionState } from 'react';
import { loginAction } from '@/app/actions/auth-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type AuthState = {
  error: string | null;
};

const initialState: AuthState = {
  error: null,
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <Card className="w-full border-orange-300 bg-white/90">
      <CardHeader>
        <CardTitle>Naručivanje u shisha baru</CardTitle>
        <CardDescription>Prijavite se svojim Supabase korisničkim računom.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="email">Email adresa</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Lozinka</Label>
            <Input id="password" name="password" type="password" required />
          </div>

          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Prijava u toku...' : 'Prijavi se'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
