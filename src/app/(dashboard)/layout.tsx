import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Repeat } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';
import { NavigationShell } from '@/components/layout/NavigationShell';
import { LogoutButton } from '@/components/layout/LogoutButton';
import { getCurrentUser } from '@/server/auth';
import { chooser } from '@/literals';

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-30 flex shrink-0 items-center justify-between border-b border-brand-border bg-brand-surface/95 px-4 py-3 backdrop-blur">
        <span className="min-w-0 truncate text-sm font-semibold text-brand-navy">
          {user.username}
        </span>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm font-medium text-brand-primary"
          >
            <Repeat size={14} />
            {chooser.volver}
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="min-w-0 flex-1 px-4 pb-28 pt-4">
        <NavigationShell>{children}</NavigationShell>
      </main>
      <BottomNav />
    </div>
  );
}
