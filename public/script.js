const token = sessionStorage.getItem("rf_token");
if (!token) {
  window.location.href = "/login";
  throw new Error("Autenticacao necessaria.");
}

function authFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };

  return fetch(url, { ...options, headers }).then((response) => {
    if (response.status === 401) {
      sessionStorage.removeItem("rf_token");
      window.location.href = "/login";
      throw new Error("Sessao expirada.");
    }
    return response;
  });
}

async function responseError(response, fallback) {
  try {
    const data = await response.json();
    return data.error || data.detail || fallback;
  } catch {
    return fallback;
  }
}

const api = {
  async getBootstrap(month) {
    const response = await authFetch(`/api/bootstrap?month=${encodeURIComponent(month)}`);
    if (!response.ok) throw new Error("Falha ao carregar dashboard.");
    return response.json();
  },
  async saveSettings(payload) {
    const response = await authFetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await responseError(response, "Falha ao salvar configuraÃ§Ãµes."));
    return response.json();
  },
  async createTransaction(payload) {
    const response = await authFetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await responseError(response, "Falha ao salvar lanÃ§amento."));
    return response.json();
  },
  async createCategory(payload) {
    const response = await authFetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await responseError(response, "Falha ao criar categoria."));
    return response.json();
  },
  async createCard(payload) {
    const response = await authFetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await responseError(response, "Falha ao criar cartÃ£o."));
    return response.json();
  },
  async createInstallment(cardId, payload) {
    const response = await authFetch(`/api/cards/${cardId}/installments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await responseError(response, "Falha ao salvar compra parcelada."));
    return response.json();
  },
  async deleteTransaction(id) {
    const response = await authFetch(`/api/transactions/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error(await responseError(response, "Falha ao remover lanÃ§amento."));
    return response.json();
  },
  async setRecurring(id, payload) {
    const response = await authFetch(`/api/transactions/${id}/set-recurring`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await responseError(response, "Falha ao atualizar recorrÃªncia."));
    return response.json();
  },
  async exportCsv(month) {
    const response = await authFetch(`/api/export/csv?month=${encodeURIComponent(month)}`);
    if (!response.ok) throw new Error(await responseError(response, "Falha ao exportar CSV."));
    return response;
  },
  async exportPdf(month) {
    const response = await authFetch(`/api/export/pdf?month=${encodeURIComponent(month)}`);
    if (!response.ok) throw new Error(await responseError(response, "Falha ao exportar PDF."));
    return response;
  },
  async getSuggestions(month) {
    const response = await authFetch(`/api/transactions/suggestions?month=${encodeURIComponent(month)}`);
    if (!response.ok) throw new Error(await responseError(response, "Falha ao carregar recorrÃªncias."));
    return response.json();
  }
};

const state = {
  month: new Date().toISOString().slice(0, 7),
  chartType: localStorage.getItem("rf_chart_type") || "doughnut",
  data: null,
  search: "",
  filtersOpen: false,
  alertsCollapsed: false,
  filters: {
    type: "",
    categoryId: "",
    minAmount: "",
    maxAmount: "",
    paymentMethod: ""
  }
};

const monthPicker = document.getElementById("monthPicker");
const chartTypeSelect = document.getElementById("chartTypeSelect");
const transactionSearch = document.getElementById("transactionSearch");
const toggleFiltersBtn = document.getElementById("toggleFiltersBtn");
const advancedFilters = document.getElementById("advancedFilters");
const filterType = document.getElementById("filterType");
const filterCategory = document.getElementById("filterCategory");
const filterMinAmount = document.getElementById("filterMinAmount");
const filterMaxAmount = document.getElementById("filterMaxAmount");
const filterPayment = document.getElementById("filterPayment");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const alertsBanner = document.getElementById("alertsBanner");
const recurringSuggestions = document.getElementById("recurringSuggestions");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const cardsStack = document.getElementById("cardsStack");
const transactionsList = document.getElementById("transactionsList");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalWindow = document.getElementById("modalWindow");
const modalTitle = document.getElementById("modalTitle");
const modalSubtitle = document.getElementById("modalSubtitle");
const modalForm = document.getElementById("modalForm");
const closeModalBtn = document.getElementById("closeModalBtn");
const hideBannerBtn = document.getElementById("hideBannerBtn");

