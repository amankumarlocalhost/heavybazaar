export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900 active:scale-[0.98]';

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-[15px]',
  };

  const variants = {
    primary:
      'bg-brand-500 text-ink-900 shadow-sm shadow-black/40 hover:bg-brand-600 focus-visible:ring-brand-600',
    dark: 'bg-ink-800 text-white border border-slate-300 hover:bg-ink-700 focus-visible:ring-slate-300',
    secondary:
      'bg-surface text-slate-700 border border-slate-300 hover:border-brand-300 hover:text-brand-800 hover:bg-brand-50/40 focus-visible:ring-brand-400',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-300',
    danger: 'bg-red-500 text-white hover:bg-red-400 focus-visible:ring-red-400',
    outlineOnDark:
      'border border-white/25 text-white hover:bg-white/10 focus-visible:ring-white',
    // Premium chip for CTAs sitting on a dark surface (e.g. navbar) — a
    // glassy brand-tinted outline instead of a flat white/dark pill.
    premiumOnDark:
      'bg-brand-500/10 text-brand-400 border border-brand-500/40 hover:bg-brand-500/20 hover:border-brand-500/60 focus-visible:ring-brand-500',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
