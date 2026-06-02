"use client";

import { useEffect, useState } from "react";
import { CardSummary } from "@/components/CardSummary";
import { MonthPicker } from "@/components/MonthPicker";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useAuthToken } from "@/lib/useAuthToken";
import type { Card } from "@/types/finance";

export default function CartoesPage() {
  const token = useAuthToken();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    if (!token) return;
    api.cards(token, month).then(setCards).catch(console.error);
  }, [token, month]);

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Cartões</h1>
            <p className="text-sm text-black/60">Faturas, limite comprometido e parcelas restantes.</p>
          </div>
          <MonthPicker value={month} onChange={setMonth} />
        </header>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => <CardSummary key={card.id} card={card} />)}
        </div>
      </div>
    </Shell>
  );
}
