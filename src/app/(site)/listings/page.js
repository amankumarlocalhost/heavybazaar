'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { sortForFilter } from '@/lib/listings';
import {
  hasGeolocationSupport,
  wasPermissionDeniedThisSession,
  getCurrentPosition,
  getSavedBuyerLocation,
  saveBuyerLocation,
  clearSavedBuyerLocation,
} from '@/lib/geolocation';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import ListingCard from '@/components/listings/ListingCard';
import { ListingGridSkeleton } from '@/components/ui/Skeleton';
import { SearchIcon, FilterIcon, MapPinIcon } from '@/components/ui/Icons';

const PAGE_SIZE = 12;

const CONDITIONS = [
  { value: '', label: 'Any condition' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
];

const LISTING_TYPES = [
  { value: '', label: 'All listings' },
  { value: 'fixed_price', label: 'Fixed price' },
  { value: 'auction', label: 'Auction' },
];

/**
 * Homepage shelves (`?filter=`) yahi page kholte hain — alag page nahi, taaki
 * filters/pagination/card sab ek hi jagah rahein. Filter sirf DEFAULT ordering
 * aur heading badalta hai; user phir bhi sort dropdown se override kar sakta hai.
 */
const SHELVES = {
  latest: {
    title: 'Latest equipment',
    description: 'Freshly added equipment from verified sellers.',
  },
  featured: {
    title: 'Featured equipment',
    description: 'Handpicked equipment from trusted sellers.',
  },
  popular: {
    title: 'Popular equipment',
    description: 'Equipment buyers are looking for right now.',
  },
};

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

// Sirf tab dikhta hai jab buyer ki location maloom hai (GPS-detect) —
// backend pehle se hi nearest-first bhejta hai, ye value bas useMemo ko
// batata hai ki us order ko chheda na jaaye.
const NEAREST_SORT = { value: 'nearest', label: 'Nearest first' };

function BrowseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryId = searchParams.get('categoryId') || '';
  const shelf = searchParams.get('filter') || '';
  const shelfCopy = SHELVES[shelf];

  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [listingType, setListingType] = useState(searchParams.get('listingType') || '');
  // Homepage hero apne Condition/Location filters inhi params me bhejta hai,
  // isliye ye bhi URL se seed hote hain (search/listingType ki tarah).
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [state, setState] = useState(searchParams.get('state') || '');
  const [brand, setBrand] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('newest');

  // ---- Buyer location (auto-detect + manual override) ----
  // `locationMode` 'gps' | 'manual' | null. null = no location set, browse
  // behaves exactly as before (no server-side geo sort/filter).
  const [locationMode, setLocationMode] = useState(null);
  const [buyerGeo, setBuyerGeo] = useState(null); // {lat,lng} — sirf browser me rehta hai, kabhi save nahi hota DB me
  const [locationLabel, setLocationLabel] = useState('');
  const [locating, setLocating] = useState(false);
  const [locateDenied, setLocateDenied] = useState(false);
  const [manualLocationOpen, setManualLocationOpen] = useState(false);
  const [manualState, setManualState] = useState('');
  const [manualCity, setManualCity] = useState('');
  // hasGeolocationSupport() checks `typeof window` — calling it directly
  // during render gives the server (no window) and client (has window)
  // different output for the same markup, which is a hydration mismatch.
  // Starting false (matches SSR) and flipping it in an effect keeps first
  // paint identical on both sides; the button just appears a tick after
  // mount on browsers that support it.
  const [geoSupported, setGeoSupported] = useState(false);

  async function detectLocation() {
    setLocating(true);
    setLocateDenied(false);
    try {
      const pos = await getCurrentPosition();
      setBuyerGeo(pos);
      setLocationMode('gps');
      // Buyer ne khud koi sort nahi chuna tha — location detect hote hi
      // default "nearest first" ban jaata hai (auto-prioritize, koi filter
      // apply karne ki zaroorat nahi).
      setSort((prev) => (prev === 'newest' ? 'nearest' : prev));
      try {
        const addr = await api.get(`/listings/geo/reverse?lat=${pos.lat}&lng=${pos.lng}`);
        const label = [addr.city, addr.state].filter(Boolean).join(', ');
        setLocationLabel(label);
        saveBuyerLocation({ mode: 'gps', lat: pos.lat, lng: pos.lng, label });
      } catch {
        saveBuyerLocation({ mode: 'gps', lat: pos.lat, lng: pos.lng });
      }
    } catch (err) {
      // PERMISSION_DENIED === 1 — website normal kaam karta rahega,
      // dobara auto-prompt nahi hoga (getCurrentPosition khud yaad rakhta hai)
      if (err.code === 1) setLocateDenied(true);
    } finally {
      setLocating(false);
    }
  }

  function applyManualLocation() {
    const label = [manualCity, manualState].filter(Boolean).join(', ');
    setLocationMode(manualState || manualCity ? 'manual' : null);
    setBuyerGeo(null); // manual selection GPS ko override karta hai
    setLocationLabel(label);
    if (manualState || manualCity) {
      saveBuyerLocation({ mode: 'manual', state: manualState, city: manualCity, label });
    } else {
      clearSavedBuyerLocation();
    }
    setManualLocationOpen(false);
  }

  function clearLocation() {
    setLocationMode(null);
    setBuyerGeo(null);
    setLocationLabel('');
    setManualState('');
    setManualCity('');
    clearSavedBuyerLocation();
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only capability check, not a sync loop
    setGeoSupported(hasGeolocationSupport());

    // Pehle dekho browser me pehle se koi buyer location saved hai (is
    // visitor ne pehle detect/select ki thi) — agar hai to dobara GPS
    // prompt na karo, wahi use karo.
    const saved = getSavedBuyerLocation();
    if (saved?.mode === 'gps' && saved.lat != null) {
      // Restoring what THIS browser already chose on a previous visit —
      // one-time hydration from localStorage, not a reactive sync loop.
      setBuyerGeo({ lat: saved.lat, lng: saved.lng });
      setLocationMode('gps');
      setLocationLabel(saved.label || '');
      setSort((prev) => (prev === 'newest' ? 'nearest' : prev));
      return;
    }
    if (saved?.mode === 'manual' && (saved.state || saved.city)) {
      setManualState(saved.state || '');
      setManualCity(saved.city || '');
      setLocationMode('manual');
      setLocationLabel(saved.label || '');
      return;
    }

    // Kuch saved nahi hai — ek baar silently GPS try karo (buyer ko koi
    // button dabana nahi pada). Deny ho ya unsupported ho to bas normal
    // browse dikhega, koi break nahi hota.
    if (hasGeolocationSupport() && !wasPermissionDeniedThisSession()) {
      detectLocation();
    }
  }, []);

  useEffect(() => {
    api.get('/categories').then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    async function loadListings() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ sort: 'newest', limit: '60' });
        if (categoryId) params.set('categoryId', categoryId);
        if (search) params.set('search', search);

        // Buyer location diya hai to backend $geoNear se nearest-first
        // sorted results dega — koi extra filter apply karne ki zaroorat
        // nahi (doc ka core requirement).
        if (locationMode === 'gps' && buyerGeo) {
          params.set('lat', String(buyerGeo.lat));
          params.set('lng', String(buyerGeo.lng));
        } else if (locationMode === 'manual') {
          if (manualState) params.set('state', manualState);
          if (manualCity) params.set('city', manualCity);
        }

        const result = await api.get(`/listings/browse?${params.toString()}`);
        setListings(result.items);
      } catch {
        setError('Unable to load listings.');
      } finally {
        setLoading(false);
      }
    }
    loadListings();
  }, [categoryId, search, locationMode, buyerGeo, manualState, manualCity]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pagination when filters change
    setPage(1);
  }, [listingType, condition, state, brand, minPrice, maxPrice, sort, search, categoryId, shelf]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search) params.set('search', search);
    else params.delete('search');
    router.push(`/listings?${params.toString()}`);
  }

  // Brand ki koi alag API nahi hai — options wahi listings se aate hain jo
  // pehle se load ho chuki hain, isliye ek bhi extra request nahi lagti.
  const brands = useMemo(() => {
    const set = new Set(
      listings.map((l) => l.specifications?.general?.brand).filter(Boolean)
    );
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [listings]);

  const filtered = useMemo(() => {
    let items = [...listings];

    if (listingType) items = items.filter((l) => l.listingType === listingType);
    if (condition) items = items.filter((l) => l.condition === condition);
    if (brand) items = items.filter((l) => l.specifications?.general?.brand === brand);
    if (state) {
      const q = state.trim().toLowerCase();
      items = items.filter((l) => l.location?.state?.toLowerCase().includes(q));
    }
    if (minPrice) {
      const min = Number(minPrice) * 100;
      items = items.filter((l) => l.listingType !== 'fixed_price' || (l.fixedPricePaise ?? 0) >= min);
    }
    if (maxPrice) {
      const max = Number(maxPrice) * 100;
      items = items.filter((l) => l.listingType !== 'fixed_price' || (l.fixedPricePaise ?? 0) <= max);
    }

    // 'nearest' ka matlab hai: backend ne already distance se sort karke
    // bheja hai ($geoNear) — is order ko yahan dobara mat chhedo.
    if (sort === 'nearest') return items;

    // Sort dropdown chhua nahi gaya to shelf ka apna ranking lagta hai
    // (wahi function jo homepage use karta hai).
    if (sort === 'newest' && shelfCopy) items = sortForFilter(items, shelf);

    if (sort === 'price_asc' || sort === 'price_desc') {
      items.sort((a, b) => {
        const av = a.fixedPricePaise ?? Number.POSITIVE_INFINITY;
        const bv = b.fixedPricePaise ?? Number.POSITIVE_INFINITY;
        return sort === 'price_asc' ? av - bv : bv - av;
      });
    }

    return items;
  }, [listings, listingType, condition, state, brand, minPrice, maxPrice, sort, shelf, shelfCopy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetFilters() {
    setListingType('');
    setCondition('');
    setState('');
    setBrand('');
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
  }

  const filterForm = (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Category
        </h3>
        <Select value={categoryId} onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          if (e.target.value) params.set('categoryId', e.target.value);
          else params.delete('categoryId');
          router.push(`/listings?${params.toString()}`);
        }}>
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.name?.en}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Listing type
        </h3>
        <Select value={listingType} onChange={(e) => setListingType(e.target.value)}>
          {LISTING_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Condition
        </h3>
        <Select value={condition} onChange={(e) => setCondition(e.target.value)}>
          {CONDITIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Brand
        </h3>
        <Select value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">All brands</option>
          {brands.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Location
        </h3>
        <Input
          placeholder="e.g. Assam"
          value={state}
          onChange={(e) => setState(e.target.value)}
        />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Price range (₹)
        </h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <span className="text-slate-300">–</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
      </div>

      <Button variant="secondary" className="w-full" onClick={resetFilters}>
        Reset filters
      </Button>
    </div>
  );

  return (
    <div className="mx-auto min-h-[80vh] max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {shelfCopy?.title || 'Equipment Marketplace'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {shelfCopy?.description || 'Find the right heavy equipment for your project.'}
        </p>
      </div>

      <form onSubmit={handleSearchSubmit} className="mb-6 flex max-w-xl gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search — e.g. excavator, JCB"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-surface py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {/* Buyer location — auto-detected via GPS, or manually chosen. Purely
          additive: when no location is set, browsing works exactly as before. */}
      <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-slate-200 bg-surface px-4 py-2.5 text-sm">
        <MapPinIcon className="h-4 w-4 shrink-0 text-brand-600" />
        {locating ? (
          <span className="text-slate-500">Detecting your location…</span>
        ) : locationMode ? (
          <>
            <span className="text-slate-700">
              Showing results near <strong className="font-semibold">{locationLabel || 'your area'}</strong>
            </span>
            <button type="button" onClick={() => setManualLocationOpen(true)} className="font-medium text-brand-600 hover:underline">
              Change location
            </button>
            <button type="button" onClick={clearLocation} className="text-slate-400 hover:underline">
              Clear
            </button>
          </>
        ) : (
          <>
            <span className="text-slate-500">
              {locateDenied ? 'Location unavailable.' : 'Location not set.'} Select manually to see nearby equipment first.
            </span>
            {geoSupported && !locateDenied && (
              <button type="button" onClick={detectLocation} className="font-medium text-brand-600 hover:underline">
                Use my current location
              </button>
            )}
            <button type="button" onClick={() => setManualLocationOpen(true)} className="font-medium text-brand-600 hover:underline">
              Select location
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
        {/* Desktop filter sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">Filters</h2>
            {filterForm}
          </div>
        </aside>

        <div>
          {/* Sort + mobile filter bar */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              {loading ? 'Loading…' : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="lg:hidden"
                onClick={() => setMobileFiltersOpen(true)}
              >
                <FilterIcon className="h-4 w-4" />
                Filters
              </Button>
              <Select value={sort} onChange={(e) => setSort(e.target.value)} className="!py-2 text-xs sm:text-sm">
                {(locationMode === 'gps' ? [NEAREST_SORT, ...SORTS] : SORTS).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {loading && <ListingGridSkeleton count={9} />}
          {!loading && error && <Alert tone="error">{error}</Alert>}
          {!loading && !error && filtered.length === 0 && (
            <EmptyState
              icon={SearchIcon}
              title="No listings found"
              description="Try adjusting your filters or search terms."
              action={
                <Button variant="secondary" onClick={resetFilters}>
                  Reset filters
                </Button>
              }
            />
          )}

          {!loading && pageItems.length > 0 && (
            <>
              <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {pageItems.map((listing) => (
                  <ListingCard key={listing._id} listing={listing} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} className="mt-8" />
            </>
          )}
        </div>
      </div>

      <Modal
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        title="Filters"
        footer={
          <Button className="w-full" onClick={() => setMobileFiltersOpen(false)}>
            Show {filtered.length} results
          </Button>
        }
      >
        {filterForm}
      </Modal>

      <Modal
        open={manualLocationOpen}
        onClose={() => setManualLocationOpen(false)}
        title="Select your location"
        footer={
          <Button className="w-full" onClick={applyManualLocation}>
            Apply
          </Button>
        }
      >
        <div className="space-y-4">
          <Input
            label="State"
            value={manualState}
            onChange={(e) => setManualState(e.target.value)}
            placeholder="e.g. Haryana"
          />
          <Input
            label="City"
            value={manualCity}
            onChange={(e) => setManualCity(e.target.value)}
            placeholder="e.g. Jind"
          />
          <p className="text-xs text-slate-500">
            This overrides your detected GPS location and updates results to this area.
          </p>
        </div>
      </Modal>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<ListingGridSkeleton count={9} />}>
      <BrowseContent />
    </Suspense>
  );
}