let categoryChart;
let trendChart;

function addMonths(monthKey, offset) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function scoreDelta(current, previous) {
  if (previous === undefined || previous === null || current === previous) return { icon: "â†’", label: "estÃ¡vel" };
  return current > previous
    ? { icon: "â†‘", label: `+${current - previous} vs mÃªs anterior` }
    : { icon: "â†“", label: `${current - previous} vs mÃªs anterior` };
}

function alertStorageKey(alert) {
  return `rf_alert_closed_${state.month}_${alert.type}_${alert.category}_${alert.message}`;
}

function currentDayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getExpenseCategories() {
  return (state.data?.categories || []).filter((category) => category.type === "expense");
}

function getIncomeCategories() {
  return (state.data?.categories || []).filter((category) => category.type === "income");
}

function fillCategorySelect(select, categories) {
  select.innerHTML = categories.map((category) => (
    `<option value="${category.id}">${RFUtils.escapeHtml(category.icon)} ${RFUtils.escapeHtml(category.name)}</option>`
  )).join("");
}

function fillCardSelect(select, includeEmpty = false) {
  const options = [];
  if (includeEmpty) options.push(`<option value="">Sem cartÃ£o</option>`);
  for (const card of state.data.cards) {
    options.push(`<option value="${card.id}">${RFUtils.escapeHtml(card.name)} â€¢ ${RFUtils.escapeHtml(card.last_four)}</option>`);
  }
  select.innerHTML = options.join("");
}

function populateAdvancedFilters() {
  const currentCategory = filterCategory.value;
  const currentPayment = filterPayment.value;
  const categories = state.data?.categories || [];
  filterCategory.innerHTML = [
    `<option value="">Todas</option>`,
    ...categories.map((category) => (
      `<option value="${category.id}">${RFUtils.escapeHtml(category.icon)} ${RFUtils.escapeHtml(category.name)}</option>`
    ))
  ].join("");
  filterCategory.value = currentCategory;

  const payments = [...new Set((state.data?.transactions || []).map((item) => item.payment_method).filter(Boolean))].sort();
  filterPayment.innerHTML = [
    `<option value="">Todos</option>`,
    ...payments.map((payment) => `<option value="${RFUtils.escapeHtml(payment)}">${RFUtils.escapeHtml(payment)}</option>`)
  ].join("");
  filterPayment.value = currentPayment;
}

function filtersAreActive() {
  return Boolean(
    state.search.trim() ||
    state.filters.type ||
    state.filters.categoryId ||
    state.filters.minAmount ||
    state.filters.maxAmount ||
    state.filters.paymentMethod
  );
}

function renderScore() {
  const score = state.data?.score;
  if (!score) return;
  const previousScore = state.data?.previousScore?.score;
  const delta = scoreDelta(score.score, previousScore);
  const scoreValue = document.getElementById("scoreValue");
  const scoreLabel = document.getElementById("scoreLabel");
  const scoreDeltaEl = document.getElementById("scoreDelta");
  const scoreCard = document.getElementById("scoreCard");
  const scoreTooltip = document.getElementById("scoreTooltip");

  scoreValue.textContent = String(score.score);
  scoreValue.style.color = score.color;
  scoreLabel.textContent = score.label;
  scoreDeltaEl.textContent = `${delta.icon} ${delta.label}`;
  scoreDeltaEl.className = `score-delta ${delta.icon === "â†‘" ? "up" : delta.icon === "â†“" ? "down" : ""}`;
  scoreCard.style.setProperty("--score-color", score.color);
  scoreTooltip.innerHTML = `
    <strong>ComposiÃ§Ã£o do score</strong>
    <span>Gastos: ${score.breakdown.gastos}</span>
    <span>ConsistÃªncia: +${score.breakdown.consistencia}</span>
    <span>Reservas: +${score.breakdown.reservas}</span>
    <span>CartÃµes: ${score.breakdown.cartoes}</span>
  `;
}

