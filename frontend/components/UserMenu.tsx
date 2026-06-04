"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Tooltip } from "@/components/Tooltip";
import { api, apiAssetUrl } from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import type { User } from "@/types/finance";

type UserMenuProps = {
  compact: boolean;
};

function initialsFromUser(user: User | null) {
  const source = user?.name || user?.email || "Usuário";
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function UserAvatar({ compact, user }: { compact: boolean; user: User | null }) {
  const initials = initialsFromUser(user);
  const sizeClass = compact ? "h-11 w-11" : "h-10 w-10";

  if (user?.avatar_url) {
    return (
      <span
        aria-hidden
        className={`${sizeClass} shrink-0 rounded-app bg-cover bg-center shadow-sm ring-1 ring-line`}
        style={{ backgroundImage: `url(${apiAssetUrl(user.avatar_url)})` }}
      />
    );
  }

  return (
    <span className={`${sizeClass} flex shrink-0 items-center justify-center rounded-app bg-pulse text-sm font-black text-white shadow-sm`} aria-hidden>
      {initials}
    </span>
  );
}

export function UserMenu({ compact }: UserMenuProps) {
  const token = useAuthToken();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;

    const loadUser = () => api.me(token)
      .then((nextUser) => {
        if (active) setUser(nextUser);
      })
      .catch(() => {
        if (active) setUser(null);
      });

    loadUser();
    window.addEventListener("pulsar:user-updated", loadUser);
    return () => {
      active = false;
      window.removeEventListener("pulsar:user-updated", loadUser);
    };
  }, [token]);

  const displayName = useMemo(() => user?.name || "Perfil", [user]);

  const link = (
    <Link
      aria-label={compact ? `Abrir perfil de ${displayName}` : undefined}
      className={`focus-ring theme-control flex items-center rounded-app border shadow-sm transition hover:border-pulse/50 ${compact ? "justify-center p-2" : "gap-3 p-3"}`}
      href="/perfil"
    >
      <UserAvatar compact={compact} user={user} />
      {compact ? null : (
        <span className="min-w-0">
          <strong className="block truncate text-sm text-ink">{displayName}</strong>
          <small className="block truncate text-xs text-muted">{user?.email || "Abrir perfil"}</small>
        </span>
      )}
    </Link>
  );

  return (
    <Tooltip disabled={!compact} label={displayName} side="right">
      {link}
    </Tooltip>
  );
}
