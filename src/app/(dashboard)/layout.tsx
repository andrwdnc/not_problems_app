import { BottomNav } from '@/components/layout/BottomNav';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto max-w-md pb-24">
      <main className="px-4 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}