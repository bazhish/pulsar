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
    return data.detail || data.error || fallback;
  } catch {
    return fallback;
  }
}

const api = {
  async me() {
    const response = await authFetch("/api/auth/me");
    if (!response.ok) throw new Error(await responseError(response, "Falha ao carregar perfil."));
    return response.json();
  },
  async stats() {
    const response = await authFetch("/api/auth/stats");
    if (!response.ok) throw new Error(await responseError(response, "Falha ao carregar estatísticas."));
    return response.json();
  },
  async updateProfile(payload) {
    const response = await authFetch("/api/auth/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await responseError(response, "Falha ao salvar perfil."));
    return response.json();
  },
  async changePassword(payload) {
    const response = await authFetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await responseError(response, "Falha ao trocar senha."));
    return response.json();
  },
  async savePreference(payload) {
    const response = await authFetch("/api/auth/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await responseError(response, "Falha ao salvar preferência."));
    return response.json();
  },
  async bootstrap(month) {
    const response = await authFetch(`/api/bootstrap?month=${encodeURIComponent(month)}`);
    if (!response.ok) throw new Error(await responseError(response, "Falha ao gerar resumo."));
    return response.json();
  }
};

const state = {
  user: null,
  summaryData: null,
  month: new Date().toISOString().slice(0, 7)
};

const profileForm = document.getElementById("profileForm");
const passwordForm = document.getElementById("passwordForm");
const profileAvatar = document.getElementById("profileAvatar");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const monthlySummaryToggle = document.getElementById("monthlySummaryToggle");
const generateSummaryPreviewBtn = document.getElementById("generateSummaryPreviewBtn");
const summaryPreviewBackdrop = document.getElementById("summaryPreviewBackdrop");
const closeSummaryPreviewBtn = document.getElementById("closeSummaryPreviewBtn");
const summaryPreviewContent = document.getElementById("summaryPreviewContent");

function showToast(message) {
  const old = document.querySelector(".toast");
  if (old) old.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

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

function initials(name) {
  return String(name || "RF")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "RF";
}

function renderUser(user) {
  state.user = user;
  profileForm.elements.name.value = user.name || "";
  profileForm.elements.email.value = user.email || "";
  profileForm.elements.avatar_url.value = user.avatar_url || "";
  profileName.textContent = user.name || "Seu perfil";
  profileEmail.textContent = user.email || "--";
  monthlySummaryToggle.checked = Boolean(user.send_monthly_summary);

  profileAvatar.innerHTML = "";
  if (user.avatar_url) {
    const image = document.createElement("img");
    image.src = user.avatar_url;
    image.alt = "";
    profileAvatar.appendChild(image);
  } else {
    profileAvatar.textContent = initials(user.name);
  }
}

function renderStats(stats) {
  const createdAt = stats.created_at ? new Date(stats.created_at) : null;
  document.getElementById("createdAtValue").textContent = createdAt
    ? createdAt.toLocaleDateString("pt-BR")
    : "--";
  document.getElementById("transactionsValue").textContent = String(stats.total_transactions || 0);
  document.getElementById("categoriesValue").textContent = String(stats.total_categories || 0);
}

function renderMonthlySummary(data) {
  state.summaryData = data;
  const dashboard = data.dashboard;
  const topCategories = (dashboard.categoryBreakdown || []).slice(0, 3);
  document.getElementById("summaryBalancePreview").textContent = formatBRL(dashboard.balance);
  document.getElementById("summaryScorePreview").textContent = `${data.score.score} • ${data.score.label}`;
  document.getElementById("summaryCategoriesPreview").textContent = topCategories.length
    ? topCategories.map((category) => `${category.name} (${formatBRL(category.total)})`).join(", ")
    : "Sem despesas no mês";
}

function openSummaryPreview() {
  const data = state.summaryData;
  if (!data) return;
  const dashboard = data.dashboard;
  const topCategories = (dashboard.categoryBreakdown || []).slice(0, 3);
  summaryPreviewContent.innerHTML = `
    <section class="monthly-preview-card expanded">
      <div>
        <span>Saldo do mês</span>
        <strong>${formatBRL(dashboard.balance)}</strong>
      </div>
      <div>
        <span>Entradas</span>
        <strong>${formatBRL(dashboard.inflow)}</strong>
      </div>
      <div>
        <span>Saídas</span>
        <strong>${formatBRL(dashboard.outflow)}</strong>
      </div>
      <div>
        <span>Ritmo Score</span>
        <strong>${data.score.score} • ${escapeHtml(data.score.label)}</strong>
      </div>
    </section>
    <div class="summary-email-body">
      <h4>Top categorias</h4>
      ${
        topCategories.length
          ? topCategories.map((category) => `<p>${escapeHtml(category.name)}: ${formatBRL(category.total)}</p>`).join("")
          : "<p>Sem despesas registradas neste mês.</p>"
      }
    </div>
  `;
  summaryPreviewBackdrop.classList.remove("hidden");
}

function closeSummaryPreview() {
  summaryPreviewBackdrop.classList.add("hidden");
}

function passwordIsStrong(password) {
  return password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);
}

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = {
      name: profileForm.elements.name.value.trim(),
      avatar_url: profileForm.elements.avatar_url.value.trim() || null
    };
    const user = await api.updateProfile(payload);
    renderUser(user);
    showToast("Perfil atualizado.");
  } catch (error) {
    showToast(error.message);
  }
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const currentPassword = passwordForm.elements.current_password.value;
  const newPassword = passwordForm.elements.new_password.value;
  const confirmPassword = passwordForm.elements.confirm_password.value;

  if (!passwordIsStrong(newPassword)) {
    showToast("A nova senha precisa ter 8 caracteres, 1 número e 1 letra maiúscula.");
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast("A confirmação da senha não confere.");
    return;
  }

  try {
    await api.changePassword({
      current_password: currentPassword,
      new_password: newPassword
    });
    passwordForm.reset();
    showToast("Senha atualizada.");
  } catch (error) {
    showToast(error.message);
  }
});

monthlySummaryToggle.addEventListener("change", async () => {
  try {
    const user = await api.savePreference({ send_monthly_summary: monthlySummaryToggle.checked });
    renderUser(user);
    showToast("Preferência salva.");
  } catch (error) {
    monthlySummaryToggle.checked = !monthlySummaryToggle.checked;
    showToast(error.message);
  }
});

generateSummaryPreviewBtn.addEventListener("click", openSummaryPreview);
closeSummaryPreviewBtn.addEventListener("click", closeSummaryPreview);
summaryPreviewBackdrop.addEventListener("click", (event) => {
  if (event.target === summaryPreviewBackdrop) closeSummaryPreview();
});

Promise.all([api.me(), api.stats(), api.bootstrap(state.month)])
  .then(([user, stats, summary]) => {
    renderUser(user);
    renderStats(stats);
    renderMonthlySummary(summary);
  })
  .catch((error) => {
    showToast(error.message);
  });
