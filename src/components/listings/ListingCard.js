'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import { formatPaise } from '@/lib/money';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { HeartIcon, MapPinIcon, GavelIcon } from '@/components/ui/Icons';
import { cloudinaryUrl } from '@/lib/cloudinary';

/**
 * @param {string} [ribbon] - Homepage shelf ka label ("Featured" / "Top pick").
 *   Ye Fixed Price/Auction badge ko REPLACE nahi karta — uske saath dikhta hai,
 *   kyunki listing type functional info hai aur ribbon sirf shelf ki pehchaan.
 */
export default function ListingCard({
  listing,
  initialWishlisted = false,
  onWishlistChange,
  ribbon,
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [busy, setBusy] = useState(false);

  const coverImage = listing.media?.[0];
  const isAuction = listing.listingType === 'auction';
  const brand = listing.specifications?.general?.brand;

  async function handleWishlist(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push('/login');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const result = await api.post(`/listings/${listing._id}/wishlist`, {}, 'user');
      setWishlisted(result.added);
      onWishlistChange?.(result.added, listing);
    } catch {
      // Non-critical — leave the UI as-is if this fails.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Link
      href={`/listings/${listing.slug || listing._id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cloudinaryUrl(coverImage.fileKey)}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            No photo available
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          <Badge status={isAuction ? 'live' : 'active'}>
            {isAuction ? (
              <span className="flex items-center gap-1">
                <GavelIcon className="h-3 w-3" /> Auction
              </span>
            ) : (
              'Fixed Price'
            )}
          </Badge>
          {ribbon && (
            <span className="inline-flex items-center rounded-full bg-ink-900/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-400 ring-1 ring-inset ring-white/15 backdrop-blur">
              {ribbon}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-ink-900/80 text-slate-500 ring-1 ring-slate-300/60 backdrop-blur transition-colors hover:text-red-500"
        >
          <HeartIcon className={`h-4 w-4 ${wishlisted ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
            {listing.title}
          </h3>
        </div>

        {(brand || listing.condition) && (
          <p className="mt-1 text-xs text-slate-500">
            {[brand, listing.condition].filter(Boolean).join(' · ')}
          </p>
        )}

        {listing.location?.state && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
            <MapPinIcon className="h-3.5 w-3.5 text-slate-400" />
            {[listing.location.city, listing.location.state].filter(Boolean).join(', ')}
            {typeof listing.distanceKm === 'number' && (
              <span className="ml-1 font-medium text-brand-700">
                · {listing.distanceKm < 1 ? '<1 km' : `${listing.distanceKm.toFixed(0)} km`} away
              </span>
            )}
          </p>
        )}

        <div className="mt-auto pt-3">
          <p className="text-base font-bold tracking-tight text-brand-800">
            {isAuction ? 'Bidding in progress' : formatPaise(listing.fixedPricePaise)}
          </p>
          {!isAuction && listing.totalQuantity > 1 && (
            <p className="mt-0.5 text-xs text-slate-500">
              {listing.quantityAvailable} of {listing.totalQuantity} units available
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
