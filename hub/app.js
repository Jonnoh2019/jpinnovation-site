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
const hubBackend = window.supabase?.createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
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
  if ($("#hubAuthTitle")) $("#hubAuthTitle").textContent = "Innovation Hub login";
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

const featurePreviews = {
  community: {
    label: "Engineering boards",
    title: "Useful answers from real engineering discussions.",
    copy: "Open a board, browse its discussion threads or start a focused question for other approved members.",
    preview: `<div class="feature-ui feature-ui-boards" aria-label="Example Engineering Boards discussion list">
      <div class="feature-ui-toolbar"><strong>General Chat</strong><span>12 discussions</span></div>
      <div class="feature-ui-row"><span class="feature-ui-icon">&#128172;</span><span><b>Welcome to the Innovation Hub</b><small>Introductions, updates and member news</small></span><em>8 replies</em></div>
      <div class="feature-ui-row"><span class="feature-ui-icon">&#128172;</span><span><b>Reliable UK prototype suppliers</b><small>Recommendations and recent experience</small></span><em>5 replies</em></div>
      <div class="feature-ui-row"><span class="feature-ui-icon">&#128172;</span><span><b>What are you building this month?</b><small>Share progress with other members</small></span><em>14 replies</em></div>
    </div>`,
    points: ["General Chat", "CAD & Design", "3D Printing", "CNC & Machining", "Jobs & Collaboration"]
  },
  quotes: {
    label: "Private quotes",
    title: "Share requirements without a public price race.",
    copy: "Approved requests can be reviewed by suitable members, with each response kept private.",
    preview: `<div class="feature-ui" aria-label="Example private quote request">
      <div class="feature-ui-toolbar"><strong>Private quote request</strong><span class="feature-ui-status">Open</span></div>
      <div class="feature-ui-summary"><span><small>REQUEST</small><b>Prototype enclosure machining</b></span><span><small>QUANTITY</small><b>5 units</b></span><span><small>NEEDED BY</small><b>28 August</b></span></div>
      <div class="feature-ui-file"><span>&#128196;</span><span><b>enclosure-rev-b.step</b><small>STEP file &middot; 4.8 MB</small></span><em>Private</em></div>
    </div>`,
    points: ["Clear scope and files", "Private supplier responses", "JP Innovation moderation"]
  },
  directory: {
    label: "Member directory",
    title: "Find the right capability faster.",
    copy: "Search approved profiles by skill, location, equipment and current capacity.",
    preview: `<div class="feature-ui" aria-label="Example member directory list">
      <div class="feature-ui-toolbar"><strong>Member directory</strong><span>Search skills or location</span></div>
      <div class="feature-ui-member"><span class="feature-ui-avatar">SC</span><span><b>Sarah Collins</b><small>CAD design &middot; SolidWorks &middot; Bristol</small></span><em>Available</em></div>
      <div class="feature-ui-member"><span class="feature-ui-avatar">DM</span><span><b>Dan Morgan</b><small>CNC machining &middot; 5-axis &middot; Birmingham</small></span><em>Verified</em></div>
      <div class="feature-ui-member"><span class="feature-ui-avatar">AP</span><span><b>Aisha Patel</b><small>3D printing &middot; SLS/FDM &middot; Manchester</small></span><em>Available</em></div>
    </div>`,
    points: ["Verified profiles", "Local specialists", "Supplier and workshop capability"]
  },
  calculators: {
    label: "Engineering calculators",
    title: "Quick checks without leaving the Hub.",
    copy: "Use focused tools for common workshop and early design calculations.",
    preview: `<div class="feature-ui feature-ui-calculator" aria-label="Example engineering calculator">
      <div class="feature-ui-toolbar"><strong>Cutting speed calculator</strong><span>Metric</span></div>
      <div class="feature-ui-fields"><label>Tool diameter<b>10 mm</b></label><label>Cutting speed<b>120 m/min</b></label></div>
      <div class="feature-ui-result"><small>RECOMMENDED SPINDLE SPEED</small><strong>3,820 RPM</strong></div>
    </div>`,
    points: ["Speed, feed and cutting checks", "Weight and material estimates", "Unit conversions"]
  },
  templates: {
    label: "Templates and guides",
    title: "Start with the right information.",
    copy: "Practical templates make quotes, project briefs and design reviews clearer.",
    preview: `<div class="feature-ui" aria-label="Example engineering templates list">
      <div class="feature-ui-toolbar"><strong>Templates &amp; guides</strong><span>Member resources</span></div>
      <div class="feature-ui-file"><span>&#128196;</span><span><b>Engineering project brief</b><small>Editable DOCX template</small></span><em>Open</em></div>
      <div class="feature-ui-file"><span>&#9745;</span><span><b>Design review checklist</b><small>24 practical checks</small></span><em>Open</em></div>
      <div class="feature-ui-file"><span>&#128203;</span><span><b>Supplier quote checklist</b><small>Files, tolerances and quantities</small></span><em>Open</em></div>
    </div>`,
    points: ["Quote request checklist", "Project brief template", "Design and prototype checks"]
  },
  projects: {
    label: "Member projects",
    title: "Classic Mini restoration build.",
    copy: "A member can share a Mini restoration, track the work and ask the Engineering Boards for practical help with repairs, fabrication and sourcing.",
    imageSelector: '#examples img[alt="Classic Mini restoration project in a workshop"]',
    imageAlt: "Classic Mini restoration project preview",
    points: ["Bodywork and fabrication plan", "Parts and milestone list", "Member advice and progress updates"]
  }
};

