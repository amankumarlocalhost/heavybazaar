import Link from 'next/link';
import Image from 'next/image';
import { LayersIcon, ArrowRightIcon } from '@/components/ui/Icons';

/**
 * CategoryTiles — "Browse by category" grid.
 * ---------------------------------------------------------------------------
 * Har tile ka icon `public/category-icons/<slug>.png` se aata hai. File ka naam
 * category ke SLUG se match karta hai (excavators.png, wheel-loader.png, ...),
 * isliye koi manual mapping table maintain nahi karna padta.
 *
 * Agar kisi nayi category ka icon abhi nahi hai, to tile toota nahi — generic
 * LayersIcon fallback lag jaata hai. Isliye `ICON_SLUGS` ek explicit list hai:
 * `next/image` build-time pe file check nahi karta, aur missing file runtime pe
 * 404 deti — list se pehle hi pata chal jaata hai ki icon hai ya nahi.
 * ---------------------------------------------------------------------------
 */
const ICON_SLUGS = new Set([
  'backhoe-loader',
  'bulldozer',
  'crawler-crane',
  'dump-truck',
  'excavators',
  'forklift',
  'mobile-crane',
  'motor-grader',
  'road-roller',
  'rough-terrain-crane',
  'skid-steer-loader',
  'soil-compactor',
  'telehandler',
  'wheel-loader',
]);

export default function CategoryTiles({ categories = [] }) {
  if (categories.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="hb-section-title text-xl font-bold tracking-tight text-slate-900">
            Browse by category
          </h2>
          <p className="mt-1 pl-3.5 text-sm text-slate-500">
            Find the right equipment for your project.
          </p>
        </div>
        <Link
          href="/listings"
          className="flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800"
        >
          View all categories
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((cat) => {
          const hasIcon = ICON_SLUGS.has(cat.slug);
          return (
            <Link
              key={cat._id}
              href={`/listings?categoryId=${cat._id}`}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-surface px-3 py-2.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                {hasIcon ? (
                  <Image
                    src={`/category-icons/${cat.slug}.png`}
                    alt=""
                    aria-hidden="true"
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain transition-transform duration-200 group-hover:scale-110"
                  />
                ) : (
                  <LayersIcon className="h-5 w-5 text-slate-400 group-hover:text-brand-600" />
                )}
              </span>
              <span className="min-w-0 text-sm font-medium text-slate-700 group-hover:text-brand-800">
                {cat.name?.en}
              </span>
            </Link>
          );
        })}

        {/* Aakhri tile — poori list pe le jaata hai, grid ka rhythm todta nahi */}
        <Link
          href="/listings"
          className="group flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-surface-muted px-3 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 group-hover:text-brand-600">
            <LayersIcon className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium text-slate-700 group-hover:text-brand-800">
            All Categories
          </span>
        </Link>
      </div>
    </section>
  );
}
