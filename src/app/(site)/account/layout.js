'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Spinner from '@/components/ui/Spinner';
import { TabLinks } from '@/components/ui/Tabs';

const TABS = [
  { href: '/account', label: 'Profile' },
  { href: '/account/kyc', label: 'KYC' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/bids', label: 'My Bids' },
  { href: '/account/wallet', label: 'Wallet' },
  { href: '/account/wishlist', label: 'Wishlist' },
  { href: '/account/notifications', label: 'Notifications' },
  { href: '/account/support', label: 'Support' },
];

export default function AccountLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) return <Spinner className="min-h-[70vh]" />;

  return (
    <div className="mx-auto min-h-[80vh] max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-5 text-2xl font-bold tracking-tight text-slate-900">My Account</h1>

      <TabLinks items={TABS} activeHref={pathname} className="mb-8" />

      {children}
    </div>
  );
}
