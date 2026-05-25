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
    if (!response.ok) throw new Error(await responseError(response, "Falha ao salvar configurações."));
    return response.json();
  },
  async createTransaction(payload) {
    const response = await authFetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await responseError(response, "Falha ao salvar lançamento."));
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
    if (!response.ok) throw new Error(await responseError(response, "Falha ao criar cartão."));
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
    if (!response.ok) throw new Error(await responseError(response, "Falha ao remover lançamento."));
    return response.json();
  },
  async exportCsv(month) {
    const response = await authFetch(`/api/export/csv?month=${encodeURIComponent(month)}`);
    if (!response.ok) throw new Error(await responseError(response, "Falha ao exportar CSV."));
    return response;
  },
  async getSuggestions(month) {
    const response = await authFetch(`/api/transactions/suggestions?month=${encodeURIComponent(month)}`);
    if (!response.ok) throw new Error(await responseError(response, "Falha ao carregar recorrências."));
    return response.json();
  }
};

const state = {
  month: new Date().toISOString().slice(0, 7),
  chartType: localStorage.getItem("rf_chart_type") || "doughnut",
  data: null,
  search: "",
  filtersOpen: false,
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

function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addMonths(monthKey, offset) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function scoreDelta(current, previous) {
  if (previous === undefined || previous === null || current === previous) return { icon: "→", label: "estável" };
  return current > previous
    ? { icon: "↑", label: `+${current - previous} vs mês anterior` }
    : { icon: "↓", label: `${current - previous} vs mês anterior` };
}

function alertStorageKey(alert) {
  return `rf_alert_closed_${state.month}_${alert.type}_${alert.category}_${alert.message}`;
}

function showToast(message) {
  const old = document.querySelector(".toast");
  if (old) old.remove();

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2600);
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
    `<option value="${category.id}">${escapeHtml(category.icon)} ${escapeHtml(category.name)}</option>`
  )).join("");
}

function fillCardSelect(select, includeEmpty = false) {
  const options = [];
  if (includeEmpty) options.push(`<option value="">Sem cartão</option>`);
  for (const card of state.data.cards) {
    options.push(`<option value="${card.id}">${escapeHtml(card.name)} • ${escapeHtml(card.last_four)}</option>`);
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
      `<option value="${category.id}">${escapeHtml(category.icon)} ${escapeHtml(category.name)}</option>`
    ))
  ].join("");
  filterCategory.value = currentCategory;

  const payments = [...new Set((state.data?.transactions || []).map((item) => item.payment_method).filter(Boolean))].sort();
  filterPayment.innerHTML = [
    `<option value="">Todos</option>`,
    ...payments.map((payment) => `<option value="${escapeHtml(payment)}">${escapeHtml(payment)}</option>`)
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
  scoreDeltaEl.className = `score-delta ${delta.icon === "↑" ? "up" : delta.icon === "↓" ? "down" : ""}`;
  scoreCard.style.setProperty("--score-color", score.color);
  scoreTooltip.innerHTML = `
    <strong>Composição do score</strong>
    <span>Gastos: ${score.breakdown.gastos}</span>
    <span>Consistência: +${score.breakdown.consistencia}</span>
    <span>Reservas: +${score.breakdown.reservas}</span>
    <span>Cartões: ${score.breakdown.cartoes}</span>
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
  alertsBanner.innerHTML = alerts.map((alert, index) => {
    const icon = alert.type === "danger" ? "!" : alert.type === "warning" ? "?" : "i";
    return `
      <article class="alert-item ${alert.type}" data-alert-index="${index}">
        <span class="alert-icon">${icon}</span>
        <div>
          <strong>${escapeHtml(alert.category)}</strong>
          <p>${escapeHtml(alert.message)}</p>
        </div>
        <button type="button" class="alert-close" data-close-alert="${index}" aria-label="Fechar alerta">×</button>
      </article>
    `;
  }).join("");
}

function renderKpis() {
  const { dashboard } = state.data;
  document.getElementById("salaryValue").textContent = formatBRL(state.data.settings.monthly_income);
  document.getElementById("inflowValue").textContent = formatBRL(dashboard.inflow);
  document.getElementById("outflowValue").textContent = formatBRL(dashboard.outflow);
  document.getElementById("balanceValue").textContent = formatBRL(dashboard.balance);
  document.getElementById("summaryInflow").textContent = formatBRL(dashboard.inflow);
  document.getElementById("summaryOutflow").textContent = formatBRL(dashboard.outflow);
  document.getElementById("summaryNet").textContent = formatBRL(dashboard.balance);
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
              return `${context.label}: ${formatBRL(value)}`;
            }
          }
        }
      },
      scales: ["bar"].includes(state.chartType)
        ? {
            y: {
              beginAtZero: true,
              ticks: { callback: (value) => formatBRL(value) }
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
          label: "Saídas",
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
              if (context.dataset.label === "Meta de gastos") return `Meta: ${formatBRL(goalLine)}`;
              const previous = trend[context.dataIndex - 1];
              const diff = previous ? item.net - previous.net : 0;
              return [
                `Entradas: ${formatBRL(item.inflow)}`,
                `Saídas: ${formatBRL(item.outflow)}`,
                `Saldo: ${formatBRL(item.net)}`,
                previous ? `Vs mês anterior: ${diff >= 0 ? "+" : ""}${formatBRL(diff)}` : "Primeiro mês da série"
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
              return formatBRL(value);
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
    transactionsList.innerHTML = `<div class="empty-state">Nenhum lançamento encontrado para esse filtro.</div>`;
    return;
  }

  transactionsList.innerHTML = transactions.map((item) => {
    const installment = item.total_installments
      ? `<span class="tag">Parcela ${item.installment_number}/${item.total_installments}</span>`
      : "";
    const card = item.card_name
      ? `<span class="tag">${escapeHtml(item.card_name)}</span>`
      : "";
    const billing = item.billing_month
      ? `<span class="tag">Fatura ${escapeHtml(item.billing_month)}</span>`
      : "";
    const recurring = item.is_recurring
      ? `<span class="tag">Recorrente</span>`
      : "";

    return `
      <article class="transaction-item">
        <div class="transaction-top">
          <div>
            <div class="transaction-title">${escapeHtml(item.title)}</div>
            <div class="transaction-meta">${escapeHtml(item.category_name || "Sem categoria")} • ${escapeHtml(item.payment_method)} • ${escapeHtml(item.transaction_date)}</div>
          </div>
          <div class="transaction-amount ${item.type}">${item.type === "income" ? "+" : "-"} ${formatBRL(item.amount)}</div>
        </div>

        <div class="transaction-tags">
          <span class="tag">${item.type === "income" ? "Entrada" : "Despesa"}</span>
          ${card}
          ${billing}
          ${installment}
          ${recurring}
        </div>

        <div class="transaction-actions">
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
      <strong>💡 ${suggestions.length} lançamentos recorrentes aguardando confirmação para este mês</strong>
      <p>${suggestions.slice(0, 3).map((item) => escapeHtml(item.title)).join(", ")}</p>
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
  showToast("Recorrências confirmadas.");
}

