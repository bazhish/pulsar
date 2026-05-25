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
  async getGoals(month) {
    const response = await authFetch(`/api/goals?month=${encodeURIComponent(month)}`);
    if (!response.ok) throw new Error("Falha ao carregar metas.");
    return response.json();
  },
  async saveGoal(dailyGoal) {
    const response = await authFetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyGoal })
    });
    if (!response.ok) throw new Error(await responseError(response, "Falha ao salvar meta."));
    return response.json();
  }
};

const monthNames = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

const state = {
  month: new Date().toISOString().slice(0, 7),
  data: null,
  selectedDay: null
};

const goalMonthPicker = document.getElementById("goalMonthPicker");
const dailyGoalInput = document.getElementById("dailyGoalInput");
const saveGoalBtn = document.getElementById("saveGoalBtn");
const calendarGrid = document.getElementById("calendarGrid");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const selectedDateDescription = document.getElementById("selectedDateDescription");
const selectedGoalValue = document.getElementById("selectedGoalValue");
const selectedSpentValue = document.getElementById("selectedSpentValue");
const selectedRemainingValue = document.getElementById("selectedRemainingValue");
const goalSummaryTitle = document.getElementById("goalSummaryTitle");
const goalSummaryDescription = document.getElementById("goalSummaryDescription");
const latestDaysList = document.getElementById("latestDaysList");

function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
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

function getFirstWeekday(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).getDay();
}

function loadSelectedDay(dayNumber) {
  state.selectedDay = state.data.days.find((item) => item.day === dayNumber) || state.data.days[0];
  renderSelectedDay();
  highlightSelectedNode();
}

function renderSelectedDay() {
  if (!state.selectedDay) return;
  const [year, month] = state.month.split("-").map(Number);
  const day = state.selectedDay.day;

  selectedDateLabel.textContent = `${day} de ${monthNames[month - 1]}`;
  selectedDateDescription.textContent =
    state.selectedDay.spent > state.data.dailyGoal
      ? "Esse dia passou da meta. O círculo ficou vermelho porque o gasto ultrapassou o limite definido."
      : state.selectedDay.spent === 0
        ? "Nenhuma despesa registrada nesse dia."
        : "Esse dia ficou dentro da meta estabelecida.";
  selectedGoalValue.textContent = formatBRL(state.data.dailyGoal);
  selectedSpentValue.textContent = formatBRL(state.selectedDay.spent);
  selectedRemainingValue.textContent = formatBRL(state.selectedDay.remaining);
}

function highlightSelectedNode() {
  document.querySelectorAll(".day-node").forEach((node) => {
    node.classList.toggle("selected", Number(node.dataset.day) === state.selectedDay.day);
  });
}

function renderCalendar() {
  const firstWeekday = getFirstWeekday(state.month);
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const currentDay = today.getDate();

  const emptyCells = Array.from({ length: firstWeekday }, () => `<div class="day-slot empty"></div>`);
  const dayCells = state.data.days.map((day) => {
    const isFuture = state.month === currentMonth && day.day > currentDay;
    let ringColor = "var(--used)";
    let ringRest = "var(--remaining)";

    if (day.spent > state.data.dailyGoal) {
      ringColor = "var(--exceeded)";
      ringRest = "rgba(255,255,255,.08)";
    }

    if (day.spent === 0) {
      ringColor = "var(--remaining)";
    }

    return `
      <div class="day-slot">
        <button
          class="day-node ${isFuture ? "future" : ""}"
          data-day="${day.day}"
          style="--progress:${Math.min(day.progress, 100)}; --ring-color:${ringColor}; --ring-rest:${ringRest};"
          type="button"
        >
          <span class="day-number">${day.day}</span>
        </button>
      </div>
    `;
  });

  calendarGrid.innerHTML = [...emptyCells, ...dayCells].join("");

  document.querySelectorAll(".day-node").forEach((button) => {
    button.addEventListener("click", () => {
      loadSelectedDay(Number(button.dataset.day));
    });
  });
}

function renderSummary() {
  const okDays = state.data.days.filter((day) => day.spent > 0 && day.spent <= state.data.dailyGoal).length;
  const overDays = state.data.days.filter((day) => day.spent > state.data.dailyGoal).length;
  const zeroDays = state.data.days.filter((day) => day.spent === 0).length;

  goalSummaryTitle.textContent = `${okDays} dias dentro da meta`;
  goalSummaryDescription.textContent = `${overDays} dias passaram da meta e ${zeroDays} dias não tiveram despesa registrada.`;

  const latest = state.data.days
    .filter((day) => day.spent > 0)
    .slice()
    .sort((a, b) => b.day - a.day)
    .slice(0, 5);

  latestDaysList.innerHTML = latest.length
    ? latest.map((item) => {
        const over = item.spent > state.data.dailyGoal;
        return `
          <div class="latest-item">
            <div>
              <strong>${item.day} de ${monthNames[Number(state.month.slice(5, 7)) - 1]}</strong>
              <small>${over ? "Acima da meta" : "Dentro da meta"}</small>
            </div>
            <b class="${over ? "status-over" : "status-ok"}">${formatBRL(item.spent)}</b>
          </div>
        `;
      }).join("")
    : `<div class="latest-item"><div><strong>Sem gastos</strong><small>Nada lançado ainda.</small></div><b>--</b></div>`;
}

async function loadGoals() {
  state.data = await api.getGoals(state.month);
  dailyGoalInput.value = state.data.dailyGoal;
  renderCalendar();
  loadSelectedDay(state.selectedDay?.day || 1);
  renderSummary();
}

goalMonthPicker.value = state.month;

goalMonthPicker.addEventListener("change", async (event) => {
  state.month = event.target.value;
  await loadGoals();
});

saveGoalBtn.addEventListener("click", async () => {
  try {
    const value = Number(dailyGoalInput.value);
    if (!(value > 0)) {
      showToast("Digite uma meta diária válida.");
      return;
    }
    await api.saveGoal(value);
    await loadGoals();
    showToast("Meta atualizada.");
  } catch (error) {
    showToast(error.message);
  }
});

loadGoals().catch((error) => {
  showToast(error.message);
});
