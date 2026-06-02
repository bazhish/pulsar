"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FileUp, Wand2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { SectionIntro } from "@/components/SectionIntro";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { useAuthToken } from "@/lib/useAuthToken";
import type { Category, CsvPreview, CsvUpload } from "@/types/finance";

type Mapping = { date: string; description: string; value: string; type?: string };

export default function ImportarPage() {
  const token = useAuthToken();
  const [upload, setUpload] = useState<CsvUpload | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mapping, setMapping] = useState<Mapping>({ date: "", description: "", value: "", type: "" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    api.bootstrap(token, new Date().toISOString().slice(0, 7)).then((boot) => setCategories(boot.categories.filter((category) => category.type === "expense"))).catch(console.error);
  }, [token]);

  const columns = upload?.columns || [];
  const mappingReady = useMemo(() => Boolean(mapping.date && mapping.description && mapping.value), [mapping]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File)) return;
    const result = await api.uploadCsv(token, file);
    setUpload(result);
    setPreview(null);
    setMapping({
      date: result.columns.find((column) => /data|date/i.test(column)) || "",
      description: result.columns.find((column) => /descr|hist|memo|desc/i.test(column)) || "",
      value: result.columns.find((column) => /valor|amount|value/i.test(column)) || "",
      type: result.columns.find((column) => /tipo|type/i.test(column)) || ""
    });
    setMessage(`${result.totalRows} linhas encontradas.`);
  }

  async function handlePreview() {
    if (!token || !upload || !mappingReady) return;
    const result = await api.previewCsv(token, { importToken: upload.importToken, mapping: { ...mapping, type: mapping.type || null } });
    setPreview(result);
  }

  async function handleConfirm() {
    if (!token || !upload || !mappingReady) return;
    const result = await api.confirmCsv(token, { importToken: upload.importToken, mapping: { ...mapping, type: mapping.type || null } });
    setMessage(`${result.imported} importados, ${result.duplicates} duplicados, ${result.invalidRows} com erro.`);
    setUpload(null);
    setPreview(null);
  }

  async function createRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    await api.createRule(token, {
      pattern: String(form.get("pattern")),
      categoryId: Number(form.get("categoryId")),
      paymentMethod: String(form.get("paymentMethod") || "csv_import")
    });
    event.currentTarget.reset();
    setMessage("Regra criada. Ela sera aplicada nas proximas importacoes.");
  }

  return (
    <Shell>
      <div className="mx-auto max-w-5xl px-4 py-5 sm:py-6">
        <header className="mb-5">
          <h1 className="flex items-center gap-2 text-2xl font-bold"><FileUp size={24} /> Importar extrato</h1>
          <p className="text-sm text-muted">Traga movimentacoes em CSV, revise e so depois salve.</p>
        </header>

        {message ? <p className="app-card mb-4 p-3 text-sm">{message}</p> : null}

        <form onSubmit={handleUpload} className="app-card p-4">
          <SectionIntro
            title="Enviar arquivo"
            description="Escolha um CSV do seu banco ou planilha. O app mostra uma previa antes de gravar qualquer movimentacao."
            helpText="Depois do envio, confira quais colunas representam data, descricao e valor."
          />
          <label className="block text-sm">
            Arquivo CSV
            <input className="field mt-1" name="file" type="file" accept=".csv,text/csv" required />
          </label>
          <button className="btn-primary mt-4" type="submit">Enviar CSV</button>
        </form>

        {upload ? (
          <section className="app-card mt-4 p-4">
            <SectionIntro
              title="Mapeamento"
              description="Diga qual coluna do CSV corresponde a cada informacao financeira."
              helpText="A coluna Tipo e opcional. Se ela nao existir, o app tenta inferir por valor positivo ou negativo."
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(["date", "description", "value", "type"] as const).map((field) => (
                <label key={field} className="text-sm">
                  {field === "date" ? "Data" : field === "description" ? "Descricao" : field === "value" ? "Valor" : "Tipo"}
                  <select className="field mt-1" value={mapping[field] || ""} onChange={(event) => setMapping({ ...mapping, [field]: event.target.value })} required={field !== "type"}>
                    <option value="">Selecione</option>
                    {columns.map((column) => <option key={column} value={column}>{column}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-secondary" type="button" onClick={() => handlePreview().catch(console.error)} disabled={!mappingReady}>Ver previa</button>
              <button className="btn-primary" type="button" onClick={() => handleConfirm().catch(console.error)} disabled={!preview}>Confirmar importacao</button>
            </div>
          </section>
        ) : null}

        {preview ? (
          <section className="app-card mt-4 p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-semibold">Previa</h2>
              <span className="text-sm text-muted">{preview.validRows} validas / {preview.invalidRows} erros</span>
            </div>
            <div className="mt-3 divide-y divide-line">
              {preview.preview.map((row) => (
                <div key={row.duplicateHash} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-sm">{row.title}</strong>
                    <span className="text-xs text-muted">{row.transactionDate} / linha {row.line}</span>
                  </div>
                  <span className={row.type === "income" ? "font-semibold text-leaf" : "font-semibold text-coral"}>{formatBRL(row.amount)}</span>
                </div>
              ))}
              {preview.errors.map((error) => <p key={`${error.line}-${error.detail}`} className="py-2 text-sm text-coral">Linha {error.line}: {error.detail}</p>)}
            </div>
          </section>
        ) : upload ? (
          <div className="mt-4">
            <EmptyState
              title="Previa ainda nao gerada"
              description="Confira o mapeamento das colunas e clique em Ver previa para revisar as movimentacoes antes de importar."
              actionLabel="Ver previa"
              onAction={() => handlePreview().catch(console.error)}
              icon={FileUp}
            />
          </div>
        ) : null}

        <form onSubmit={createRule} className="app-card mt-4 p-4">
          <SectionIntro
            title="Regra de categorizacao"
            description="Crie atalhos para o app classificar importacoes futuras automaticamente."
            helpText="Exemplo: se a descricao tiver ifood, enviar para Alimentacao."
            action={<Wand2 size={18} className="text-pulse" />}
          />
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px_180px_auto]">
            <input className="field" name="pattern" placeholder="Ex: ifood, uber, netflix" required />
            <select className="field" name="categoryId" required>
              <option value="">Categoria</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <select className="field" name="paymentMethod">
              <option value="csv_import">CSV</option>
              <option value="pix">Pix</option>
              <option value="debito">Debito</option>
              <option value="credito">Credito</option>
            </select>
            <button className="btn-secondary" type="submit">Criar regra</button>
          </div>
        </form>
      </div>
    </Shell>
  );
}
