import { Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-5 sm:py-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11" />
          <div className="grid gap-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-64 max-w-[70vw]" />
          </div>
        </div>
        <Skeleton className="hidden h-10 w-32 sm:block" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Skeleton className="h-80" label="Carregando painel principal" />
        <div className="grid gap-4">
          <Skeleton className="h-36" label="Carregando card" />
          <Skeleton className="h-36" label="Carregando recomendacao" />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-72" label="Carregando grafico" />
        <div className="app-card grid gap-3 p-4">
          <Skeleton className="h-5 w-44" label="Carregando lista" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      </div>
    </div>
  );
}