function renderAlerts() {
  const alerts = (state.data?.alerts || []).filter((alert) => !sessionStorage.getItem(alertStorageKey(alert)));
  if (!alerts.length) {
    alertsBanner.classList.add("hidden");
    alertsBanner.innerHTML = "";
    return;
  }

  alertsBanner.classList.remove("hidden");
  const alertItems = alerts.map((alert, index) => {
    const icon = alert.type === "danger" ? "!" : alert.type === "warning" ? "?" : "i";
    return `
      <article class="alert-item ${alert.type}" data-alert-index="${index}">
        <span class="alert-icon">${icon}</span>
        <div>
          <strong>${RFUtils.escapeHtml(alert.category)}</strong>
          <p>${RFUtils.escapeHtml(alert.message)}</p>
        </div>
        <button type="button" class="alert-close" data-close-alert="${index}" aria-label="Fechar alerta">Ã—</button>
      </article>
    `;
  }).join("");
  alertsBanner.innerHTML = `
    <div class="alerts-head">
      <strong>${alerts.length} alerta${alerts.length > 1 ? "s" : ""} no mÃªs</strong>
      <button type="button" class="alert-collapse" id="toggleAlertsCollapse" aria-label="Alternar alertas" aria-expanded="${!state.alertsCollapsed}">
        ${state.alertsCollapsed ? "+" : "-"}
      </button>
    </div>
    <div class="alerts-list ${state.alertsCollapsed ? "collapsed" : ""}">
      ${alertItems}
    </div>
  `;
}

function renderKpis() {
  const { dashboard } = state.data;
  document.getElementById("salaryValue").textContent = RFUtils.formatBRL(state.data.settings.monthly_income);
  document.getElementById("inflowValue").textContent = RFUtils.formatBRL(dashboard.inflow);
  document.getElementById("outflowValue").textContent = RFUtils.formatBRL(dashboard.outflow);
  document.getElementById("balanceValue").textContent = RFUtils.formatBRL(dashboard.balance);
  document.getElementById("summaryInflow").textContent = RFUtils.formatBRL(dashboard.inflow);
  document.getElementById("summaryOutflow").textContent = RFUtils.formatBRL(dashboard.outflow);
  document.getElementById("summaryNet").textContent = RFUtils.formatBRL(dashboard.balance);
  renderScore();
}

