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
  if ("email" in data) data.email = cleanEmailValue(data.email);
  return data;
}

function cleanEmailValue(value = "") {
  return String(value)
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/^[,;]+|[,;]+$/g, "")
    .toLowerCase();
}

function validateEmail(value = "") {
  const email = cleanEmailValue(value);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid email address, for example jpinnovation.enquiries@gmail.com");
  }
  return email;
}

function setupEmailFieldCleaning(root = document) {
  $all("input[name='email']", root).forEach((input) => {
    const clean = () => {
      const cleaned = cleanEmailValue(input.value);
      if (input.value !== cleaned) input.value = cleaned;
    };
    input.addEventListener("blur", clean);
    input.addEventListener("change", clean);
    input.addEventListener("paste", () => window.setTimeout(clean, 0));
  });
}

function analyticsVisitorId() {
  try {
    const key = "jpInnovationVisitorId";
    let id = window.localStorage.getItem(key);
    if (!id) {
      id = (window.crypto?.randomUUID && window.crypto.randomUUID()) || `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      window.localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "visitor-storage-unavailable";
  }
}

function analyticsDeviceType() {
  const width = window.innerWidth || 0;
  if (width <= 640) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}

function analyticsPath() {
  const path = window.location.pathname || "/";
  return path.endsWith("/index.html") ? path.replace(/index\.html$/, "") : path;
}

async function trackPageView() {
  if (!hubBackend) return;
  try {
    await hubBackend.from("page_views").insert({
      visitor_id: analyticsVisitorId(),
      page_path: analyticsPath(),
      page_title: document.title || "",
      referrer: document.referrer ? document.referrer.slice(0, 500) : "",
      device_type: analyticsDeviceType(),
      viewport_width: window.innerWidth || null
    });
  } catch {
    // Analytics should never interrupt the public Hub page if the database table is not ready.
  }
}

const supabaseUrl = "https://ueqdkiwouxhhdhdmjlsl.supabase.co";
const supabasePublishableKey = "sb_publishable_nLAyyfVIBq_eM3TzZQHb-g_EV-knjl-";
const hubBackend = window.supabase?.createClient(supabaseUrl, supabasePublishableKey);
const publicSiteOrigin = "https://www.jpinnovation.co.uk";
const passwordResetRedirectUrl = `${publicSiteOrigin}/hub-portal/index.html?entry=client&signin=1&reset=1`;

function setHubAuthTab(mode = "signin") {
  const isRegister = mode === "register";
  const signinForm = $("#hubSigninForm");
  const registerForm = $("#hubRegisterForm");
  const setFormVisible = (form, visible) => {
    if (!form) return;
    form.classList.toggle("hidden", !visible);
    form.hidden = !visible;
    form.setAttribute("aria-hidden", String(!visible));
    $all("input, button, textarea, select", form).forEach((control) => {
      control.disabled = !visible;
    });
  };
  $all("[data-hub-auth-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.hubAuthTab === mode);
    button.setAttribute("aria-selected", String(button.dataset.hubAuthTab === mode));
  });
  setFormVisible(signinForm, !isRegister);
  setFormVisible(registerForm, isRegister);
  if ($("#hubAuthTitle")) {
    $("#hubAuthTitle").textContent = isRegister ? "Register for access" : "Innovation Hub sign in";
  }
  if ($("#hubAuthStatus")) $("#hubAuthStatus").textContent = "";
}

function openHubAuth(mode = "signin") {
  const dialog = $("#hubAuthDialog");
  if (!dialog) return;
  dialog.classList.add("open");
  dialog.setAttribute("aria-hidden", "false");
  setHubAuthTab(mode);
}

function closeHubAuth() {
  const dialog = $("#hubAuthDialog");
  if (!dialog) return;
  dialog.classList.remove("open");
  dialog.setAttribute("aria-hidden", "true");
  if ($("#hubAuthStatus")) $("#hubAuthStatus").textContent = "";
}

async function signInToHub(data) {
  if (!hubBackend) throw new Error("Secure sign in is temporarily unavailable. Please try again.");
  const email = validateEmail(data.email);
  const { data: result, error } = await hubBackend.auth.signInWithPassword({
    email,
    password: data.password
  });
  if (error) throw error;

  const { data: profile, error: profileError } = await hubBackend
    .from("profiles")
    .select("account_type")
    .eq("user_id", result.user.id)
    .single();
  if (profileError) throw profileError;
  if ((profile.account_type || "client") === "client") {
    await hubBackend.auth.signOut();
    throw new Error("Your Client Portal account is active. Innovation Hub access unlocks after JP Innovation upgrades it to paid membership.");
  }
  window.location.href = "../hub-portal/index.html?entry=hub";
}

async function registerHubAccount(data) {
  if (!hubBackend) throw new Error("Secure registration is temporarily unavailable. Please try again.");
  const email = validateEmail(data.email);
  const { error } = await hubBackend.auth.signUp({
    email,
    password: data.password,
    options: {
      emailRedirectTo: `${publicSiteOrigin}/hub-portal/index.html?entry=client&signin=1`,
      data: {
        full_name: String(data.fullName || "").trim(),
        account_type: "client"
      }
    }
  });
  if (error) throw error;
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
    window.location.href = `mailto:jpinnovation.enquiries@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (status) status.textContent = "Your email app should now open with the details ready to send.";
  });
}

function hubAuthHandler() {
  const signinForm = $("#hubSigninForm");
  const registerForm = $("#hubRegisterForm");
  const status = $("#hubAuthStatus");
  const params = new URLSearchParams(window.location.search);
  setupEmailFieldCleaning();

  $all("[data-open-hub-auth]").forEach((button) => {
    button.addEventListener("click", () => openHubAuth(button.dataset.openHubAuth || "signin"));
  });
  $all("[data-hub-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => setHubAuthTab(button.dataset.hubAuthTab));
  });
  $("#closeHubAuth")?.addEventListener("click", closeHubAuth);
  $("#hubAuthDialog")?.addEventListener("click", (event) => {
    if (event.target === $("#hubAuthDialog")) closeHubAuth();
  });
  signinForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (status) status.textContent = "Signing in...";
    try {
      await signInToHub(formData(signinForm));
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  });
  $("#hubForgotPasswordButton")?.addEventListener("click", async () => {
    if (status) status.textContent = "";
    try {
      const email = validateEmail($("#hubSigninEmail")?.value || "");
      if (!hubBackend) throw new Error("Secure password reset is temporarily unavailable. Please try again.");
      const { error } = await hubBackend.auth.resetPasswordForEmail(email, {
        redirectTo: passwordResetRedirectUrl
      });
      if (status) status.textContent = error ? error.message : "Password reset email sent. Check your inbox.";
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  });
  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (status) status.textContent = "Creating your account...";
    try {
      await registerHubAccount(formData(registerForm));
      registerForm.reset();
      if (status) {
        status.textContent = "Account created. Check your email to verify it, then sign in. Hub access unlocks after a paid membership upgrade.";
      }
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  });
  setHubAuthTab("signin");
  if (params.get("register") === "1") openHubAuth("register");
  else if (params.get("signin") === "1") openHubAuth("signin");
}

registerInterestHandler();
hubAuthHandler();
trackPageView();
