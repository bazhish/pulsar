function setMessage(element, message) {
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("hidden", !message);
}

async function readError(response, fallback) {
  try {
    const data = await response.json();
    return data.error || data.detail || fallback;
  } catch {
    return fallback;
  }
}

function passwordIsStrong(password) {
  return password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);
}

function setupPasswordToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.closest(".password-field").querySelector("input");
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.textContent = show ? "Esconder" : "Mostrar";
    });
  });
}

function setupLogin() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const error = document.getElementById("loginError");
  const success = document.getElementById("loginSuccess");
  const params = new URLSearchParams(window.location.search);
  setMessage(success, params.get("registered") === "1" ? "Cadastro criado. Entre para continuar." : "");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(error, "");

    const formData = new FormData(form);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        setMessage(error, await readError(response, "E-mail ou senha inválidos."));
        return;
      }

      const data = await response.json();
      sessionStorage.setItem("rf_token", data.access_token);
      window.location.href = "/";
    } catch {
      setMessage(error, "Não foi possível entrar agora.");
    }
  });
}

function setupRegister() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  const error = document.getElementById("registerError");
  const password = form.elements.password;
  const confirmPassword = form.elements.confirmPassword;
  const passwordHint = document.getElementById("passwordHint");
  const confirmHint = document.getElementById("confirmHint");

  function validatePasswordFields() {
    const strong = passwordIsStrong(password.value);
    const same = !confirmPassword.value || password.value === confirmPassword.value;
    password.classList.toggle("field-invalid", password.value.length > 0 && !strong);
    confirmPassword.classList.toggle("field-invalid", confirmPassword.value.length > 0 && !same);
    passwordHint.classList.toggle("hint-danger", password.value.length > 0 && !strong);
    confirmHint.classList.toggle("hidden", same);
    return strong && password.value === confirmPassword.value;
  }

  password.addEventListener("input", validatePasswordFields);
  confirmPassword.addEventListener("input", validatePasswordFields);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(error, "");

    if (!validatePasswordFields()) {
      setMessage(error, "Revise a senha antes de continuar.");
      return;
    }

    const payload = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      password: password.value
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        setMessage(error, await readError(response, "Não foi possível criar a conta."));
        return;
      }

      sessionStorage.removeItem("rf_token");
      window.location.href = "/login?registered=1";
    } catch {
      setMessage(error, "Não foi possível criar a conta agora.");
    }
  });
}

setupPasswordToggles();
setupLogin();
setupRegister();
