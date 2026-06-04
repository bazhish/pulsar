import Image from "next/image";

export function AuthBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-app border border-line/70 bg-surface/90 p-2 shadow-soft backdrop-blur">
        <Image src="/logo-mark.svg" width={36} height={36} alt="" aria-hidden priority />
      </div>
      <div>
        <p className="text-xl font-black tracking-tight text-ink">Pulsar</p>
        <p className="text-sm font-semibold text-pulse">finanças no ritmo certo</p>
      </div>
    </div>
  );
}
