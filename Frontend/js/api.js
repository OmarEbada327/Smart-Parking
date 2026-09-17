// Your server.js serves this frontend from the same origin
// (express.static pointing at ../Frontend), so relative paths work
// without any CORS setup. If you ever serve this frontend separately,
// set API_BASE/SOCKET_URL to the full backend URL instead.
const API_BASE = "/api";
const SOCKET_URL = "";

const TOKEN_KEY = "gz_token";
const USER_KEY = "gz_user";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setSession(user, token) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function isAdmin() {
  const user = getUser();
  return !!user && user.role === "admin";
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = "login.html";
  }
}

async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (networkErr) {
    throw new Error(
      "Can't reach the server. Make sure the backend (node server.js) is running on " + API_BASE
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    // no JSON body
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
      window.location.href = "login.html";
    }
    const error = new Error((data && data.message) || "Request failed");
    error.status = res.status;
    error.fieldErrors = data && data.errors;
    throw error;
  }

  return data;
}

function connectSocket() {
  // socket.io-client is loaded via CDN script tag in the HTML.
  return SOCKET_URL ? io(SOCKET_URL, { transports: ["websocket", "polling"] }) : io();
}