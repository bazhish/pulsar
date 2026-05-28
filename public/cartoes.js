const token = sessionStorage.getItem("rf_token");
if (!token) {
  window.location.href = "/login";
  throw new Error("Autenticacao necessaria.");
}

const UNLOCK_TTL_MS = 15 * 60 * 1000;

function authFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };

  return fetch(url, { ...options, headers }).then((response) => {
    if (response.status === 401 && !url.includes("/unlock")) {
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
    return data.detail || data.error || fallback;
  } catch {
    return fallback;
  }
}

const api = {
  async getCards(month) {
    const response = await authFetch(`/api/cards-detail?month=${encodeURIComponent(month)}`);
    if (!response.ok) throw new Error(await responseError(response, "Falha ao carregar cartoes."));
    return response.json();
  },
  async setPin(cardId, pin) {
    const response = await authFetch(`/api/cards/${cardId}/set-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });
    if (!response.ok) throw new Error(await responseError(response, "Falha ao definir PIN."));
    return response.json();
  },
  async unlock(cardId, pin, month) {
    const response = await authFetch(`/api/cards/${cardId}/unlock?month=${encodeURIComponent(month)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });
    if (!response.ok) {
      const error = new Error(await responseError(response, "PIN incorreto"));
      error.status = response.status;
      error.attemptsRemaining = response.headers.get("X-Attempts-Remaining");
      throw error;
    }
    return response.json();
  },
  async simulateInvoices(cardId, unlockToken, months = 12) {
    const response = await authFetch(`/api/cards/${cardId}/simulate-invoices?months=${months}`, {
      headers: { "X-Card-Unlock-Token": unlockToken }
    });
    if (!response.ok) throw new Error(await responseError(response, "Falha ao simular faturas."));
    return response.json();
  }
};

const state = {
  month: new Date().toISOString().slice(0, 7),
  cards: [],
  cardTabs: {},
  historyMonth: {},
  modalMode: "unlock",
  modalCard: null
};

const cardsGrid = document.getElementById("cardsGrid");
const cardMonthPicker = document.getElementById("cardMonthPicker");
const pinBackdrop = document.getElementById("pinBackdrop");
const closePinModalBtn = document.getElementById("closePinModalBtn");
const pinForm = document.getElementById("pinForm");
const pinInput = document.getElementById("pinInput");
const confirmPinField = document.getElementById("confirmPinField");
const confirmPinInput = document.getElementById("confirmPinInput");
const pinModalTitle = document.getElementById("pinModalTitle");
const pinModalDescription = document.getElementById("pinModalDescription");
const pinInputLabel = document.getElementById("pinInputLabel");
const pinSubmitBtn = document.getElementById("pinSubmitBtn");
const pinHelp = document.getElementById("pinHelp");
const pinError = document.getElementById("pinError");
const pinDots = document.getElementById("pinDots");

function formatMonthLabel(monthKey) {
  const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const [year, month] = monthKey.split("-").map(Number);
  return `${names[month - 1]}/${String(year).slice(2)}`;
}

function unlockKey(cardId) {
  return `rf_card_unlock_${cardId}`;
}

function getStoredUnlock(cardId) {
  const raw = sessionStorage.getItem(unlockKey(cardId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      sessionStorage.removeItem(unlockKey(cardId));
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(unlockKey(cardId));
    return null;
  }
}

function storeUnlock(cardId, data) {
  sessionStorage.setItem(unlockKey(cardId), JSON.stringify({
    expiresAt: Date.now() + UNLOCK_TTL_MS,
    data
  }));
}

function clearUnlock(cardId) {
  sessionStorage.removeItem(unlockKey(cardId));
}

function maskValue(unlock, value) {
  return unlock ? RFUtils.formatBRL(value) : "R$ â€¢â€¢â€¢â€¢â€¢â€¢";
}

function renderSummary() {
  let allUnlocked = state.cards.length > 0;
  let totalLimit = 0;
  let totalInvoice = 0;
  let totalInstallments = 0;

  for (const card of state.cards) {
    const unlock = getStoredUnlock(card.id);
    if (!unlock) {
      allUnlocked = false;
      continue;
    }
    totalLimit += Number(unlock.data.credit_limit || 0);
    totalInvoice += Number(unlock.data.invoice || 0);
    totalInstallments += (unlock.data.active_installments || []).length;
  }

  const summaryLimit = document.getElementById("summaryLimit");
  const summaryLimitNote = document.getElementById("summaryLimitNote");
  summaryLimit.textContent = allUnlocked ? RFUtils.formatBRL(totalLimit) : "R$ â€¢â€¢â€¢â€¢â€¢â€¢";
  summaryLimit.classList.toggle("masked", !allUnlocked);
  summaryLimitNote.textContent = allUnlocked
    ? "Todos os cartÃµes desta sessÃ£o estÃ£o desbloqueados."
    : "Desbloqueie todos os cartÃµes para ver o total.";
  document.getElementById("summaryInvoice").textContent = RFUtils.formatBRL(totalInvoice);
  document.getElementById("summaryInstallments").textContent = String(totalInstallments);
}

function renderCards() {
  if (!state.cards.length) {
    cardsGrid.innerHTML = `<div class="empty-state">Nenhum cartÃ£o cadastrado ainda.</div>`;
    renderSummary();
    return;
  }

  cardsGrid.innerHTML = state.cards.map((card) => renderCard(card)).join("");
  renderSummary();
}

function renderCard(card) {
  const unlock = getStoredUnlock(card.id);
  const data = unlock?.data || card;
  const unlocked = Boolean(unlock);
  const activeTab = state.cardTabs[card.id] || "installments";
  const metricsClass = unlocked ? "" : "masked";

  return `
    <article class="bank-card ${unlocked ? "unlocked-card" : ""}" data-card-id="${card.id}">
      <div class="card-head">
        <div>
          <div class="card-title"><span class="chip-mark"><span></span><span></span></span>${RFUtils.escapeHtml(card.name)}</div>
          <div class="card-brand-line">${RFUtils.escapeHtml(card.brand)} â€¢ â€¢â€¢â€¢â€¢ ${RFUtils.escapeHtml(card.last_four)}</div>
        </div>
        ${unlocked ? `<button class="action-btn action-secondary" type="button" data-lock-card="${card.id}">Bloquear</button>` : ""}
      </div>

      <div class="metrics-grid">
        <div class="metric">
          <span class="metric-label">Limite</span>
          <strong class="${metricsClass}">${maskValue(unlocked, data.credit_limit)}</strong>
        </div>
        <div class="metric">
          <span class="metric-label">Fatura</span>
          <strong class="${metricsClass}">${maskValue(unlocked, data.invoice)}</strong>
        </div>
        <div class="metric">
          <span class="metric-label">DisponÃ­vel</span>
          <strong class="${metricsClass}">${maskValue(unlocked, data.available_credit)}</strong>
        </div>
      </div>

      ${unlocked ? renderUnlockedBody(card.id, data, activeTab) : renderLockedBody(card)}
    </article>
  `;
}

function renderLockedBody(card) {
  const label = card.has_pin ? "Desbloquear com PIN" : "Definir PIN";
  return `
    <div class="card-actions">
      <button class="action-btn" type="button" data-open-pin="${card.id}">${label}</button>
    </div>
  `;
}

function renderUnlockedBody(cardId, data, activeTab) {
  return `
    <div class="card-tabs">
      <button class="tab-btn ${activeTab === "installments" ? "active" : ""}" type="button" data-card-tab="${cardId}" data-tab="installments">Parcelas</button>
      <button class="tab-btn ${activeTab === "invoices" ? "active" : ""}" type="button" data-card-tab="${cardId}" data-tab="invoices">Faturas futuras</button>
      <button class="tab-btn ${activeTab === "history" ? "active" : ""}" type="button" data-card-tab="${cardId}" data-tab="history">HistÃ³rico</button>
    </div>
    ${activeTab === "installments" ? renderInstallments(data.active_installments || []) : ""}
    ${activeTab === "invoices" ? renderInvoices(data.upcoming_invoices || []) : ""}
    ${activeTab === "history" ? renderHistory(cardId, data.recent_transactions || []) : ""}
  `;
}

function renderInstallments(items) {
  if (!items.length) {
    return `<div class="empty-state">Sem parcelas ativas neste mÃªs.</div>`;
  }

  return `
    <div class="tab-panel">
      ${items.map((item) => `
        <div class="installment-row">
          <div>
            <strong>${RFUtils.escapeHtml(item.title)}</strong>
            <div class="installment-meta">${RFUtils.escapeHtml(item.installment_label)} â€¢ ${item.remaining} restantes</div>
            <div class="progress-track"><div class="progress-fill" style="--progress:${Number(item.progress || 0)}%;"></div></div>
          </div>
          <strong>${RFUtils.formatBRL(item.amount)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderInvoices(items) {
  const visible = items.slice(0, 6);
  return `
    <div class="tab-panel">
      <p class="invoice-note">Estes valores consideram apenas parcelas jÃ¡ cadastradas. Novos gastos nÃ£o estÃ£o incluÃ­dos.</p>
      <div class="invoice-table">
        <div class="invoice-row head"><span>MÃªs</span><span>Total projetado</span><span>Parcelas</span></div>
        ${visible.map((item) => `
          <div class="invoice-row">
            <span>${formatMonthLabel(item.month)}</span>
            <strong>${RFUtils.formatBRL(item.projected_total)}</strong>
            <span>${item.installments_count} itens</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderHistory(cardId, items) {
  const filterMonth = state.historyMonth[cardId] || "";
  const filtered = filterMonth
    ? items.filter((item) => String(item.billing_month || item.transaction_date || "").startsWith(filterMonth))
    : items;

  return `
    <div class="tab-panel">
      <div class="history-filter">
        <label>
          <span class="metric-label">Filtrar perÃ­odo</span>
          <input type="month" value="${RFUtils.escapeHtml(filterMonth)}" data-history-month="${cardId}" />
        </label>
        ${filterMonth ? `<button class="action-btn action-secondary" type="button" data-clear-history-month="${cardId}">Limpar</button>` : ""}
      </div>
      ${filtered.length ? filtered.map((item) => `
        <div class="history-row">
          <div>
            <strong>${RFUtils.escapeHtml(item.title)}</strong>
            <div class="history-meta">${RFUtils.escapeHtml(item.category_name || "Sem categoria")} â€¢ ${RFUtils.escapeHtml(item.transaction_date)}</div>
          </div>
          <strong>${RFUtils.formatBRL(item.amount)}</strong>
        </div>
      `).join("") : `<div class="empty-state">Nenhuma compra encontrada para esse filtro.</div>`}
    </div>
  `;
}

function openPinModal(card) {
  state.modalCard = card;
  state.modalMode = card.has_pin ? "unlock" : "create";
  pinInput.value = "";
  confirmPinInput.value = "";
  pinError.classList.add("hidden");
  renderPinModal();
  pinBackdrop.classList.remove("hidden");
  pinInput.focus();
}

function renderPinModal() {
  const card = state.modalCard;
  const creating = state.modalMode === "create";
  pinModalTitle.textContent = `${creating ? "Definir PIN" : "PIN do cartÃ£o"} ${card.name}`;
  pinModalDescription.textContent = creating
    ? "Crie um PIN numÃ©rico de 4 a 6 dÃ­gitos. Ele serÃ¡ salvo protegido por hash."
    : "Digite o PIN para desbloquear os dados por 15 minutos.";
  pinInputLabel.textContent = creating ? "Novo PIN" : "PIN";
  pinSubmitBtn.textContent = creating ? "Definir PIN" : "Confirmar";
  pinHelp.textContent = creating ? "Use apenas nÃºmeros. NÃ£o use datas Ã³bvias." : "3 tentativas restantes";
  confirmPinField.classList.toggle("hidden", !creating);
  confirmPinInput.required = creating;
  updatePinDots();
}

function closePinModal() {
  pinBackdrop.classList.add("hidden");
  state.modalCard = null;
}

function updatePinDots() {
  const value = pinInput.value.replace(/\D/g, "").slice(0, 6);
  pinInput.value = value;
  pinDots.querySelectorAll("span").forEach((dot, index) => {
    dot.classList.toggle("filled", index < value.length);
  });
}

async function handlePinSubmit(event) {
  event.preventDefault();
  if (!state.modalCard) return;

  const card = state.modalCard;
  const pin = pinInput.value.trim();
  const confirmPin = confirmPinInput.value.trim();
  pinError.classList.add("hidden");

  if (!/^\d{4,6}$/.test(pin)) {
    showPinError("PIN deve conter de 4 a 6 dÃ­gitos.");
    return;
  }

  try {
    if (state.modalMode === "create") {
      if (pin !== confirmPin) {
        showPinError("Os PINs precisam ser iguais.");
        return;
      }
      await api.setPin(card.id, pin);
      await loadCards();
      const updatedCard = state.cards.find((item) => item.id === card.id);
      state.modalCard = updatedCard || { ...card, has_pin: true };
      state.modalMode = "unlock";
      pinInput.value = "";
      confirmPinInput.value = "";
      renderPinModal();
      RFUtils.showToast("PIN definido. Agora desbloqueie o cartÃ£o.");
      return;
    }

    const data = await api.unlock(card.id, pin, state.month);
    storeUnlock(card.id, data);
    closePinModal();
    await loadCards();
    RFUtils.showToast("CartÃ£o desbloqueado por 15 minutos.");
  } catch (error) {
    if (error.attemptsRemaining !== null && error.attemptsRemaining !== undefined) {
      pinHelp.textContent = `${error.attemptsRemaining} tentativas restantes`;
    }
    showPinError(error.message || "NÃ£o foi possÃ­vel validar o PIN.");
  }
}

function showPinError(message) {
  pinError.textContent = message;
  pinError.classList.remove("hidden");
}

async function loadCards() {
  state.cards = await api.getCards(state.month);
  renderCards();
}

document.addEventListener("click", (event) => {
  const openPin = event.target.closest("[data-open-pin]");
  if (openPin) {
    const card = state.cards.find((item) => String(item.id) === String(openPin.dataset.openPin));
    if (card) openPinModal(card);
  }

  const lockCard = event.target.closest("[data-lock-card]");
  if (lockCard) {
    clearUnlock(lockCard.dataset.lockCard);
    renderCards();
  }

  const tabButton = event.target.closest("[data-card-tab]");
  if (tabButton) {
    state.cardTabs[tabButton.dataset.cardTab] = tabButton.dataset.tab;
    renderCards();
  }

  const clearHistory = event.target.closest("[data-clear-history-month]");
  if (clearHistory) {
    delete state.historyMonth[clearHistory.dataset.clearHistoryMonth];
    renderCards();
  }

  if (event.target === pinBackdrop || event.target === closePinModalBtn) {
    closePinModal();
  }
});

document.addEventListener("input", (event) => {
  if (event.target === pinInput) updatePinDots();

  const historyMonthInput = event.target.closest("[data-history-month]");
  if (historyMonthInput) {
    state.historyMonth[historyMonthInput.dataset.historyMonth] = historyMonthInput.value;
    renderCards();
  }
});

cardMonthPicker.value = state.month;
cardMonthPicker.addEventListener("change", async (event) => {
  state.month = event.target.value;
  await loadCards();
});

pinForm.addEventListener("submit", handlePinSubmit);
closePinModalBtn.addEventListener("click", closePinModal);

setInterval(() => {
  let changed = false;
  for (const card of state.cards) {
    const hadUnlock = Boolean(sessionStorage.getItem(unlockKey(card.id)));
    if (hadUnlock && !getStoredUnlock(card.id)) changed = true;
  }
  if (changed) renderCards();
}, 60000);

loadCards().catch((error) => {
  RFUtils.showToast(error.message);
});
