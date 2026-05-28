window.RFUtils = {
  escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/`/g, "&#096;");
  },
  formatBRL(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(value || 0));
  },
  showToast(message, type = "default") {
    const old = document.querySelector(".toast");
    if (old) old.remove();
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },
  authFetch(url, options = {}) {
    const token = sessionStorage.getItem("rf_token");
    if (!token) {
      window.location.href = "/login";
      throw new Error("Nao autenticado");
    }
    const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
    return fetch(url, { ...options, headers }).then((response) => {
      if (response.status === 401 && !url.includes("/unlock")) {
        sessionStorage.removeItem("rf_token");
        window.location.href = "/login";
        throw new Error("Sessao expirada");
      }
      return response;
    });
  }
};
