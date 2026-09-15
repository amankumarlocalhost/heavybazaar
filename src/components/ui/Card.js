export default function Card({
  children,
  className = '',
  hover = false,
  interactive = false,
  padding = 'p-6',
  as: Tag = 'div',
  ...rest
}) {
  return (
    <Tag
      className={`rounded-2xl border border-slate-200 bg-surface ${padding} shadow-sm text-left ${
        hover ? 'transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md' : ''
      } ${
        interactive
          ? 'w-full cursor-pointer transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40'
          : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
