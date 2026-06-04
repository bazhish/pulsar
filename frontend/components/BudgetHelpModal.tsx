"use client";

import { X, HelpCircle } from "lucide-react";

type BudgetHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

export function BudgetHelpModal({ open, onClose }: BudgetHelpModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blur background */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="theme-surface relative mx-4 w-full max-w-md rounded-app border p-6 shadow-lift">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="text-mint mt-1" size={24} />
            <h2 className="text-lg font-bold">Como funciona o orçamento?</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink transition p-1"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 text-sm text-ink">
          <div>
            <h3 className="font-semibold mb-1">O que é?</h3>
            <p className="text-muted">
              Use o orçamento para definir quanto você pretende gastar em cada categoria neste mês.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Como usar?</h3>
            <p className="text-muted">
              1. Escolha uma categoria (ex: Alimentação)<br />
              2. Defina quanto quer gastar (ex: R$ 600)<br />
              3. O app avisa quando você está perto do limite
            </p>
          </div>

          <div className="rounded-app bg-mint/10 p-3 border border-mint/20">
            <h3 className="font-semibold mb-1 text-leaf">Exemplo prático</h3>
            <p className="text-muted text-xs">
              Se você define Alimentação = <strong>R$ 600</strong> e já gastou <strong>R$ 450</strong>, o sistema mostra que você usou <strong>75%</strong> do limite.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Status do orçamento</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-6 rounded-full bg-leaf" />
                <span className="text-muted"><strong>Tranquilo:</strong> dentro do limite</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-6 rounded-full bg-amber" />
                <span className="text-muted"><strong>Atenção:</strong> perto de passar</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-6 rounded-full bg-coral" />
                <span className="text-muted"><strong>Estourado:</strong> passou do limite</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Dica</h3>
            <p className="text-muted text-xs">
              Use &quot;Copiar do mês anterior&quot; para copiar o orçamento do mês passado e fazer ajustes. Economia de tempo! 🚀
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-primary w-full mt-6"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
