type SkeletonProps = {
  className?: string;
  label?: string;
};

export function Skeleton({ className = "", label = "Carregando" }: SkeletonProps) {
  return (
    <span
      aria-label={label}
      className={`skeleton-shimmer block rounded-app shadow-sm ${className}`}
      role="status"
    />
  );
}
