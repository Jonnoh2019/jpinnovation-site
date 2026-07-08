function $(selector) {
  return document.querySelector(selector);
}

function $all(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function formData(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  $all("input[type='checkbox']", form).forEach((input) => {
    data[input.name] = input.checked;
  });
  return data;
}

const portalStoreKey = "jpHubPortal.v1";
const adminEmail = "enquiries-jpinnovation@gmail.com";
const adminTempPassword = "JPInnovationAdmin2026!";

function loadPortalState() {
  try {
    const saved = localStorage.getItem(portalStoreKey);
    const state = saved ? JSON.parse(saved) : { users: [], sessionEmail: "" };
    state.users ||= [];
    state.sessionEmail ||= "";
    ensureHubAdmin(state);
    return state;
  } catch {
    const state = { users: [], sessionEmail: "" };
    ensureHubAdmin(state);
    return state;
  }
}

function ensureHubAdmin(state) {
  if (state.users.some((user) => user.email === adminEmail)) return;
  state.users.unshift({
    id: "hub-admin",
    name: "Jon Hotard",
    business: "JP Innovation Ltd",
    email: adminEmail,
    password: adminTempPassword,
    approved: true,
    suspended: false,
    verified: true,
    level: "JP Trusted Partner",
    role: "admin"
  });
}

function savePortalState(state) {
  localStorage.setItem(portalStoreKey, JSON.stringify(state));
}

function openHubAuth() {
  const dialog = $("#hubAuthDialog");
  const status = $("#hubAuthStatus");
  if (!dialog) return;
  dialog.classList.add("open");
  dialog.setAttribute("aria-hidden", "false");
  if (status) status.textContent = "";
}

function closeHubAuth() {
  const dialog = $("#hubAuthDialog");
  const status = $("#hubAuthStatus");
  if (!dialog) return;
  dialog.classList.remove("open");
  dialog.setAttribute("aria-hidden", "true");
  if (status) status.textContent = "";
}

function signInToHub(data) {
  const state = loadPortalState();
  const email = (data.email || "").trim().toLowerCase();
  const user = state.users.find((item) => item.email === email && item.password === data.password);
  if (!user) throw new Error("Email or password is not recognised.");
  if (user.approved === false) throw new Error("This account is waiting for JP Innovation approval.");
  if (user.suspended) throw new Error("This account is currently suspended.");
  if (user.role === "client") throw new Error("This login is for the free Client Portal. Ask JP Innovation to upgrade it before Hub features open.");
  state.sessionEmail = email;
  savePortalState(state);
  window.location.href = "../hub-portal/index.html";
}

function buildInterestEmail(data) {
  const lines = [
    "Hello JP Innovation,",
    "",
    "I would like to register my interest in the JP Innovation Hub launch.",
    "",
    `Full name: ${data.fullName || ""}`,
    `Email: ${data.email || ""}`,
    `Location: ${data.location || ""}`,
    `Interested as: ${data.interestType || ""}`,
    "",
    "Introductory offer requested: 10% off my first approved JP Innovation engineering quote.",
    "",
    "Message:",
    data.message || "",
    "",
    "Please keep me updated as the Hub develops and let me know when early access becomes available.",
    "",
    "Thanks"
  ];
  return lines.join("\n");
}

function registerInterestHandler() {
  const form = $("#applyForm");
  const status = $("#applyStatus");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = formData(form);
    const subject = "JP Innovation Hub launch interest";
    const body = buildInterestEmail(data);
    window.location.href = `mailto:enquiries-jpinnovation@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (status) {
      status.textContent = "Your email app should now open with the details ready to send.";
    }
  });
}

function hubAuthHandler() {
  const form = $("#hubSigninForm");
  const status = $("#hubAuthStatus");
  const params = new URLSearchParams(window.location.search);

  $all("[data-open-hub-auth]").forEach((button) => {
    button.addEventListener("click", openHubAuth);
  });
  $("#closeHubAuth")?.addEventListener("click", closeHubAuth);
  $("#hubAuthDialog")?.addEventListener("click", (event) => {
    if (event.target === $("#hubAuthDialog")) closeHubAuth();
  });
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      signInToHub(formData(form));
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  });
  if (params.get("signin") === "1") openHubAuth();
}

registerInterestHandler();
hubAuthHandler();
