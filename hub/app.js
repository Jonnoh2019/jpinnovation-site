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

const supabaseUrl = "https://ueqdkiwouxhhdhdmjlsl.supabase.co";
const supabasePublishableKey = "sb_publishable_nLAyyfVIBq_eM3TzZQHb-g_EV-knjl-";
const hubBackend = window.supabase?.createClient(supabaseUrl, supabasePublishableKey);

function setHubAuthTab(mode = "signin") {
  const isRegister = mode === "register";
  $all("[data-hub-auth-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.hubAuthTab === mode);
  });
  $("#hubSigninForm")?.classList.toggle("hidden", isRegister);
  $("#hubRegisterForm")?.classList.toggle("hidden", !isRegister);
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
  const email = String(data.email || "").trim().toLowerCase();
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
  const email = String(data.email || "").trim().toLowerCase();
  const { error } = await hubBackend.auth.signUp({
    email,
    password: data.password,
    options: {
      emailRedirectTo: `${window.location.origin}/hub-portal/index.html?entry=client&signin=1`,
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
  if (params.get("register") === "1") openHubAuth("register");
  else if (params.get("signin") === "1") openHubAuth("signin");
}

registerInterestHandler();
hubAuthHandler();
