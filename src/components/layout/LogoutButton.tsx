'use client';

import { useRouter } from 'next/navigation';
import { logout } from '@/server-actions/auth-actions';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.refresh();
    router.push('/login');
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-brand-muted transition-colors hover:bg-brand-pale hover:text-brand-navy"
      aria-label="Cerrar sesión"
    >
      <LogOut size={16} />
      Salir
    </button>
  );
}
