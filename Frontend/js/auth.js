function showFormMsg(text) {
  const el = document.getElementById("formMsg");
  el.textContent = text;
  el.hidden = false;
}

function clearFormMsg() {
  const el = document.getElementById("formMsg");
  el.hidden = true;
  el.textContent = "";
}

function clearFieldErrors(fields) {
  fields.forEach((name) => {
    const el = document.getElementById(`${name}Error`);
    if (el) {
      el.hidden = true;
      el.textContent = "";
    }
  });
}

function applyFieldErrors(fieldErrors) {
  if (!Array.isArray(fieldErrors)) return;
  fieldErrors.forEach(({ field, message }) => {
    const el = document.getElementById(`${field}Error`);
    if (el) {
      el.textContent = message;
      el.hidden = false;
    }
  });
}

async function handleAuthSubmit(event, { fields, request, onSuccess }) {
  event.preventDefault();
  clearFormMsg();
  clearFieldErrors(fields);

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;

  const values = {};
  fields.forEach((name) => {
    values[name] = document.getElementById(name).value.trim();
  });

  try {
    const data = await request(values);
    onSuccess(data);
  } catch (err) {
    if (err.fieldErrors) {
      applyFieldErrors(err.fieldErrors);
    } else {
      showFormMsg(err.message);
    }
  } finally {
    submitBtn.disabled = false;
  }
}

function onAuthSuccess(data) {
  setSession(
    { _id: data._id, name: data.name, email: data.email, role: data.role },
    data.token
  );
  window.location.href = "index.html";
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", (event) =>
    handleAuthSubmit(event, {
      fields: ["email", "password"],
      request: (values) =>
        apiFetch("/auth/login", { method: "POST", body: JSON.stringify(values) }),
      onSuccess: onAuthSuccess,
    })
  );
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", (event) =>
    handleAuthSubmit(event, {
      fields: ["name", "email", "password"],
      request: (values) =>
        apiFetch("/auth/register", { method: "POST", body: JSON.stringify(values) }),
      onSuccess: onAuthSuccess,
    })
  );
}