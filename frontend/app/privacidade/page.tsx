import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade — Pulsa",
  description: "Como o Pulsa trata seus dados pessoais conforme a LGPD."
};

const POLICY_VERSION = "2025-07-01";

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link className="text-sm font-bold text-plum" href="/cadastro">
        ← Voltar
      </Link>

      <h1 className="mt-4 text-3xl font-black text-ink">Política de Privacidade</h1>
      <p className="mt-1 text-sm text-muted">Versão {POLICY_VERSION} · Lei nº 13.709/2018 (LGPD)</p>

      <section className="mt-6 space-y-3 text-sm leading-relaxed text-ink">
        <h2 className="text-lg font-bold">1. Dados que tratamos</h2>
        <p className="text-muted">
          Dados de conta (nome, e-mail, foto de perfil e preferências) e dados financeiros informados por você
          (salário/base mensal, metas, orçamentos, reserva, movimentações, categorias, formas de pagamento,
          parcelas e observações). Arquivos CSV são usados apenas durante o fluxo de importação.
        </p>

        <h2 className="text-lg font-bold">2. Para que usamos</h2>
        <p className="text-muted">
          Exclusivamente para organizar seu mês financeiro: resumo, metas, orçamento, alertas, importação e
          relatórios. Não vendemos seus dados e não os usamos para publicidade de terceiros.
        </p>

        <h2 className="text-lg font-bold">3. O que NÃO coletamos</h2>
        <p className="text-muted">
          Não coletamos número completo de cartão, CVV ou senha bancária. Não há conexão bancária real (Open
          Finance é apenas preparação futura).
        </p>

        <h2 className="text-lg font-bold">4. Base legal e consentimento</h2>
        <p className="text-muted">
          O tratamento se apoia na execução do serviço que você solicita e no seu consentimento, registrado no
          cadastro. Você pode revogar o consentimento de recursos opcionais (como o resumo mensal) a qualquer
          momento nas configurações do seu perfil.
        </p>

        <h2 className="text-lg font-bold">5. Seus direitos (Art. 18)</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>Acesso e portabilidade — exporte todos os seus dados em JSON no Perfil.</li>
          <li>Correção — edite perfil e dados financeiros a qualquer momento.</li>
          <li>Eliminação — exclua permanentemente sua conta e todos os dados no Perfil.</li>
          <li>Revogação de consentimento — para recursos opcionais.</li>
        </ul>

        <h2 className="text-lg font-bold">6. Segurança</h2>
        <p className="text-muted">
          Senhas com bcrypt, sessões em cookie HttpOnly, rate limit no login, proteção CSRF e tokens revogáveis.
          Fotos de perfil ficam em armazenamento privado com acesso controlado.
        </p>

        <h2 className="text-lg font-bold">7. Retenção</h2>
        <p className="text-muted">
          Seus dados permanecem enquanto a conta existir. Ao excluir a conta, os dados pessoais são removidos.
          Sessões temporárias de importação são limpas periodicamente.
        </p>

        <h2 className="text-lg font-bold">8. Encarregado (DPO) e contato</h2>
        <p className="text-muted">
          Para exercer seus direitos ou tirar dúvidas sobre privacidade, fale com o encarregado de dados pelo
          e-mail <span className="font-semibold text-ink">privacidade@pulsa.app</span>.
        </p>
      </section>
    </main>
  );
}
