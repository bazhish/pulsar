"use client";

import { useEffect, useState } from "react";
import { Github } from "lucide-react";
import { api, type OAuthProviderKey, type OAuthProvidersResponse } from "@/lib/api";

const providerLabels: Record<OAuthProviderKey, string> = {
  google: "Google",
  github: "GitHub",
  facebook: "Facebook"
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.8 3.6 14.6 2.6 12 2.6 6.9 2.6 2.6 6.9 2.6 12S6.9 21.4 12 21.4c6.9 0 8.6-4.8 8.6-7.3 0-.5 0-.9-.1-1.2H12z"
      />
      <path fill="#34A853" d="M3.9 14.8l3.1 2.4C8.1 19.3 9.9 20.4 12 20.4c3.9 0 6.1-2.7 6.8-4.2l-3.3-2.6c-.8 1.2-2 2-3.5 2-2.7 0-4.9-2.2-4.9-4.9s2.2-4.9 4.9-4.9c1.5 0 2.5.6 3.1 1.2l2.4-2.3C15.5 6.8 13.9 6 12 6 8.1 6 4.8 9.3 4.8 13.2S8.1 20.4 12 20.4c4.6 0 7.6-3.2 7.6-7.7 0-.5 0-1-.1-1.5H12z" />
      <path fill="#4A90E2" d="M2.6 7.8l3.6 2.8C7.2 8.8 9.4 7.4 12 7.4c1.5 0 2.5.6 3.1 1.2l2.4-2.3C15.5 4.8 13.9 4 12 4 8.1 4 4.8 7.3 4.8 11.2c0 1.2.3 2.3.8 3.3L2.6 7.8z" />
      <path fill="#FBBC05" d="M12 20.4c2.1 0 4-.9 5.4-2.4l-2.5-2c-.7.5-1.7.8-2.9.8-2.7 0-4.9-2.2-4.9-4.9 0-.6.1-1.1.3-1.6l-6.3-4.9C4.2 18.5 7.7 20.4 12 20.4z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#1877F2]" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function providerIcon(provider: OAuthProviderKey) {
  if (provider === "google") return <GoogleIcon />;
  if (provider === "facebook") return <FacebookIcon />;
  return <Github size={16} />;
}

function unavailableMessage(provider: OAuthProviderKey) {
  return `Login com ${providerLabels[provider]} ainda não configurado neste ambiente.`;
}

type SocialLoginButtonsProps = {
  mode?: "login" | "register";
};

export function SocialLoginButtons({ mode = "login" }: SocialLoginButtonsProps) {
  const [providers, setProviders] = useState<OAuthProvidersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState("");

  useEffect(() => {
    let active = true;
    api
      .oauthProviders()
      .then((response) => {
        if (active) setProviders(response);
      })
      .catch(() => {
        if (active) setHint("Login social indisponível no momento.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const entries = (Object.keys(providerLabels) as OAuthProviderKey[]).map((key) => ({
    key,
    label: providerLabels[key],
    enabled: Boolean(providers?.providers[key]?.enabled)
  }));

  const anyEnabled = entries.some((entry) => entry.enabled);

  function startOAuth(provider: OAuthProviderKey) {
    window.location.href = api.oauthAuthorizeUrl(provider);
  }

  return (
    <div className="mt-5">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="text-xs font-semibold text-muted">ou continue com</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {entries.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className="btn-secondary w-full text-xs disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading || !entry.enabled}
            title={entry.enabled ? undefined : unavailableMessage(entry.key)}
            aria-label={entry.enabled ? `Entrar com ${entry.label}` : unavailableMessage(entry.key)}
            onClick={() => startOAuth(entry.key)}
          >
            {providerIcon(entry.key)}
            {entry.label}
          </button>
        ))}
      </div>

      {!loading && !anyEnabled ? (
        <p className="mt-2 text-center text-xs text-muted">
          {hint || "Login social não configurado neste ambiente. Use e-mail e senha ou peça ao administrador para configurar OAuth."}
        </p>
      ) : null}

      {mode === "register" && anyEnabled ? (
        <p className="mt-2 text-center text-[11px] text-muted">
          Ao entrar com rede social, criamos sua conta com o e-mail verificado do provedor.
        </p>
      ) : null}
    </div>
  );
}