function renderCategoryChart() {
  const canvas = document.getElementById("categoryChart");
  const items = state.data.dashboard.categoryBreakdown;
  const labels = items.map((item) => item.name);
  const values = items.map((item) => item.total);
  const colors = items.map((item) => item.color);

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(canvas, {
    type: state.chartType,
    data: {
      labels,
      datasets: [{
        data: values.length ? values : [1],
        backgroundColor: values.length ? colors : ["#d9d9d9"],
        borderWidth: 0,
        label: "Gastos por categoria"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#111" } },
        tooltip: {
          callbacks: {
            label(context) {
              const value = context.raw || 0;
              return `${context.label}: ${RFUtils.formatBRL(value)}`;
            }
          }
        }
      },
      scales: ["bar"].includes(state.chartType)
        ? {
            y: {
              beginAtZero: true,
              ticks: { callback: (value) => RFUtils.formatBRL(value) }
            }
          }
        : {}
    }
  });
}

function renderTrendChart() {
  const canvas = document.getElementById("trendChart");
  const trend = state.data.dashboard.monthlyTrend;
  const monthlyIncome = Number(state.data.settings.monthly_income || 0);
  const goalLine = monthlyIncome * 0.7;
  if (trendChart) trendChart.destroy();

  const scroll = canvas.closest(".trend-scroll");
  if (scroll) canvas.style.minWidth = trend.length > 6 ? `${trend.length * 92}px` : "100%";

  trendChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: trend.map((item) => item.label),
      datasets: [
        {
          label: "Entradas",
          data: trend.map((item) => item.inflow),
          borderColor: "#98ea62",
          backgroundColor: "rgba(152,234,98,.18)",
          fill: false,
          tension: 0.34
        },
        {
          label: "SaÃ­das",
          data: trend.map((item) => item.outflow),
          borderColor: "#111111",
          backgroundColor: "rgba(17,17,17,.08)",
          fill: false,
          tension: 0.34
        },
        {
          label: "Meta de gastos",
          data: trend.map(() => goalLine),
          borderColor: "#eb4d43",
          borderDash: [8, 6],
          pointRadius: 0,
          fill: false,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#111" } },
        tooltip: {
          callbacks: {
            title(items) {
              return trend[items[0].dataIndex]?.label || "";
            },
            label(context) {
              const item = trend[context.dataIndex];
              if (context.dataset.label === "Meta de gastos") return `Meta: ${RFUtils.formatBRL(goalLine)}`;
              const previous = trend[context.dataIndex - 1];
              const diff = previous ? item.net - previous.net : 0;
              return [
                `Entradas: ${RFUtils.formatBRL(item.inflow)}`,
                `SaÃ­das: ${RFUtils.formatBRL(item.outflow)}`,
                `Saldo: ${RFUtils.formatBRL(item.net)}`,
                previous ? `Vs mÃªs anterior: ${diff >= 0 ? "+" : ""}${RFUtils.formatBRL(diff)}` : "Primeiro mÃªs da sÃ©rie"
              ];
            }
          }
        }
      },
      onClick(event) {
        const points = trendChart.getElementsAtEventForMode(event, "nearest", { intersect: true }, true);
        if (!points.length) return;
        const selected = trend[points[0].index];
        if (!selected?.month) return;
        state.month = selected.month;
        monthPicker.value = selected.month;
        loadDashboard();
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback(value) {
              return RFUtils.formatBRL(value);
            }
          }
        }
      }
    }
  });
}

function renderTransactions() {
  const query = state.search.trim().toLowerCase();
  const transactions = state.data.transactions.filter((item) => {
    const haystack = `${item.title} ${item.category_name || ""} ${item.payment_method || ""}`.toLowerCase();
    const amount = Number(item.amount || 0);
    const matchesSearch = !query || haystack.includes(query);
    const matchesType = !state.filters.type || item.type === state.filters.type;
    const matchesCategory = !state.filters.categoryId || String(item.category_id || "") === state.filters.categoryId;
    const matchesPayment = !state.filters.paymentMethod || item.payment_method === state.filters.paymentMethod;
    const matchesMin = !state.filters.minAmount || amount >= Number(state.filters.minAmount);
    const matchesMax = !state.filters.maxAmount || amount <= Number(state.filters.maxAmount);
    return matchesSearch && matchesType && matchesCategory && matchesPayment && matchesMin && matchesMax;
  });

  if (!transactions.length) {
    transactionsList.innerHTML = `<div class="empty-state">Nenhum lanÃ§amento encontrado para esse filtro.</div>`;
    return;
  }

  transactionsList.innerHTML = transactions.map((item) => {
    const installment = item.total_installments
      ? `<span class="tag">Parcela ${item.installment_number}/${item.total_installments}</span>`
      : "";
    const card = item.card_name
      ? `<span class="tag">${RFUtils.escapeHtml(item.card_name)}</span>`
      : "";
    const billing = item.billing_month
      ? `<span class="tag">Fatura ${RFUtils.escapeHtml(item.billing_month)}</span>`
      : "";
    const recurring = item.is_recurring
      ? `<span class="tag">Recorrente</span>`
      : "";
    const recurringAction = !item.is_recurring && !item.installment_group
      ? `<button class="link-btn neutral" type="button" data-set-recurring-id="${item.id}" data-recurrence-day="${Number(String(item.transaction_date).slice(-2)) || 1}">Repetir mensalmente</button>`
      : "";

    return `
      <article class="transaction-item">
        <div class="transaction-top">
          <div>
            <div class="transaction-title">${RFUtils.escapeHtml(item.title)}</div>
            <div class="transaction-meta">${RFUtils.escapeHtml(item.category_name || "Sem categoria")} â€¢ ${RFUtils.escapeHtml(item.payment_method)} â€¢ ${RFUtils.escapeHtml(item.transaction_date)}</div>
          </div>
          <div class="transaction-amount ${item.type}">${item.type === "income" ? "+" : "-"} ${RFUtils.formatBRL(item.amount)}</div>
        </div>

        <div class="transaction-tags">
          <span class="tag">${item.type === "income" ? "Entrada" : "Despesa"}</span>
          ${card}
          ${billing}
          ${installment}
          ${recurring}
        </div>

        <div class="transaction-actions">
          ${recurringAction}
          <button class="link-btn" type="button" data-delete-id="${item.id}">Excluir</button>
        </div>
      </article>
    `;
  }).join("");
}