function openFeaturePreview(key) {
  const feature = featurePreviews[key];
  const dialog = $("#featurePreviewDialog");
  if (!feature || !dialog) return;
  const imageSource = feature.image || (feature.imageSelector ? document.querySelector(feature.imageSelector)?.src : "") || "";
  const visual = feature.preview || (imageSource ? `<img src="${imageSource}" alt="${feature.imageAlt || "Innovation Hub feature preview"}">` : "");
  $("#featurePreviewLabel").textContent = feature.label;
  $("#featurePreviewTitle").textContent = feature.title;
  $("#featurePreviewBody").innerHTML = `<div class="feature-preview-content">${visual}<p>${feature.copy}</p><ul>${feature.points.map((point) => `<li>${point}</li>`).join("")}</ul></div>`;
  dialog.classList.add("open");
  dialog.setAttribute("aria-hidden", "false");
}

function closeFeaturePreview() {
  const dialog = $("#featurePreviewDialog");
  if (!dialog) return;
  dialog.classList.remove("open");
  dialog.setAttribute("aria-hidden", "true");
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
    await hubBackend.rpc("request_hub_access");
    await hubBackend.auth.signOut();
    throw new Error("Your Innovation Hub access request has been sent to JP Innovation. Your free Client Portal remains available while approval is pending.");
  }
  window.location.href = "../hub-portal/index.html?entry=hub";
}

async function registerHubAccount(data) {
  if (!hubBackend) throw new Error("Secure registration is temporarily unavailable. Please try again.");
  const email = validateEmail(data.email);
  const { data: result, error } = await hubBackend.auth.signUp({
    email,
    password: data.password,
    options: {
      emailRedirectTo: `${publicSiteOrigin}/hub-portal/index.html?entry=client&signin=1`,
      data: {
        full_name: String(data.fullName || "").trim(),
        account_type: "client",
        requested_access: "hub"
      }
    }
  });
  if (error) throw error;
  if (result.session) await hubBackend.rpc("request_hub_access");
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
    button.addEventListener("click", () => {
      closeFeaturePreview();
      openHubAuth(button.dataset.openHubAuth || "signin");
    });
  });
  $all("[data-feature-preview]").forEach((button) => button.addEventListener("click", () => openFeaturePreview(button.dataset.featurePreview)));
  $("#closeFeaturePreview")?.addEventListener("click", closeFeaturePreview);
  $("#featurePreviewDialog")?.addEventListener("click", (event) => {
    if (event.target === $("#featurePreviewDialog")) closeFeaturePreview();
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
        status.textContent = "Account created. Check your email to verify it, then sign in once to submit your Innovation Hub access request for admin approval.";
      }
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  });
  setHubAuthTab("signin");
  if (params.get("register") === "1") openHubAuth("register");
  else if (params.get("signin") === "1") openHubAuth("signin");
}

async function restoreHubSession() {
  if (!hubBackend) return false;
  const { data, error } = await hubBackend.auth.getSession();
  if (error || !data?.session?.user) return false;
  const { data: profile } = await hubBackend
    .from("profiles")
    .select("account_type")
    .eq("user_id", data.session.user.id)
    .single();
  if ((profile?.account_type || "client") === "client") return false;
  window.location.replace("../hub-portal/index.html?entry=hub");
  return true;
}

async function bootHubLanding() {
  registerInterestHandler();
  trackPageView();
  if (await restoreHubSession()) return;
  document.documentElement.classList.remove("restoring-hub-session");
  hubAuthHandler();
}

bootHubLanding();