async function downloadCsv() {
  const response = await api.exportCsv(state.month);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  link.href = url;
  link.download = match?.[1] || `financeiro-${state.month}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderCards() {
  const cards = state.data.cards;

  if (!cards.length) {
    cardsStack.innerHTML = `<div class="empty-state">Nenhum cartão cadastrado.</div>`;
    return;
  }

  cardsStack.innerHTML = cards.map((card) => {
    const installments = card.activeInstallments.length
      ? card.activeInstallments.map((item) => `
          <div class="card-installment">
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <div class="card-footnote">${escapeHtml(item.installmentLabel)} • ${item.remaining} restantes</div>
            </div>
            <strong>${formatBRL(item.amount)}</strong>
          </div>
        `).join("")
      : `<div class="card-footnote">Sem parcelas ativas neste período.</div>`;

    return `
      <article class="card-item" style="background:${escapeHtml(card.color)};">
        <div class="card-top">
          <div>
            <div class="card-name">${escapeHtml(card.name)}</div>
            <div class="card-subtitle">${escapeHtml(card.brand)} • final ${escapeHtml(card.last_four)}</div>
          </div>
          <div class="metric-chip">Fatura ${escapeHtml(state.month)}</div>
        </div>

        <div class="card-meta" style="margin-top:16px;">
          <div>
            <div class="card-footnote">Fatura atual</div>
            <div class="card-limit">${formatBRL(card.invoice)}</div>
          </div>
          <div>
            <div class="card-footnote">Disponível</div>
            <div class="card-limit">${formatBRL(card.availableCredit)}</div>
          </div>
        </div>

        <div class="transaction-tags" style="margin-top:16px;">
          <span class="metric-chip">Limite ${formatBRL(card.credit_limit)}</span>
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
      title: "Definir salário base",
      subtitle: "Esse valor entra como base fixa no cálculo do saldo.",
      templateId: "salaryTemplate",
      onSubmit: async (formData) => {
        await api.saveSettings({ monthlyIncome: Number(formData.get("monthlyIncome")) });
      }
    },
    transactionModal: {
      title: "Novo lançamento",
      subtitle: "Entrada ou despesa comum. Para parcelamento, use a ação específica.",
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
          billingMonth: formData.get("paymentMethod") === "crédito" && formData.get("cardId") ? state.month : null,
          isRecurring: formData.get("isRecurring") === "on",
          recurrenceType: formData.get("isRecurring") === "on" ? "monthly" : null,
          recurrenceDay: formData.get("isRecurring") === "on" ? Number(formData.get("recurrenceDay")) : null
        });
      }
    },
    categoryModal: {
      title: "Nova categoria",
      subtitle: "Amplie as categorias sem mexer no código da interface.",
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
      title: "Novo cartão",
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
      showToast("Salvo com sucesso.");
    } catch (error) {
      showToast(error.message);
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
      showToast("Lançamento removido.");
    } catch (error) {
      showToast(error.message);
    }
  }

  const alertClose = event.target.closest("[data-close-alert]");
  if (alertClose) {
    const visibleAlerts = (state.data?.alerts || []).filter((alert) => !sessionStorage.getItem(alertStorageKey(alert)));
    const alert = visibleAlerts[Number(alertClose.dataset.closeAlert)];
    if (alert) sessionStorage.setItem(alertStorageKey(alert), "1");
    renderAlerts();
  }

  if (event.target.closest("#acceptRecurringBtn")) {
    try {
      await acceptRecurringSuggestions();
    } catch (error) {
      showToast(error.message);
    }
  }

  if (event.target.closest("#viewRecurringBtn")) {
    const details = (state.data?.recurringSuggestions || [])
      .map((item) => `${item.title} em ${item.suggested_date}`)
      .join(" • ");
    showToast(details || "Sem recorrências pendentes.");
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
    showToast(error.message);
  }
});

hideBannerBtn.addEventListener("click", () => {
  document.querySelector(".welcome-banner").style.display = "none";
});

closeModalBtn.addEventListener("click", closeModal);

loadDashboard().catch((error) => {
  showToast(error.message);
});