function renderRecurringSuggestions() {
  const suggestions = state.data?.recurringSuggestions || [];
  if (!suggestions.length) {
    recurringSuggestions.classList.add("hidden");
    recurringSuggestions.innerHTML = "";
    return;
  }

  recurringSuggestions.classList.remove("hidden");
  recurringSuggestions.innerHTML = `
    <div>
      <strong>ðŸ’¡ ${suggestions.length} lanÃ§amentos recorrentes aguardando confirmaÃ§Ã£o para este mÃªs</strong>
      <p>${suggestions.slice(0, 3).map((item) => RFUtils.escapeHtml(item.title)).join(", ")}</p>
    </div>
    <div class="recurring-actions">
      <button type="button" class="action-btn action-primary" id="acceptRecurringBtn">Aceitar todos</button>
      <button type="button" class="action-btn" id="viewRecurringBtn">Ver detalhes</button>
    </div>
  `;
}

async function acceptRecurringSuggestions() {
  const suggestions = state.data?.recurringSuggestions || [];
  if (!suggestions.length) return;

  for (const suggestion of suggestions) {
    await api.createTransaction({
      title: suggestion.title,
      amount: Number(suggestion.amount),
      type: suggestion.type || "expense",
      categoryId: suggestion.category_id ? Number(suggestion.category_id) : null,
      paymentMethod: suggestion.payment_method || "pix",
      transactionDate: suggestion.suggested_date,
      notes: suggestion.notes || "",
      cardId: suggestion.card_id ? Number(suggestion.card_id) : null,
      billingMonth: suggestion.card_id ? state.month : null,
      isRecurring: true,
      recurrenceType: suggestion.recurrence_type || "monthly",
      recurrenceDay: Number(suggestion.recurrence_day || suggestion.suggested_date.slice(-2))
    });
  }

  await loadDashboard();
  RFUtils.showToast("RecorrÃªncias confirmadas.");
}

