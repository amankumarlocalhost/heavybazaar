'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Spinner from '@/components/ui/Spinner';
import { ChartIcon, PackageIcon, PlusIcon } from '@/components/ui/Icons';

const NAV_ITEMS = [
  { href: '/seller', label: 'Dashboard', icon: ChartIcon },
  { href: '/seller/listings', label: 'My Listings', icon: PackageIcon },
  { href: '/seller/listings/new', label: 'Post Equipment', icon: PlusIcon },
];

export default function SellerLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!user.roles?.includes('seller')) {
      router.push('/');
    }
  }, [loading, user, router]);

  if (loading || !user || !user.roles?.includes('seller')) {
    return <Spinner className="min-h-[70vh]" />;
  }

  return (
    <div className="mx-auto min-h-[80vh] max-w-6xl px-4 py-8 sm:px-6">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
        <aside>
          <nav className="space-y-1 md:sticky md:top-24">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-50 text-brand-800'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${active ? 'text-brand-700' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
