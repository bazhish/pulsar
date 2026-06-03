type SkeletonProps = {
  className?: string;
  label?: string;
};

export function Skeleton({ className = "", label = "Carregando" }: SkeletonProps) {
  return (
    <span
      aria-label={label}
      className={`block animate-pulse rounded-app bg-white/70 shadow-sm ${className}`}
      role="status"
    />
  );
}