async function downloadResponse(response, fallbackName) {
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  link.href = url;
  link.download = match?.[1] || fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function downloadCsv() {
  const response = await api.exportCsv(state.month);
  await downloadResponse(response, `financeiro-${state.month}.csv`);
}

async function downloadPdf() {
  const response = await api.exportPdf(state.month);
  await downloadResponse(response, `financeiro-${state.month}.pdf`);
}

function renderCards() {
  const cards = state.data.cards;

  if (!cards.length) {
    cardsStack.innerHTML = `<div class="empty-state">Nenhum cartÃ£o cadastrado.</div>`;
    return;
  }

  cardsStack.innerHTML = cards.map((card) => {
    const installments = card.activeInstallments.length
      ? card.activeInstallments.map((item) => `
          <div class="card-installment">
            <div>
              <strong>${RFUtils.escapeHtml(item.title)}</strong>
              <div class="card-footnote">${RFUtils.escapeHtml(item.installmentLabel)} â€¢ ${item.remaining} restantes</div>
            </div>
            <strong>${RFUtils.formatBRL(item.amount)}</strong>
          </div>
        `).join("")
      : `<div class="card-footnote">Sem parcelas ativas neste perÃ­odo.</div>`;

    return `
      <article class="card-item" style="background:${RFUtils.escapeHtml(card.color)};">
        <div class="card-top">
          <div>
            <div class="card-name">${RFUtils.escapeHtml(card.name)}</div>
            <div class="card-subtitle">${RFUtils.escapeHtml(card.brand)} â€¢ final ${RFUtils.escapeHtml(card.last_four)}</div>
          </div>
          <div class="metric-chip">Fatura ${RFUtils.escapeHtml(state.month)}</div>
        </div>

        <div class="card-meta" style="margin-top:16px;">
          <div>
            <div class="card-footnote">Fatura atual</div>
            <div class="card-limit">${RFUtils.formatBRL(card.invoice)}</div>
          </div>
          <div>
            <div class="card-footnote">DisponÃ­vel</div>
            <div class="card-limit">${RFUtils.formatBRL(card.availableCredit)}</div>
          </div>
        </div>

        <div class="transaction-tags" style="margin-top:16px;">
          <span class="metric-chip">Limite ${RFUtils.formatBRL(card.credit_limit)}</span>
          <span class="metric-chip">${card.activeInstallmentsCount} compras parceladas</span>
          <span class="metric-chip">Fecha dia ${card.closing_day}</span>
          <span class="metric-chip">Vence dia ${card.due_day}</span>
        </div>

        <div class="card-installments-list" style="margin-top:18px;">
          ${installments}
        </div>
      </article>
    `;
  }).join("");
}

function openModal(kind) {
  const templates = {
    salaryModal: {
      title: "Definir salÃ¡rio base",
      subtitle: "Esse valor entra como base fixa no cÃ¡lculo do saldo.",
      templateId: "salaryTemplate",
      onSubmit: async (formData) => {
        await api.saveSettings({ monthlyIncome: Number(formData.get("monthlyIncome")) });
      }
    },
    transactionModal: {
      title: "Novo lanÃ§amento",
      subtitle: "Entrada ou despesa comum. Para parcelamento, use a aÃ§Ã£o especÃ­fica.",
      templateId: "transactionTemplate",
      onSubmit: async (formData) => {
        await api.createTransaction({
          title: formData.get("title"),
          amount: Number(formData.get("amount")),
          type: formData.get("type"),
          categoryId: Number(formData.get("categoryId")),
          paymentMethod: formData.get("paymentMethod"),
          transactionDate: formData.get("transactionDate"),
          notes: formData.get("notes"),
          cardId: formData.get("cardId") ? Number(formData.get("cardId")) : null,
          billingMonth: formData.get("paymentMethod") === "crÃ©dito" && formData.get("cardId") ? state.month : null,
          isRecurring: formData.get("isRecurring") === "on",
          recurrenceType: formData.get("isRecurring") === "on" ? "monthly" : null,
          recurrenceDay: formData.get("isRecurring") === "on" ? Number(formData.get("recurrenceDay")) : null
        });
      }
    },
    categoryModal: {
      title: "Nova categoria",
      subtitle: "Amplie as categorias sem mexer no cÃ³digo da interface.",
      templateId: "categoryTemplate",
      onSubmit: async (formData) => {
        await api.createCategory({
          name: formData.get("name"),
          type: formData.get("type"),
          color: formData.get("color"),
          icon: formData.get("icon")
        });
      }
    },
    cardModal: {
      title: "Novo cartÃ£o",
      subtitle: "Cadastre limite, fechamento e vencimento.",
      templateId: "cardTemplate",
      onSubmit: async (formData) => {
        await api.createCard({
          name: formData.get("name"),
          brand: formData.get("brand"),
          lastFour: formData.get("lastFour"),
          creditLimit: Number(formData.get("creditLimit")),
          color: formData.get("color"),
          closingDay: Number(formData.get("closingDay")),
          dueDay: Number(formData.get("dueDay"))
        });
      }
    },
    installmentModal: {
      title: "Compra parcelada",
      subtitle: "O sistema gera todas as parcelas e distribui por fatura.",
      templateId: "installmentTemplate",
      onSubmit: async (formData) => {
        await api.createInstallment(formData.get("cardId"), {
          title: formData.get("title"),
          categoryId: Number(formData.get("categoryId")),
          totalAmount: Number(formData.get("totalAmount")),
          totalInstallments: Number(formData.get("totalInstallments")),
          purchaseDate: formData.get("purchaseDate"),
          notes: formData.get("notes")
        });
      }
    }
  };

  const config = templates[kind];
  if (!config) return;

  modalTitle.textContent = config.title;
  modalSubtitle.textContent = config.subtitle;
  modalForm.innerHTML = document.getElementById(config.templateId).innerHTML;
  modalBackdrop.classList.remove("hidden");
  modalWindow.classList.remove("hidden");

  if (kind === "salaryModal") {
    modalForm.elements.monthlyIncome.value = state.data.settings.monthly_income;
  }

  if (kind === "transactionModal") {
    const typeSelect = modalForm.elements.type;
    const categorySelect = modalForm.querySelector("#transactionCategorySelect");
    const cardSelect = modalForm.querySelector("#transactionCardSelect");
    modalForm.elements.transactionDate.value = currentDayISO();
    modalForm.elements.recurrenceDay.value = String(Number(modalForm.elements.transactionDate.value.slice(-2)));
    modalForm.elements.recurrenceDay.disabled = true;
    fillCategorySelect(categorySelect, getExpenseCategories());
    fillCardSelect(cardSelect, true);

    typeSelect.addEventListener("change", () => {
      fillCategorySelect(categorySelect, typeSelect.value === "income" ? getIncomeCategories() : getExpenseCategories());
    });
    modalForm.elements.isRecurring.addEventListener("change", () => {
      modalForm.elements.recurrenceDay.disabled = !modalForm.elements.isRecurring.checked;
    });
    modalForm.elements.transactionDate.addEventListener("change", () => {
      if (!modalForm.elements.isRecurring.checked) {
        modalForm.elements.recurrenceDay.value = String(Number(modalForm.elements.transactionDate.value.slice(-2)));
      }
    });
  }

  if (kind === "installmentModal") {
    const categorySelect = modalForm.querySelector("#installmentCategorySelect");
    const cardSelect = modalForm.querySelector("#installmentCardSelect");
    modalForm.elements.purchaseDate.value = currentDayISO();
    fillCategorySelect(categorySelect, getExpenseCategories());
    fillCardSelect(cardSelect, false);
  }

  modalForm.onsubmit = async (event) => {
    event.preventDefault();
    try {
      const formData = new FormData(modalForm);
      await config.onSubmit(formData);
      closeModal();
      await loadDashboard();
      RFUtils.showToast("Salvo com sucesso.");
    } catch (error) {
      RFUtils.showToast(error.message);
    }
  };
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
  modalWindow.classList.add("hidden");
  modalForm.innerHTML = "";
}

async function loadDashboard() {
  state.data = await api.getBootstrap(state.month);
  populateAdvancedFilters();
  renderAlerts();
  renderKpis();
  renderCategoryChart();
  renderTrendChart();
  renderRecurringSuggestions();
  renderTransactions();
  renderCards();
}

document.addEventListener("click", async (event) => {
  const modalTrigger = event.target.closest("[data-modal-target]");
  if (modalTrigger) openModal(modalTrigger.dataset.modalTarget);

  if (event.target === modalBackdrop || event.target === closeModalBtn) closeModal();

  const deleteBtn = event.target.closest("[data-delete-id]");
  if (deleteBtn) {
    try {
      await api.deleteTransaction(deleteBtn.dataset.deleteId);
      await loadDashboard();
      RFUtils.showToast("LanÃ§amento removido.");
    } catch (error) {
      RFUtils.showToast(error.message);
    }
  }

  const alertClose = event.target.closest("[data-close-alert]");
  if (alertClose) {
    const visibleAlerts = (state.data?.alerts || []).filter((alert) => !sessionStorage.getItem(alertStorageKey(alert)));
    const alert = visibleAlerts[Number(alertClose.dataset.closeAlert)];
    if (alert) sessionStorage.setItem(alertStorageKey(alert), "1");
    renderAlerts();
  }

  if (event.target.closest("#toggleAlertsCollapse")) {
    state.alertsCollapsed = !state.alertsCollapsed;
    renderAlerts();
  }

  const recurringToggle = event.target.closest("[data-set-recurring-id]");
  if (recurringToggle) {
    try {
      await api.setRecurring(recurringToggle.dataset.setRecurringId, {
        is_recurring: true,
        recurrence_type: "monthly",
        recurrence_day: Number(recurringToggle.dataset.recurrenceDay || 1)
      });
      await loadDashboard();
      RFUtils.showToast("RecorrÃªncia ativada.");
    } catch (error) {
      RFUtils.showToast(error.message);
    }
  }

  if (event.target.closest("#acceptRecurringBtn")) {
    try {
      await acceptRecurringSuggestions();
    } catch (error) {
      RFUtils.showToast(error.message);
    }
  }

  if (event.target.closest("#viewRecurringBtn")) {
    const details = (state.data?.recurringSuggestions || [])
      .map((item) => `${item.title} em ${item.suggested_date}`)
      .join(" â€¢ ");
    RFUtils.showToast(details || "Sem recorrÃªncias pendentes.");
  }
});

monthPicker.value = state.month;
chartTypeSelect.value = state.chartType;
clearFiltersBtn.classList.add("hidden-soft");

monthPicker.addEventListener("change", async (event) => {
  state.month = event.target.value;
  await loadDashboard();
});

chartTypeSelect.addEventListener("change", () => {
  state.chartType = chartTypeSelect.value;
  localStorage.setItem("rf_chart_type", state.chartType);
  renderCategoryChart();
});

transactionSearch.addEventListener("input", () => {
  state.search = transactionSearch.value;
  renderTransactions();
});

toggleFiltersBtn.addEventListener("click", () => {
  state.filtersOpen = !state.filtersOpen;
  advancedFilters.classList.toggle("collapsed", !state.filtersOpen);
});

[filterType, filterCategory, filterMinAmount, filterMaxAmount, filterPayment].forEach((control) => {
  control.addEventListener("input", () => {
    state.filters = {
      type: filterType.value,
      categoryId: filterCategory.value,
      minAmount: filterMinAmount.value,
      maxAmount: filterMaxAmount.value,
      paymentMethod: filterPayment.value
    };
    clearFiltersBtn.classList.toggle("hidden-soft", !filtersAreActive());
    renderTransactions();
  });
});

clearFiltersBtn.addEventListener("click", () => {
  transactionSearch.value = "";
  filterType.value = "";
  filterCategory.value = "";
  filterMinAmount.value = "";
  filterMaxAmount.value = "";
  filterPayment.value = "";
  state.search = "";
  state.filters = { type: "", categoryId: "", minAmount: "", maxAmount: "", paymentMethod: "" };
  clearFiltersBtn.classList.add("hidden-soft");
  renderTransactions();
});

exportCsvBtn.addEventListener("click", async () => {
  try {
    await downloadCsv();
  } catch (error) {
    RFUtils.showToast(error.message);
  }
});

exportPdfBtn.addEventListener("click", async () => {
  try {
    await downloadPdf();
  } catch (error) {
    RFUtils.showToast(error.message);
  }
});

hideBannerBtn.addEventListener("click", () => {
  document.querySelector(".welcome-banner").style.display = "none";
});

closeModalBtn.addEventListener("click", closeModal);

loadDashboard().catch((error) => {
  RFUtils.showToast(error.message);
});
