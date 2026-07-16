const storeKey = "jpHubPortal.v1";
const supabaseUrl = "https://ueqdkiwouxhhdhdmjlsl.supabase.co";
const supabasePublishableKey = "sb_publishable_nLAyyfVIBq_eM3TzZQHb-g_EV-knjl-";
const portalBackend = window.supabase?.createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
const publicSiteOrigin = "https://www.jpinnovation.co.uk";
const passwordResetRedirectUrl = `${publicSiteOrigin}/hub-portal/index.html?entry=client&signin=1&reset=1`;
const serviceWorkerPath = "/jp-service-worker.js?v=phone-alerts-20260714";
const pushPublicKey = window.JP_INNOVATION_PUSH_PUBLIC_KEY || "";

const boardCategories = [
  "General Chat",
  "CAD & Design",
  "3D Printing",
  "CNC & Machining",
  "Welding & Fabrication",
  "Automotive Projects",
  "Electronics & Automation",
  "Supplier Recommendations",
  "Jobs & Collaboration"
];

const boardPostTypes = [
  { value: "information", label: "Information" },
  { value: "welcome", label: "Welcome / introduction" },
  { value: "question", label: "Question" },
  { value: "needs-help", label: "Needs help" },
  { value: "project-update", label: "Project update" },
  { value: "recommendation", label: "Recommendation" }
];

const knownPretendBoardTitles = [
  "Best way to jig a small aluminium bracket",
  "Classic Mini rear subframe repair approach"
];
const knownPretendProjectTitles = [
  "Classic Mini restoration build",
  "Smart key locker wall unit"
];
const knownPretendQuoteTitles = [
  "CNC machined prototype plate",
  "Sheet metal enclosure prototype"
];

const adminEmail = "jpinnovation.enquiries@gmail.com";
const previousAdminEmail = "enquiries-jpinnovation@gmail.com";

const state = loadState();
normaliseState();
let currentView = "dashboard";
let activeBoardPostId = "";
let activeBoardCategory = "";
let boardListScrollY = 0;
let personalBoardMode = false;
let personalQuotesMode = false;
let messageDraftRecipientEmail = "";
let activeMessageConversationKey = "";
let boardBackendAvailable = false;
let contentBackendAvailable = false;
let sharedWorkspaceBackendAvailable = false;
let reputationBackendAvailable = false;
let secureAdminProfiles = [];
let adminProfilesStatus = "idle";
let adminProfilesMessage = "Connecting to live account records...";
const entryParams = new URLSearchParams(window.location.search);
const entryMode = entryParams.get("entry") === "hub" ? "hub" : "client";
const signInRequested = entryParams.get("signin") === "1";
const registerRequested = entryParams.get("register") === "1";
const landingAuthDelayMs = 2000;
const requestedView = entryParams.get("view");
if (["dashboard", "clientwork", "onboarding", "boards", "projects", "quotes", "directory", "resources", "events", "messages", "notifications", "rewards", "profile", "settings", "admin"].includes(requestedView)) {
  currentView = requestedView;
}

const portalSections = [
  { view: "onboarding", title: "Profile Setup", detail: "Complete member basics before using the Hub fully." },
  { view: "boards", title: "Engineering Boards", detail: "Ask questions, reply to posts and mark helpful feedback." },
  { view: "projects", title: "Projects", detail: "Share member builds, restoration work and product ideas." },
  { view: "quotes", title: "Quote Requests", detail: "Create private blind quote requests and respond securely." },
  { view: "directory", title: "Member Directory", detail: "Find skills, equipment, locations and verified partners." },
  { view: "resources", title: "Resources & Tools", detail: "Use quick calculators, templates and practical engineering checklists." },
  { view: "events", title: "Events", detail: "See meetups, workshops, site visits and hosted sessions." },
  { view: "messages", title: "Messages", detail: "Keep member conversations and introductions tidy." },
  { view: "notifications", title: "Notifications", detail: "See approvals, account updates and items needing attention." },
  { view: "rewards", title: "Rewards", detail: "Track helpful points, monthly prizes and vouchers." },
  { view: "profile", title: "My Profile", detail: "Update verification details, skills and equipment." },
  { view: "settings", title: "Settings", detail: "Membership, alerts and account preferences." }
];

const clientViews = new Set(["dashboard", "projects", "quotes", "messages", "notifications", "profile", "settings"]);

function $(selector, root = document) {
  return root.querySelector(selector);
}

function $all(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function renderFormattedPostText(value = "") {
  const normalised = String(value || "").replace(/\r\n?/g, "\n");
  return `<div class="formatted-post-content">${escapeHtml(normalised)}</div>`;
}

function formattingToolbar(label = "Format message") {
  return `
    <div class="text-format-tools" role="toolbar" aria-label="${escapeHtml(label)}">
      <button type="button" data-text-format="bullets" title="Turn the selected lines into bullet points">&#8226; Bullets</button>
      <button type="button" data-text-format="numbers" title="Turn the selected lines into a numbered list">1. Numbered</button>
      <button type="button" data-text-format="quote" title="Format the selected lines as a quote">&#10095; Quote</button>
      <small>Paragraphs, spacing and lists are kept when posted.</small>
    </div>`;
}

function bindTextFormattingTools() {
  $all(".text-format-tools button[data-text-format]").forEach((button) => {
    button.addEventListener("click", () => {
      const editor = button.closest(".formatted-text-editor");
      const textarea = editor?.querySelector("textarea");
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = textarea.value.slice(0, start);
      const selected = textarea.value.slice(start, end);
      const after = textarea.value.slice(end);
      const source = selected || (button.dataset.textFormat === "numbers" ? "First item\nSecond item" : "List item");
      let counter = 0;
      const formatted = source.split("\n").map((line) => {
        const clean = line.replace(/^\s*(?:[•*-]|\d+[.)]|>)\s*/, "");
        if (!clean && selected) return "";
        if (button.dataset.textFormat === "numbers") return `${++counter}. ${clean}`;
        if (button.dataset.textFormat === "quote") return `> ${clean}`;
        return `• ${clean}`;
      }).join("\n");
      textarea.value = `${before}${formatted}${after}`;
      textarea.focus();
      textarea.setSelectionRange(start, start + formatted.length);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });
}

function formObject(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  $all("input[type='checkbox']", form).forEach((input) => {
    data[input.name] = input.checked;
  });
  if ("email" in data) data.email = cleanEmailValue(data.email);
  return data;
}

function showSuccessToast(title, detail = "") {
  let toast = $("#appSuccessToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "appSuccessToast";
    toast.className = "app-toast success";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span aria-hidden="true">&#10003;</span><div><strong>${escapeHtml(title)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</div>`;
  toast.classList.add("show");
  window.clearTimeout(showSuccessToast.timer);
  showSuccessToast.timer = window.setTimeout(() => toast.classList.remove("show"), 4200);
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
  if (!portalBackend) return;
  try {
    await portalBackend.from("page_views").insert({
      visitor_id: analyticsVisitorId(),
      page_path: analyticsPath(),
      page_title: document.title || "",
      referrer: document.referrer ? document.referrer.slice(0, 500) : "",
      device_type: analyticsDeviceType(),
      viewport_width: window.innerWidth || null
    });
  } catch {
    // Analytics should never interrupt the portal if the database table is not ready.
  }
}

function countHelpfulReplies(post) {
  return visibleBoardReplies(post).filter((reply) => reply.helpful && reply.moderationStatus === "approved").length;
}

function countVisibleReplies(post, user = currentUser()) {
  return visibleBoardReplies(post, user).length;
}

function pushSupported() {
  return "serviceWorker" in navigator && "Notification" in window;
}

function isStandaloneApp() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function isAppleMobileDevice() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function pushPermissionLabel() {
  if (!pushSupported()) return "Not supported on this browser";
  if (Notification.permission === "granted") return "Enabled on this device";
  if (Notification.permission === "denied") return "Blocked in browser settings";
  return "Not enabled yet";
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function registerNotificationServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register(serviceWorkerPath, { scope: "/" });
}

async function savePushSubscription(subscription) {
  const user = currentUser();
  if (!portalBackend || !subscription || !user?.id) return;
  const payload = subscription.toJSON();
  const { error } = await portalBackend.from("push_subscriptions").upsert({
    user_id: user.id,
    email: user.email,
    endpoint: payload.endpoint,
    p256dh: payload.keys?.p256dh || "",
    auth: payload.keys?.auth || "",
    user_agent: navigator.userAgent.slice(0, 500),
    enabled: true,
    updated_at: new Date().toISOString()
  }, { onConflict: "endpoint" });
  if (error) throw error;
}

async function enablePhoneNotifications() {
  if (!pushSupported()) {
    throw new Error("This browser does not support phone notifications for websites.");
  }
  if (isAppleMobileDevice() && !isStandaloneApp()) {
    throw new Error("On iPhone, add JP Innovation to your Home Screen first, then open the app icon and enable alerts.");
  }
  const registration = await registerNotificationServiceWorker();
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notifications were not enabled. You can change this in your browser settings.");
  }
  await registration.showNotification("JP Innovation alerts enabled", {
    body: "You will be able to receive admin tasks, messages and Hub updates here.",
    icon: "/assets/jp-app-icon-192.png",
    badge: "/assets/jp-app-icon-180.png",
    tag: "jp-alerts-enabled",
    data: { url: "/hub-portal/index.html?entry=hub&view=notifications" }
  });
  if (!pushPublicKey) {
    return "Phone alerts are enabled on this device. Backend push sending still needs the secure server key before off-site alerts can be sent automatically.";
  }
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(pushPublicKey)
  });
  await savePushSubscription(subscription);
  return "Phone alerts enabled and this device has been registered for live push notifications.";
}

async function maybeShowLocalPhoneNotification(items = []) {
  const user = currentUser();
  if (!pushSupported() || Notification.permission !== "granted" || !items.length || !user?.email) return;
  const item = items.find((entry) => entry.isNew) || items[0];
  const notificationKey = `${user.email}:${item.title}:${item.detail}`;
  try {
    if (window.localStorage.getItem("jpLastPhoneNotification") === notificationKey) return;
    window.localStorage.setItem("jpLastPhoneNotification", notificationKey);
  } catch {}
  try {
    const registration = await registerNotificationServiceWorker();
    await registration.showNotification(`JP Innovation: ${item.title}`, {
      body: item.detail || "Open JP Innovation to view the update.",
      icon: "/assets/jp-app-icon-192.png",
      badge: "/assets/jp-app-icon-180.png",
      tag: `jp-${String(item.view || "notification")}`,
      data: { url: `/hub-portal/index.html?entry=${isClientPortalContext(user) ? "client" : "hub"}&view=${encodeURIComponent(item.view || "notifications")}` }
    });
  } catch {}
}

function sortBoardPosts(posts = []) {
  return [...posts].sort((a, b) => {
    if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

function boardMatches(post, term, category, mode) {
  const haystack = [
    post.title,
    post.category,
    boardPostTypeLabel(post.postType),
    post.description,
    post.author,
    ...(post.responses || []).flatMap((reply) => [reply.author, reply.body])
  ].join(" ").toLowerCase();
  const termMatch = !term || haystack.includes(term);
  const categoryMatch = category === "All" || post.category === category;
  const modeMatch =
    mode === "all" ||
    (mode === "unanswered" && !countVisibleReplies(post)) ||
    (mode === "helpful" && countHelpfulReplies(post) > 0) ||
    (mode === "needs-help" && post.postType === "needs-help" && !countHelpfulReplies(post));
  return termMatch && categoryMatch && modeMatch;
}

function buildSearchResults(term) {
  const query = term.trim().toLowerCase();
  if (!query) return [];
  const contains = (value) => String(value || "").toLowerCase().includes(query);
  return [
    ...state.posts
      .filter((post) => [post.title, post.category, boardPostTypeLabel(post.postType), post.description, post.author, ...(post.responses || []).map((reply) => reply.body)].some(contains))
      .map((post) => ({ type: boardPostTypeLabel(post.postType), title: post.title, detail: `${post.category} - ${post.responses?.length || 0} replies`, view: "boards" })),
    ...state.projects
      .filter((project) => [project.title, project.category, project.description, project.location, project.author].some(contains))
      .map((project) => ({ type: "Project", title: project.title, detail: `${project.category} - ${project.location}`, view: "projects" })),
    ...state.quotes
      .filter((quote) => [quote.service, quote.location, quote.description, quote.deadline, quote.author].some(contains))
      .map((quote) => ({ type: "Quote request", title: quote.service, detail: `${quote.location || "Location open"} - ${quote.deadline || "Deadline TBC"}`, view: "quotes" })),
    ...state.members
      .filter((member) => [member.name, member.business, member.location, member.skill, member.equipment, member.bio].some(contains))
      .map((member) => ({ type: "Member", title: member.name, detail: `${member.business || "Independent"} - ${member.skill}`, view: "directory" })),
    ...state.events
      .filter((event) => [event.title, event.location, event.type, event.date].some(contains))
      .map((event) => ({ type: "Event", title: event.title, detail: `${event.date} - ${event.location}`, view: "events" })),
    ...(state.resources || [])
      .filter((resource) => [resource.title, resource.type, resource.detail].some(contains))
      .map((resource) => ({ type: "Resource", title: resource.title, detail: `${resource.type} - Hub resource`, view: "resources" }))
  ].slice(0, 8);
}

function loadState() {
  const saved = localStorage.getItem(storeKey);
  if (saved) return JSON.parse(saved);
  const starter = emptySeedState();
  localStorage.setItem(storeKey, JSON.stringify(starter));
  return starter;
}

function emptySeedState() {
  return {
    sessionEmail: "",
    users: [],
    posts: [],
    projects: [],
    quotes: [],
    members: [],
    messages: [],
    memberReviews: [],
    events: [],
    applications: [],
    resources: defaultResources(),
    flagged: [],
    helpfulAwards: [],
    seenBoardReplyIds: [],
    chatSummaryMinimised: false,
    rewardMonth: "July 2026",
    rewardPrize: "GBP 50 workshop voucher",
    realContentCleanupVersion: 4,
    launchChecklistVersion: 2,
    examplePackVersion: 999
  };
}

function saveState() {
  localStorage.setItem(storeKey, JSON.stringify(state));
}

function normaliseState() {
  ensureAdminAccount();
  purgePretendContent();
  ensureAdminAccount();
  state.rewardMonth ||= "July 2026";
  state.rewardPrize ||= "GBP 50 workshop voucher";
  state.rewardPrize = String(state.rewardPrize).replace(/\u00A3/g, "GBP ").replace(/[^\x20-\x7E]+/g, "").replace(/GBP\s*GBP/g, "GBP").trim();
  state.helpfulAwards ||= [];
  state.memberReviews ||= [];
  state.seenBoardReplyIds ||= [];
  state.chatSummaryMinimised = state.chatSummaryMinimised === true;
  state.resources ||= defaultResources();
  state.applications ||= [];
  state.flagged ||= [];
  state.applications.forEach((application) => {
    application.status ||= "pending";
    application.created ||= "Today";
    application.notes ||= "";
    application.generatedPassword ||= "";
  });
  if ((state.launchChecklistVersion || 0) < 2) {
    state.launchChecklist = defaultLaunchChecklist();
    state.launchChecklistVersion = 2;
  }
  state.launchChecklist ||= defaultLaunchChecklist();
  state.activeProjectId ||= state.projects[0]?.id || "";
  state.projects.forEach((project) => {
    if (project.image === "../assets/hub-mini-restoration.png") {
      project.image = "../assets/case-study-fixture-bracket.png";
    }
    if (project.image === "../assets/hub-key-locker.png") {
      project.image = "../assets/cad-machined-bracket.png";
    }
    project.updates ||= [
      { id: uid("update"), title: "Project opened", body: "Initial project record created for member feedback and support.", created: project.status || "Planning" }
    ];
    project.parts ||= [
      { id: uid("part"), name: "Main assembly", material: "TBC", status: "To review" }
    ];
    project.discussion ||= [
      { id: uid("comment"), author: "JP Innovation", body: "Add drawings, photos or key dimensions here so members can give better feedback.", helpful: false, created: "Today" }
    ];
    project.nextStep ||= project.status === "Completed" ? "Document final outcome" : "Add the next practical milestone";
  });
  state.quotes.forEach((quote) => {
    quote.status ||= quote.jpFirst ? "jp-review" : "open";
    quote.created ||= "Today";
    quote.files ||= "No files noted";
    quote.material ||= "";
    quote.quantity ||= "";
    quote.visibility ||= "Private";
    quote.responses ||= [];
    quote.responses.forEach((response) => {
      response.status ||= "submitted";
      response.created ||= "Today";
    });
  });
  state.resources.forEach((resource) => {
    resource.id ||= uid("resource");
    resource.example = resource.example === true;
  });
  state.events.forEach((event) => {
    event.id ||= uid("event");
    event.example = event.example === true;
  });
  state.messages.forEach((message) => {
    message.id ||= uid("msg");
    message.example = message.example === true;
  });
  state.posts.forEach((post) => {
    post.example = post.example === true;
    post.moderationStatus ||= post.authorEmail === adminEmail ? "approved" : "pending";
    post.postType ||= "information";
    post.responses ||= [
      {
        id: uid("reply"),
        author: post.category === "Automotive Projects" ? "Dean Walker" : "Sarah Collins",
        authorEmail: post.category === "Automotive Projects" ? "dean@local" : "sarah@local",
        body: post.category === "Automotive Projects"
          ? "Check the subframe pickup points first, then brace the shell before cutting out tired metal."
          : "Use the two bored holes as primary datums and leave one slotted location feature for tolerance stack-up.",
        helpful: false
      }
    ];
    post.responses.forEach((reply) => {
      reply.moderationStatus ||= "approved";
      reply.createdAt ||= reply.created === "Just now" ? new Date().toISOString() : "";
    });
  });
  state.projects.forEach((project) => {
    project.example = project.example === true;
    project.moderationStatus ||= project.authorEmail === adminEmail ? "approved" : "pending";
  });
  state.members.forEach((member) => {
    member.example = member.example === true;
    member.helpfulPoints ||= Math.max(0, Math.round((member.points || 0) / 12));
    member.directoryVisible = member.directoryVisible !== false;
    member.preferredWork ||= "";
    member.capacity ||= "";
    member.profilePhotoUrl ||= "";
    member.profilePhotoPendingUrl ||= "";
    member.profilePhotoStatus ||= member.profilePhotoUrl ? "approved" : "none";
  });
  state.users.forEach((user) => {
    user.role ||= "member";
    user.helpfulPoints ||= Math.max(0, Math.round((user.points || 0) / 12));
    user.approved = user.approved !== false;
    user.onboardingComplete = ["admin", "client"].includes(user.role) ? true : user.onboardingComplete === true;
    user.directoryVisible = user.directoryVisible === true;
    user.quoteAlerts = user.quoteAlerts !== false;
    user.messageAlerts = user.messageAlerts !== false;
    user.eventAlerts = user.eventAlerts !== false;
    user.profileGoals ||= "";
    user.preferredWork ||= "";
    user.capacity ||= "";
    user.profilePhotoUrl ||= "";
    user.profilePhotoPendingUrl ||= "";
    user.profilePhotoStatus ||= user.profilePhotoUrl ? "approved" : "none";
    user.profilePhotoSubmittedAt ||= "";
    user.profilePhotoReviewedAt ||= "";
  });
  saveState();
}

function purgePretendContent() {
  if (state.realContentCleanupVersion >= 4) return;
  const isPretend = (item = {}) => item.example === true
    || item.created === "Example"
    || /@local$|@example$|\.example@/i.test(String(item.email || item.authorEmail || item.providerEmail || ""))
    || ["Demo Member", "MK Restorations", "Secure Workshop Systems", "Example Applicant"].includes(item.author || item.name || item.fullName)
    || knownPretendBoardTitles.includes(item.title)
    || knownPretendProjectTitles.includes(item.title)
    || knownPretendQuoteTitles.includes(item.service);
  state.posts = (state.posts || []).filter((item) => !isPretend(item));
  state.projects = (state.projects || []).filter((item) => !isPretend(item));
  state.quotes = (state.quotes || []).filter((item) => !isPretend(item));
  state.members = (state.members || []).filter((item) => !isPretend(item));
  state.messages = (state.messages || []).filter((item) => !isPretend(item));
  state.events = (state.events || []).filter((item) => !isPretend(item));
  state.applications = (state.applications || []).filter((item) => !isPretend(item));
  state.resources = (state.resources || []).filter((item) => !isPretend(item));
  state.flagged = [];
  state.helpfulAwards = [];
  state.examplePackVersion = 999;
  state.realContentCleanupVersion = 4;
}

function ensureStarterExamples() {
  if (state.examplePackVersion >= 2) return;
  state.posts ||= [];
  state.projects ||= [];
  state.quotes ||= [];
  state.resources ||= defaultResources();
  state.events ||= [];
  state.messages ||= [];
  state.applications ||= [];
  const hasQuote = (service) => state.quotes.some((quote) => quote.service === service);
  if (!hasQuote("Sheet metal enclosure prototype")) {
    state.quotes.push({
      id: uid("quote"),
      service: "Sheet metal enclosure prototype",
      location: "Bedford",
      budget: "GBP 500-GBP 900",
      deadline: "3-4 weeks",
      description: "Prototype folded enclosure for an electronics controller, including hinge, vent and fixing details.",
      jpFirst: false,
      status: "open",
      created: "Example",
      material: "Powder coated mild steel",
      quantity: "3 prototypes",
      outcome: "Prototype for testing",
      tolerance: "Standard fabrication tolerance",
      files: "DXF outline and photo reference placeholder",
      visibility: "Private",
      author: "Example Customer",
      authorEmail: "customer@example",
      responses: [
        {
          provider: "Walker Fabrication",
          providerEmail: "dean@local",
          price: "GBP 760",
          leadTime: "15 working days",
          assumptions: "Customer supplies final hole schedule before manufacture.",
          availability: "Can start next week",
          notes: "Includes cutting, folding, basic weld clean-up and powder coat allowance.",
          status: "submitted",
          created: "Example"
        }
      ],
      example: true
    });
  }
  if (!state.applications.some((application) => application.email === "founder.example@email.com")) {
    state.applications.push({
      id: uid("app"),
      fullName: "Founder Example",
      business: "MK Prototype Design",
      email: "founder.example@email.com",
      phone: "07700 900111",
      location: "Milton Keynes",
      skill: "Product design, 3D printing and supplier sourcing",
      experience: "8",
      equipment: "Fusion 360, FDM printer, inspection tools",
      membershipType: "Professional member",
      availability: "Evenings/weekends",
      portfolio: "",
      social: "",
      wantsCommunity: true,
      wantsQuotes: true,
      wantsDirectory: false,
      events: true,
      partner: false,
      offer: "Can help with design reviews, 3D print advice and early supplier checks.",
      support: "Looking for fabrication contacts and occasional machining quotes.",
      message: "Example access request for admin review testing.",
      status: "pending",
      created: "Example",
      notes: "",
      generatedPassword: "",
      example: true
    });
  }
  if (!state.applications.some((application) => application.email === "supplier.example@email.com")) {
    state.applications.push({
      id: uid("app"),
      fullName: "Supplier Example",
      business: "Precision Parts MK",
      email: "supplier.example@email.com",
      phone: "07700 900222",
      location: "Northampton",
      skill: "CNC machining and small batch components",
      experience: "12",
      equipment: "3-axis CNC mill, manual lathe, inspection equipment",
      membershipType: "Verified supplier",
      availability: "Project dependent",
      portfolio: "",
      social: "",
      wantsCommunity: true,
      wantsQuotes: true,
      wantsDirectory: true,
      events: false,
      partner: true,
      offer: "Small batch machining, prototype plates and design-for-manufacture feedback.",
      support: "Looking for well-scoped local engineering quote opportunities.",
      message: "Second example application for testing the admin review queue.",
      status: "pending",
      created: "Example",
      notes: "",
      generatedPassword: "",
      example: true
    });
  }
  state.examplePackVersion = 2;
}

function ensureAdminAccount() {
  state.users ||= [];
  state.members ||= [];
  let admin = state.users.find((user) => user.email === adminEmail || user.email === previousAdminEmail);
  if (!admin) {
    admin = {
      id: uid("user"),
      name: "Jon Hotard",
      business: "JP Innovation Ltd",
      email: adminEmail,
      skill: "Engineering design, CAD and product development",
      location: "Milton Keynes",
      equipment: "JP Innovation network",
      portfolio: "https://www.jpinnovation.co.uk",
      bio: "JP Innovation admin account.",
      verified: true,
      approved: true,
      level: "JP Trusted Partner",
      role: "admin",
      points: 250,
      helpfulPoints: 12,
      warning: false,
      suspended: false,
      created: new Date().toISOString()
    };
    state.users.unshift(admin);
  } else {
    const oldEmail = admin.email;
    admin.email = adminEmail;
    admin.name = "Jon Hotard";
    admin.business = admin.business || "JP Innovation Ltd";
    admin.role = "admin";
    admin.level = "JP Trusted Partner";
    admin.verified = true;
    admin.approved = true;
    admin.suspended = false;
    delete admin.password;
    admin.points ||= 250;
    admin.helpfulPoints ||= 12;
    if (state.sessionEmail === oldEmail) state.sessionEmail = adminEmail;
    state.members.forEach((member) => {
      if (member.email === oldEmail) member.email = adminEmail;
    });
  }
  syncMember(admin);
}

function seedState() {
  return {
    sessionEmail: "",
    users: [],
    posts: [
      {
        id: uid("post"),
        title: "Best way to jig a small aluminium bracket",
        category: "CAD & Design",
        description: "Looking for feedback on datum points before sending this for machining.",
        author: "Demo Member",
        authorEmail: "demo@local",
        created: "Today",
        reports: 0,
        flagged: false
      },
      {
        id: uid("post"),
        title: "Classic Mini rear subframe repair approach",
        category: "Automotive Projects",
        description: "Member project discussion around panel repair, alignment and sensible fabrication sequence.",
        author: "MK Restorations",
        authorEmail: "restoration@local",
        created: "Yesterday",
        reports: 0,
        flagged: false
      }
    ],
    projects: [
      {
        id: uid("project"),
        title: "Classic Mini restoration build",
        category: "Automotive Projects",
        description: "Workshop restoration example with brackets, trim pieces and local fabrication support.",
        location: "Milton Keynes",
        status: "In Progress",
        author: "MK Restorations",
        authorEmail: "restoration@local",
        image: "../assets/case-study-fixture-bracket.png",
        likes: 18,
        comments: 6,
        points: 42,
        nextStep: "Confirm rear subframe alignment before fabrication",
        parts: [
          { id: uid("part"), name: "Rear subframe mount repair", material: "Mild steel", status: "Needs fabrication" },
          { id: uid("part"), name: "Trim bracket set", material: "Aluminium", status: "CAD review" },
          { id: uid("part"), name: "Panel repair jig", material: "Steel box section", status: "Planning" }
        ],
        updates: [
          { id: uid("update"), title: "Shell stripped", body: "Initial inspection complete. Rear subframe pickup points need a controlled repair sequence.", created: "Today" },
          { id: uid("update"), title: "Jig idea", body: "Looking at a bolt-in brace to hold the shell position before removing tired metal.", created: "Yesterday" }
        ],
        discussion: [
          { id: uid("comment"), author: "Dean Walker", body: "Brace the shell first, then use the existing pickup points as your reference before cutting.", helpful: true, created: "Today" }
        ]
      },
      {
        id: uid("project"),
        title: "Smart key locker wall unit",
        category: "Product Development",
        description: "Wall-mounted concept with glass front, 50 tagged hangers, access control and enclosure design.",
        location: "Buckinghamshire",
        status: "Planning",
        author: "Secure Workshop Systems",
        authorEmail: "secure@local",
        image: "../assets/cad-machined-bracket.png",
        likes: 11,
        comments: 4,
        points: 31,
        nextStep: "Confirm hinge, wiring and tag spacing before prototype",
        parts: [
          { id: uid("part"), name: "Glass front enclosure", material: "Powder coated steel", status: "Concept" },
          { id: uid("part"), name: "Tagged hanger rail", material: "Stainless steel", status: "Prototype required" },
          { id: uid("part"), name: "Access control panel", material: "Electronics", status: "Supplier review" }
        ],
        updates: [
          { id: uid("update"), title: "Concept scoped", body: "Wall mounted unit planned with glass front, 50 tagged hangers and access control.", created: "Today" },
          { id: uid("update"), title: "Manufacturing questions", body: "Need input on hinge choice, panel thickness and wiring access.", created: "This week" }
        ],
        discussion: [
          { id: uid("comment"), author: "Aisha Patel", body: "Plan removable rear access for wiring and leave space for a fused low-voltage supply.", helpful: false, created: "Today" }
        ]
      }
    ],
    quotes: [
      {
        id: uid("quote"),
        service: "CNC machined prototype plate",
        location: "Milton Keynes",
        budget: "GBP 250-GBP 500",
        deadline: "Next 2 weeks",
        description: "Need two prototype plates made from aluminium with countersunk holes.",
        jpFirst: true,
        status: "jp-review",
        created: "Today",
        material: "Aluminium",
        quantity: "2",
        files: "Drawing and STEP placeholder",
        visibility: "Private",
        author: "Demo Member",
        authorEmail: "demo@local",
        responses: [
          { provider: "Collins CAD Services", providerEmail: "sarah@local", price: "GBP 320", leadTime: "7 working days", notes: "Can review drawing first and confirm tolerance-critical features.", status: "submitted", created: "Today" }
        ]
      }
    ],
    members: [
      {
        name: "Sarah Collins",
        business: "Collins CAD Services",
        email: "sarah@local",
        location: "Milton Keynes",
        skill: "CAD & Design",
        equipment: "SolidWorks, Fusion, 3D scanner",
        verified: true,
        level: "Verified Professional",
        points: 186,
        bio: "Mechanical design support for fixtures, brackets and early-stage product ideas."
      },
      {
        name: "Dean Walker",
        business: "Walker Fabrication",
        email: "dean@local",
        location: "Northampton",
        skill: "Welding & Fabrication",
        equipment: "MIG, TIG, press brake, bandsaw",
        verified: true,
        level: "Verified Business",
        points: 244,
        bio: "Small fabrication jobs, repair work and prototype frames."
      },
      {
        name: "Aisha Patel",
        business: "AP Automation",
        email: "aisha@local",
        location: "Bedford",
        skill: "Electronics & Automation",
        equipment: "PLC test bench, soldering, sensors",
        verified: false,
        level: "Member",
        points: 72,
        bio: "Controls, wiring, sensor selection and workshop automation."
      }
    ],
    messages: [
      { id: uid("msg"), from: "Sarah Collins", subject: "Fixture model review", body: "Happy to review the bracket model before it goes out for quote.", unread: true },
      { id: uid("msg"), from: "JP Innovation", subject: "Profile approval next step", body: "Complete your profile and equipment list to be considered for verified status.", unread: false }
    ],
    events: [
      { id: uid("event"), title: "Milton Keynes maker evening", date: "18 July", location: "Milton Keynes", type: "Meetup" },
      { id: uid("event"), title: "CAD to prototype workshop", date: "31 July", location: "Online", type: "Workshop" },
      { id: uid("event"), title: "Supplier visit and demo", date: "August", location: "TBC", type: "Site visit" }
    ],
    applications: [
      {
        id: uid("app"),
        fullName: "Example Applicant",
        business: "Prototype Workshop",
        email: "example.applicant@email.com",
        phone: "07700 900000",
        location: "Milton Keynes",
        skill: "CAD, 3D printing and small batch assembly",
        experience: "5",
        equipment: "FDM printer, hand tools, inspection equipment",
        membershipType: "Professional member",
        availability: "Project dependent",
        portfolio: "",
        social: "",
        wantsCommunity: true,
        wantsQuotes: true,
        wantsDirectory: true,
        events: false,
        partner: false,
        offer: "Prototype advice, design reviews and assembly feedback.",
        support: "Local supplier contacts and CAD review from other members.",
        message: "Interested in joining when the Hub opens.",
        status: "pending",
        created: "Example",
        notes: "",
        generatedPassword: ""
      }
    ],
    resources: defaultResources(),
    flagged: [],
    helpfulAwards: [],
    rewardMonth: "July 2026",
    rewardPrize: "GBP 50 workshop voucher"
  };
}

function defaultResources() {
  return [
    { type: "Checklist", title: "Quote request checklist", detail: "Drawing, quantity, material, finish, tolerance, delivery date and photos." },
    { type: "Template", title: "Project brief structure", detail: "Problem, constraints, target cost, known risks, deadline and success criteria." },
    { type: "Guide", title: "3D print design checks", detail: "Wall thickness, supports, inserts, orientation, heat, thread strategy and finish." },
    { type: "Guide", title: "Reverse engineering notes", detail: "Datums, critical dimensions, wear points, tolerances and scan limitations." }
  ];
}

function builtInResources() {
  return [
    {
      key: "project-brief", type: "Template", title: "Engineering project brief",
      detail: "A structured brief covering the problem, constraints, deliverables, timing and success criteria.",
      sections: ["Project and contact details", "Problem to solve", "Required outcome", "Known constraints", "Dimensions, materials and environment", "Files supplied", "Budget and timing", "Acceptance criteria", "Open questions"]
    },
    {
      key: "design-review", type: "Checklist", title: "Design review checklist",
      detail: "A practical review for function, fit, material, manufacture, assembly, safety and documentation.",
      sections: ["Function and load cases", "Interfaces and clearances", "Materials and finishes", "Tolerances and datums", "Manufacturing method", "Assembly and tool access", "Safety and compliance", "Drawings and revision control"]
    },
    {
      key: "supplier-quote", type: "Checklist", title: "Supplier quote checklist",
      detail: "The information a supplier needs to return a useful and comparable quotation.",
      sections: ["Part and revision", "Quantity and repeat quantity", "Material specification", "Drawing and 3D files", "Critical tolerances", "Finish and inspection", "Delivery location and date", "Packaging", "Assumptions and exclusions"]
    }
  ];
}

function defaultLaunchChecklist() {
  return [
    {
      id: "front-end",
      area: "Portal front-end",
      title: "Member navigation and responsive pages",
      detail: "Dashboard, Engineering Boards, projects, quotes, directory, tools, events, messages, rewards and admin are available on desktop and mobile.",
      status: "ready"
    },
    {
      id: "auth",
      area: "Secure access",
      title: "Real login and member database",
      detail: "Supabase authentication, persistent sessions, protected profiles and password recovery are connected.",
      status: "ready"
    },
    {
      id: "payments",
      area: "Membership payments",
      title: "Payment and subscription checks",
      detail: "Connect Stripe, PayPal or another provider before paid access is opened to customers.",
      status: "needs-backend"
    },
    {
      id: "moderation",
      area: "Moderation",
      title: "Admin approval and reporting workflow",
      detail: "New board posts, member projects and quote requests enter an admin-controlled review workflow.",
      status: "ready"
    },
    {
      id: "email",
      area: "Email alerts",
      title: "Application, quote and message notifications",
      detail: "Connect email notifications so JP Innovation and members receive confirmations and important updates.",
      status: "needs-backend"
    }
  ];
}

function currentUser() {
  return state.users.find((user) => user.email === state.sessionEmail) || null;
}

const goldPointsTarget = 100;
const goldPositiveReviewsTarget = 3;

function approvedReviewsFor(member) {
  if (!member) return [];
  return (state.memberReviews || []).filter((review) =>
    review.reviewedUserId === member.id && review.moderationStatus === "approved"
  );
}

function memberReputationTier(member) {
  if (!member || member.role === "client") return "none";
  if (member.role === "admin") return "admin";
  if (["blue", "gold"].includes(member.badgeTier)) return member.badgeTier;
  const active = member.membershipStatus === "active";
  const vetted = member.role === "admin" || member.vetted === true || member.verified === true;
  if (!active || !vetted) return "none";
  const positiveReviews = Number(member.approvedPositiveReviews || approvedReviewsFor(member).filter((review) => review.rating >= 4).length);
  const points = Number(member.reputationPoints ?? member.points ?? 0);
  return points >= goldPointsTarget || positiveReviews >= goldPositiveReviewsTarget ? "gold" : "blue";
}

function reputationBadge(member, options = {}) {
  const tier = memberReputationTier(member);
  if (tier === "none") return "";
  const compact = options.compact === true;
  const label = tier === "admin" ? "JP Admin" : (tier === "gold" ? "Gold Trusted" : "Blue Verified");
  const title = tier === "admin" ? "JP Innovation admin account" : `${label}: paid Hub member vetted by JP Innovation`;
  return `<span class="reputation-badge ${tier}" title="${title}" aria-label="${label}"><span aria-hidden="true">&#9733;</span>${compact ? "" : `<b>${label}</b>`}</span>`;
}

function approvedProfilePhoto(user) {
  return user?.profilePhotoStatus === "approved" && user.profilePhotoUrl ? user.profilePhotoUrl : "";
}

function profileAvatarMarkup(user, className = "profile-avatar") {
  const src = approvedProfilePhoto(user);
  return src
    ? `<span class="${escapeHtml(className)} has-photo"><img src="${escapeHtml(src)}" alt="${escapeHtml(user?.name || "Member")} profile photo"></span>`
    : `<span class="${escapeHtml(className)}">${escapeHtml(userInitials(user))}</span>`;
}

function pendingProfilePhotos() {
  return (state.users || []).filter((user) => user.profilePhotoStatus === "pending" && user.profilePhotoPendingUrl);
}

function memberForIdentity({ id = "", email = "", name = "" } = {}) {
  const cleanEmail = cleanEmailValue(email || "");
  return state.members.find((member) => member.id === id || (cleanEmail && member.email === cleanEmail))
    || state.users.find((member) => member.id === id || (cleanEmail && member.email === cleanEmail))
    || state.members.find((member) => member.name === name)
    || state.users.find((member) => member.name === name)
    || null;
}

function reputationStatusCopy(member) {
  const tier = memberReputationTier(member);
  const points = Number(member?.reputationPoints ?? member?.points ?? 0);
  const positive = Number(member?.approvedPositiveReviews || approvedReviewsFor(member).filter((review) => review.rating >= 4).length);
  if (tier === "admin") return { tier, title: "JP Admin", detail: "Admin account with full Hub moderation and access controls.", points, positive };
  if (tier === "gold") return { tier, title: "Gold Trusted member", detail: "Gold status is active through approved community reputation.", points, positive };
  if (tier === "blue") return { tier, title: "Blue Verified member", detail: `Reach Gold with ${goldPointsTarget} points or ${goldPositiveReviewsTarget} approved positive reviews.`, points, positive };
  return { tier, title: "Member verification in progress", detail: "Blue Verified appears after paid membership is active and JP Innovation has completed vetting.", points, positive };
}

function decodeBoardBody(value = "") {
  const body = String(value || "");
  const match = body.match(/^\[\[jp-post-type:([a-z-]+)\]\]\s*/i);
  return {
    postType: match ? match[1].toLowerCase() : "information",
    description: match ? body.slice(match[0].length) : body
  };
}

function encodeBoardBody(description, postType = "information") {
  const validType = boardPostTypes.some((item) => item.value === postType) ? postType : "information";
  return `[[jp-post-type:${validType}]]\n${String(description || "").trim()}`;
}

function boardPostTypeLabel(value = "information") {
  return boardPostTypes.find((item) => item.value === value)?.label || "Information";
}

function boardPostTypeOptions(selected = "information") {
  return boardPostTypes.map((item) => `<option value="${escapeHtml(item.value)}" ${item.value === selected ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("");
}

function mapBoardPost(row) {
  const decodedBody = decodeBoardBody(row.body);
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: decodedBody.description,
    postType: decodedBody.postType,
    author: row.author_name || "Hub member",
    authorId: row.author_id,
    created: formatBoardDate(row.created_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reports: row.reports || 0,
    flagged: row.flagged === true,
    isPinned: row.is_pinned === true || row.isPinned === true,
    moderationStatus: row.moderation_status || "pending",
    approvedAt: row.approved_at || "",
    approvedBy: row.approved_by_name || "",
    responses: (row.board_replies || []).map((reply) => ({
      id: reply.id,
      author: reply.author_name || "Hub member",
      authorId: reply.author_id,
      body: reply.body,
      helpful: reply.helpful === true,
      moderationStatus: reply.moderation_status || "approved",
      created: formatBoardDate(reply.created_at),
      createdAt: reply.created_at
    })).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  };
}

function formatBoardDate(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

async function clearKnownPretendSecureContent() {
  const user = currentUser();
  if (!portalBackend || user?.role !== "admin") return;
  await Promise.allSettled([
    portalBackend.from("board_posts").delete().in("title", knownPretendBoardTitles),
    portalBackend.from("hub_projects").delete().in("title", knownPretendProjectTitles),
    portalBackend.from("quote_requests").delete().in("service", knownPretendQuoteTitles)
  ]);
}

async function loadSecureBoards() {
  const user = currentUser();
  if (!portalBackend || !user || isClientPortalContext(user)) return false;
  const baseBoardSelect = "id,title,category,body,author_id,author_name,created_at,updated_at,flagged,reports,moderation_status,approved_at,approved_by_name,board_replies(id,body,author_id,author_name,created_at,updated_at,helpful,moderation_status)";
  const pinnedBoardSelect = "id,title,category,body,author_id,author_name,created_at,updated_at,flagged,reports,is_pinned,moderation_status,approved_at,approved_by_name,board_replies(id,body,author_id,author_name,created_at,updated_at,helpful,moderation_status)";
  let { data, error } = await portalBackend
    .from("board_posts")
    .select(pinnedBoardSelect)
    .order("created_at", { ascending: false });
  if (error && /is_pinned|column/i.test(String(error.message || ""))) {
    ({ data, error } = await portalBackend
      .from("board_posts")
      .select(baseBoardSelect)
      .order("created_at", { ascending: false }));
  }
  if (error) {
    boardBackendAvailable = false;
    return false;
  }
  boardBackendAvailable = true;
  state.posts = (data || []).filter((row) => !knownPretendBoardTitles.includes(row.title)).map(mapBoardPost);
  saveState();
  return true;
}

function mapSecureProject(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    location: row.location || "",
    status: row.progress_status || "Planning",
    moderationStatus: row.moderation_status || "pending",
    author: row.author_name || "Hub member",
    authorEmail: row.author_email || "",
    authorId: row.author_id,
    created: formatBoardDate(row.created_at),
    image: "", likes: 0, comments: 0, points: 0,
    nextStep: "Add the first project milestone", parts: [], updates: [], discussion: [], example: false
  };
}

function mapSecureQuote(row) {
  const secureResponses = row.quote_responses || row.responses || [];
  return {
    id: row.id,
    service: row.service,
    location: row.location || "",
    material: row.material || "",
    quantity: row.quantity || "",
    budget: row.budget || "",
    deadline: row.deadline || "",
    outcome: row.outcome || "",
    tolerance: row.tolerance || "",
    description: row.description,
    files: row.files_note || "",
    jpFirst: true,
    status: row.status || "jp-review",
    created: formatBoardDate(row.created_at),
    visibility: "Private",
    author: row.author_name || "Customer",
    authorEmail: row.author_email || "",
    authorId: row.author_id,
    responses: secureResponses.map((response) => ({
      id: response.id,
      provider: response.provider_name || response.provider || "Hub member",
      providerEmail: response.provider_email || "",
      providerId: response.provider_id,
      price: response.price || "",
      leadTime: response.lead_time || response.leadTime || "",
      assumptions: response.assumptions || "",
      availability: response.availability || "",
      notes: response.notes || "",
      status: response.status || "submitted",
      created: formatBoardDate(response.created_at)
    })),
    example: false
  };
}

async function loadSecureSubmissions() {
  const user = currentUser();
  if (!portalBackend || !user) return false;
  const [projectsResult, quotesResult] = await Promise.all([
    portalBackend.from("hub_projects").select("*").order("created_at", { ascending: false }),
    portalBackend.from("quote_requests").select("*,quote_responses(*)").order("created_at", { ascending: false })
  ]);
  if (projectsResult.error || quotesResult.error) {
    contentBackendAvailable = false;
    return false;
  }
  contentBackendAvailable = true;
  state.projects = (projectsResult.data || []).filter((row) => !knownPretendProjectTitles.includes(row.title)).map(mapSecureProject);
  state.quotes = (quotesResult.data || []).filter((row) => !knownPretendQuoteTitles.includes(row.service)).map(mapSecureQuote);
  state.activeProjectId = state.projects[0]?.id || "";
  saveState();
  return true;
}

function secureDirectoryMember(row) {
  const role = row.account_type || "member";
  return {
    id: row.user_id,
    email: cleanEmailValue(row.email || ""),
    name: row.full_name || row.email || "Hub member",
    business: row.business || "",
    role,
    membershipStatus: "active",
    level: role === "admin" ? "JP Admin" : (role === "member" ? "Innovation Hub member" : "Client Portal"),
    approved: true,
    verified: role === "admin",
    directoryVisible: true,
    example: false
  };
}

function mapMemberReview(row) {
  return {
    id: row.id,
    reviewerId: row.reviewer_id,
    reviewedUserId: row.reviewed_user_id,
    reviewerName: row.reviewer_name || "Hub member",
    reviewedName: row.reviewed_name || "Hub member",
    rating: Number(row.rating || 0),
    comment: row.comment || "",
    moderationStatus: row.moderation_status || "pending",
    approvedAt: row.approved_at || "",
    approvedBy: row.approved_by_name || "",
    created: formatBoardDate(row.created_at),
    createdAt: row.created_at
  };
}

function mapSecureMessage(row, user = currentUser()) {
  return {
    id: row.id,
    from: row.sender_name || row.sender_email || "Member",
    subject: row.subject,
    body: row.body,
    unread: !row.read_at && row.recipient_id === user?.id,
    ownerEmail: user?.role === "client" ? user.email : "",
    senderId: row.sender_id,
    senderEmail: cleanEmailValue(row.sender_email || ""),
    recipientId: row.recipient_id,
    recipientEmail: cleanEmailValue(row.recipient_email || ""),
    recipientName: row.recipient_name || row.recipient_email || "Member",
    created: formatBoardDate(row.created_at),
    createdAt: row.created_at,
    example: false
  };
}

async function loadSecureWorkspace() {
  const user = currentUser();
  if (!portalBackend || !user) return false;
  const [messagesResult, directoryResult, resourcesResult, eventsResult, interestsResult, updatesResult, partsResult, commentsResult, reputationResult, reviewsResult] = await Promise.all([
    portalBackend.from("hub_messages").select("*").order("created_at", { ascending: false }),
    portalBackend.rpc("hub_message_directory"),
    portalBackend.from("hub_resources").select("*").order("created_at", { ascending: false }),
    portalBackend.from("hub_events").select("*").order("event_date", { ascending: true }),
    portalBackend.from("hub_event_interests").select("event_id,user_id,created_at"),
    portalBackend.from("hub_project_updates").select("*").order("created_at", { ascending: false }),
    portalBackend.from("hub_project_parts").select("*").order("created_at", { ascending: true }),
    portalBackend.from("hub_project_comments").select("*").order("created_at", { ascending: false }),
    portalBackend.rpc("hub_member_reputation"),
    portalBackend.from("member_reviews").select("*").order("created_at", { ascending: false })
  ]);
  const results = [messagesResult, directoryResult, resourcesResult, eventsResult, interestsResult, updatesResult, partsResult, commentsResult];
  if (results.some((result) => result.error)) {
    sharedWorkspaceBackendAvailable = false;
    return false;
  }

  sharedWorkspaceBackendAvailable = true;
  reputationBackendAvailable = !reputationResult.error && !reviewsResult.error;
  if (!reviewsResult.error) state.memberReviews = (reviewsResult.data || []).map(mapMemberReview);
  const reputationByUser = new Map((reputationResult.data || []).map((item) => [item.user_id, item]));
  (reputationResult.data || []).forEach((reputation) => {
    const reputationData = {
      reputationPoints: Number(reputation.reputation_points || 0),
      approvedPositiveReviews: Number(reputation.approved_positive_reviews || 0),
      approvedReviewCount: Number(reputation.approved_review_count || 0),
      averageRating: Number(reputation.average_rating || 0),
      badgeTier: reputation.badge_tier || "none",
      vetted: reputation.badge_tier === "blue" || reputation.badge_tier === "gold",
      verified: reputation.badge_tier === "blue" || reputation.badge_tier === "gold"
    };
    const userRecord = state.users.find((item) => item.id === reputation.user_id);
    const memberRecord = state.members.find((item) => item.id === reputation.user_id);
    if (userRecord) Object.assign(userRecord, reputationData);
    if (memberRecord) Object.assign(memberRecord, reputationData);
  });
  const directory = (directoryResult.data || []).map(secureDirectoryMember).filter((member) => member.email);
  directory.forEach((member) => {
    const reputation = reputationByUser.get(member.id);
    if (reputation) Object.assign(member, {
      reputationPoints: Number(reputation.reputation_points || 0),
      approvedPositiveReviews: Number(reputation.approved_positive_reviews || 0),
      approvedReviewCount: Number(reputation.approved_review_count || 0),
      averageRating: Number(reputation.average_rating || 0),
      badgeTier: reputation.badge_tier || "none",
      vetted: reputation.badge_tier === "blue" || reputation.badge_tier === "gold",
      verified: reputation.badge_tier === "blue" || reputation.badge_tier === "gold"
    });
    const existing = state.members.find((item) => item.email === member.email);
    if (existing) Object.assign(existing, member);
    else state.members.push(member);
    const userRecord = state.users.find((item) => item.id === member.id || item.email === member.email);
    if (userRecord) Object.assign(userRecord, member);
  });
  state.messages = (messagesResult.data || []).map((row) => mapSecureMessage(row, user));
  state.resources = (resourcesResult.data || []).map((row) => ({
    id: row.id, type: row.resource_type, title: row.title, detail: row.detail,
    created: formatBoardDate(row.created_at), example: false
  }));
  const interestsByEvent = new Map();
  (interestsResult.data || []).forEach((interest) => {
    const entries = interestsByEvent.get(interest.event_id) || [];
    entries.push(interest.user_id);
    interestsByEvent.set(interest.event_id, entries);
  });
  state.events = (eventsResult.data || []).map((row) => ({
    id: row.id, title: row.title, date: row.event_date, location: row.location,
    type: row.event_type, interested: interestsByEvent.get(row.id) || [], example: false
  }));
  state.projects.forEach((project) => {
    project.updates = (updatesResult.data || []).filter((item) => item.project_id === project.id).map((item) => ({
      id: item.id, title: item.title, body: item.body, created: formatBoardDate(item.created_at)
    }));
    project.parts = (partsResult.data || []).filter((item) => item.project_id === project.id).map((item) => ({
      id: item.id, name: item.name, material: item.material || "TBC", status: item.part_status || "Open"
    }));
    project.discussion = (commentsResult.data || []).filter((item) => item.project_id === project.id).map((item) => ({
      id: item.id, author: item.author_name || "Hub member", authorId: item.author_id,
      body: item.body, helpful: false, created: formatBoardDate(item.created_at)
    }));
    project.comments = project.discussion.length;
    project.nextStep = project.updates[0]?.title || "Add the first project milestone";
  });
  saveState();
  return true;
}

async function loadSecureUserData() {
  await clearKnownPretendSecureContent();
  await loadSecureBoards();
  await loadSecureSubmissions();
  await loadSecureWorkspace();
}

async function createSecureResource(data, user) {
  if (!sharedWorkspaceBackendAvailable) return null;
  const { data: row, error } = await portalBackend.from("hub_resources").insert({
    resource_type: data.type, title: data.title.trim(), detail: data.detail.trim(), created_by: user.id
  }).select("*").single();
  if (error) throw error;
  return { id: row.id, type: row.resource_type, title: row.title, detail: row.detail, created: formatBoardDate(row.created_at), example: false };
}

async function createSecureEvent(data, user) {
  if (!sharedWorkspaceBackendAvailable) return null;
  const { data: row, error } = await portalBackend.from("hub_events").insert({
    title: data.title.trim(), event_type: data.type, event_date: data.date,
    location: data.location.trim(), created_by: user.id
  }).select("*").single();
  if (error) throw error;
  return { id: row.id, title: row.title, type: row.event_type, date: row.event_date, location: row.location, interested: [], example: false };
}

async function toggleSecureEventInterest(event, user) {
  if (!sharedWorkspaceBackendAvailable) return false;
  const joined = (event.interested || []).includes(user.id);
  const query = joined
    ? portalBackend.from("hub_event_interests").delete().eq("event_id", event.id).eq("user_id", user.id)
    : portalBackend.from("hub_event_interests").insert({ event_id: event.id, user_id: user.id });
  const { error } = await query;
  if (error) throw error;
  event.interested = joined ? event.interested.filter((id) => id !== user.id) : [...(event.interested || []), user.id];
  return true;
}

async function createSecureMessage(data, user, recipientEmail) {
  if (!sharedWorkspaceBackendAvailable) return null;
  const { data: row, error } = await portalBackend.rpc("send_hub_message", {
    recipient_email: recipientEmail,
    message_subject: data.subject.trim(),
    message_body: data.body.trim()
  });
  if (error) throw error;
  return mapSecureMessage(Array.isArray(row) ? row[0] : row, user);
}

async function markSecureMessagesRead() {
  if (!sharedWorkspaceBackendAvailable) return false;
  const { error } = await portalBackend.rpc("mark_hub_messages_read");
  if (error) throw error;
  return true;
}

async function submitMemberReview(reviewedUserId, rating, comment) {
  if (!reputationBackendAvailable) throw new Error("Member reviews are temporarily unavailable. Please try again shortly.");
  const { data, error } = await portalBackend.rpc("submit_member_review", {
    reviewed_user: reviewedUserId,
    review_rating: Number(rating),
    review_comment: comment.trim()
  });
  if (error) throw error;
  const review = mapMemberReview(Array.isArray(data) ? data[0] : data);
  state.memberReviews = (state.memberReviews || []).filter((item) => !(item.reviewerId === review.reviewerId && item.reviewedUserId === review.reviewedUserId));
  state.memberReviews.unshift(review);
  return review;
}

async function moderateMemberReview(reviewId, nextStatus) {
  if (!reputationBackendAvailable) throw new Error("Member review moderation is temporarily unavailable.");
  const { data, error } = await portalBackend.rpc("moderate_member_review", {
    review_uuid: reviewId,
    next_status: nextStatus
  });
  if (error) throw error;
  const updated = mapMemberReview(Array.isArray(data) ? data[0] : data);
  const existing = state.memberReviews.find((review) => review.id === reviewId);
  if (existing) Object.assign(existing, updated);
  return updated;
}

async function createSecureProjectUpdate(project, data, user) {
  if (!sharedWorkspaceBackendAvailable) return null;
  const { data: row, error } = await portalBackend.from("hub_project_updates").insert({
    project_id: project.id, title: data.title.trim(), body: data.body.trim(), created_by: user.id
  }).select("*").single();
  if (error) throw error;
  return { id: row.id, title: row.title, body: row.body, created: formatBoardDate(row.created_at) };
}

async function createSecureProjectPart(project, data, user) {
  if (!sharedWorkspaceBackendAvailable) return null;
  const { data: row, error } = await portalBackend.from("hub_project_parts").insert({
    project_id: project.id, name: data.name.trim(), material: data.material || "TBC",
    part_status: data.status || "Open", created_by: user.id
  }).select("*").single();
  if (error) throw error;
  return { id: row.id, name: row.name, material: row.material || "TBC", status: row.part_status || "Open" };
}

async function createSecureProjectComment(project, data, user) {
  if (!sharedWorkspaceBackendAvailable) return null;
  const { data: row, error } = await portalBackend.from("hub_project_comments").insert({
    project_id: project.id, author_id: user.id, author_name: user.name, body: data.body.trim()
  }).select("*").single();
  if (error) throw error;
  return { id: row.id, author: row.author_name, authorId: row.author_id, body: row.body, helpful: false, created: formatBoardDate(row.created_at) };
}

async function createSecureProject(data, user) {
  if (!contentBackendAvailable) return null;
  const { data: row, error } = await portalBackend.from("hub_projects").insert({
    title: data.title.trim(), category: data.category.trim(), description: data.description.trim(),
    location: data.location || "", progress_status: data.status || "Planning",
    author_id: user.id, author_name: user.name, author_email: user.email,
    moderation_status: "pending"
  }).select("*").single();
  if (error) throw error;
  return mapSecureProject(row);
}

async function createSecureQuote(data, user) {
  if (!contentBackendAvailable) return null;
  const { data: row, error } = await portalBackend.from("quote_requests").insert({
    service: data.service.trim(), location: data.location || "", material: data.material || "",
    quantity: data.quantity || "", budget: data.budget || "", deadline: data.deadline || "",
    outcome: data.outcome || "", tolerance: data.tolerance || "", description: data.description.trim(),
    files_note: data.files || "", author_id: user.id, author_name: user.name,
    author_email: user.email, status: "jp-review"
  }).select("*").single();
  if (error) throw error;
  return mapSecureQuote(row);
}

async function createSecureQuoteResponse(quote, data, user) {
  if (!contentBackendAvailable) return null;
  const { data: row, error } = await portalBackend.from("quote_responses").insert({
    request_id: quote.id, provider_id: user.id, provider_name: user.name, provider_email: user.email,
    price: data.price || "", lead_time: data.leadTime || "", assumptions: data.assumptions || "",
    availability: data.availability || "", notes: data.notes || "", status: "submitted"
  }).select("*").single();
  if (error) throw error;
  return {
    id: row.id, provider: row.provider_name, providerEmail: row.provider_email, providerId: row.provider_id,
    price: row.price, leadTime: row.lead_time, assumptions: row.assumptions,
    availability: row.availability, notes: row.notes, status: row.status, created: formatBoardDate(row.created_at)
  };
}

async function createBoardPostRecord(data, user) {
  const flagged = moderationFlag(`${data.title} ${data.description}`);
  if (boardBackendAvailable) {
    const { data: row, error } = await portalBackend.from("board_posts").insert({
      title: data.title.trim(),
      category: data.category,
      body: encodeBoardBody(data.description, data.postType),
      author_id: user.id,
      author_name: user.name,
      flagged,
      moderation_status: "pending"
    }).select("id,title,category,body,author_id,author_name,created_at,updated_at,flagged,reports,moderation_status").single();
    if (error) throw error;
    return mapBoardPost({ ...row, board_replies: [] });
  }
  return {
    id: uid("post"), title: data.title, category: data.category, description: data.description, postType: data.postType || "information",
    author: user.name, authorEmail: user.email, authorId: user.id, created: "Just now",
    reports: 0, flagged, isPinned: false, moderationStatus: "pending", responses: []
  };
}

async function updateBoardPostRecord(post, data) {
  if (boardBackendAvailable) {
    const { error } = await portalBackend.from("board_posts").update({
      title: data.title.trim(), category: data.category, body: encodeBoardBody(data.description, data.postType)
    }).eq("id", post.id);
    if (error) throw error;
  }
  Object.assign(post, { title: data.title.trim(), category: data.category, description: data.description.trim(), postType: data.postType || "information" });
}

async function deleteBoardPostRecord(postId) {
  if (boardBackendAvailable) {
    const { error } = await portalBackend.from("board_posts").delete().eq("id", postId);
    if (error) throw error;
  }
  state.posts = state.posts.filter((post) => post.id !== postId);
  if (activeBoardPostId === postId) activeBoardPostId = "";
}

async function createBoardReplyRecord(post, body, user) {
  if (boardBackendAvailable) {
    const { data: row, error } = await portalBackend.from("board_replies").insert({
      post_id: post.id, body, author_id: user.id, author_name: user.name, moderation_status: "pending"
    }).select("id,body,author_id,author_name,created_at,updated_at,helpful,moderation_status").single();
    if (error) throw error;
    return {
      id: row.id, author: row.author_name, authorId: row.author_id, body: row.body,
      helpful: row.helpful === true, moderationStatus: row.moderation_status || "pending",
      created: formatBoardDate(row.created_at), createdAt: row.created_at
    };
  }
  return { id: uid("reply"), author: user.name, authorEmail: user.email, authorId: user.id, body, helpful: false, moderationStatus: "pending", created: "Just now", createdAt: new Date().toISOString() };
}

async function updateBoardReplyRecord(post, reply, body) {
  if (boardBackendAvailable) {
    const { error } = await portalBackend.from("board_replies").update({ body, moderation_status: "pending" }).eq("id", reply.id).eq("post_id", post.id);
    if (error) throw error;
  }
  reply.body = body;
  reply.moderationStatus = "pending";
}

async function moderateBoardPostRecord(post, moderationStatus, user = currentUser()) {
  if (boardBackendAvailable) {
    let rpcError = null;
    const { data, error } = await portalBackend.rpc("moderate_board_post", {
      p_post_id: post.id,
      p_status: moderationStatus
    });
    if (error) {
      rpcError = error;
      const { error: updateError } = await portalBackend.from("board_posts").update({
        moderation_status: moderationStatus,
        flagged: moderationStatus === "approved" ? false : post.flagged,
        approved_at: moderationStatus === "approved" ? new Date().toISOString() : null,
        approved_by_name: moderationStatus === "approved" ? (user?.name || "JP Innovation admin") : ""
      }).eq("id", post.id);
      if (updateError) {
        const { error: simpleUpdateError } = await portalBackend.from("board_posts").update({
          moderation_status: moderationStatus,
          flagged: moderationStatus === "approved" ? false : post.flagged
        }).eq("id", post.id);
        if (simpleUpdateError) throw rpcError;
      }
    } else {
      const updated = Array.isArray(data) ? data[0] : data;
      if (updated) {
        post.approvedAt = updated.approved_at || "";
        post.approvedBy = updated.approved_by_name || "";
      }
    }
  }
  post.moderationStatus = moderationStatus;
  if (moderationStatus === "approved") {
    post.flagged = false;
    post.approvedAt ||= new Date().toISOString();
    post.approvedBy ||= user?.name || "JP Innovation admin";
  } else {
    post.approvedAt = "";
    post.approvedBy = "";
  }
}

async function toggleBoardPostPinRecord(post, isPinned) {
  if (boardBackendAvailable) {
    const { error } = await portalBackend.from("board_posts").update({ is_pinned: isPinned }).eq("id", post.id);
    if (error && !/is_pinned|column/i.test(String(error.message || ""))) throw error;
  }
  post.isPinned = isPinned;
}

async function deleteBoardReplyRecord(post, replyId) {
  if (boardBackendAvailable) {
    const { error } = await portalBackend.from("board_replies").delete().eq("id", replyId).eq("post_id", post.id);
    if (error) throw error;
  }
  post.responses = (post.responses || []).filter((reply) => reply.id !== replyId);
}

async function syncSecureSession() {
  if (!portalBackend) throw new Error("Secure login is temporarily unavailable. Please refresh and try again.");
  const { data: sessionData, error: sessionError } = await portalBackend.auth.getSession();
  if (sessionError) throw sessionError;
  const authUser = sessionData.session?.user;
  if (!authUser) {
    state.sessionEmail = "";
    saveState();
    return null;
  }
  const { data: profile, error: profileError } = await portalBackend
    .from("profiles")
    .select("user_id,email,full_name,business,account_type,membership_status,vetted_at,reputation_points")
    .eq("user_id", authUser.id)
    .single();
  if (profileError && profileError.code !== "PGRST116") throw profileError;
  const fallbackEmail = String(authUser.email || "").toLowerCase();
  const profileData = profile || {
    user_id: authUser.id,
    email: fallbackEmail,
    full_name: authUser.user_metadata?.full_name || (fallbackEmail === adminEmail ? "Jon Hotard" : ""),
    business: fallbackEmail === adminEmail ? "JP Innovation Ltd" : "",
    account_type: fallbackEmail === adminEmail ? "admin" : "client",
    membership_status: fallbackEmail === adminEmail ? "active" : "free"
  };
  if (!profile && fallbackEmail) {
    portalBackend.from("profiles").upsert(profileData, { onConflict: "user_id" }).then(() => {}).catch(() => {});
  }
  const email = String(profileData.email || authUser.email || "").toLowerCase();
  const accountType = email === adminEmail ? "admin" : (profileData.account_type || "client");
  let user = state.users.find((item) => item.email === email);
  if (!user) {
    user = {
      id: profileData.user_id,
      email,
      name: profileData.full_name || email.split("@")[0],
      business: profileData.business || "",
      role: accountType,
      level: accountType === "admin" ? "JP Admin" : (accountType === "member" ? "Innovation Hub member" : "Client Portal"),
      approved: true,
      suspended: false,
      verified: accountType === "admin",
      onboardingComplete: ["admin", "client"].includes(accountType),
      points: 0,
      helpfulPoints: 0
    };
    state.users.push(user);
  }
  Object.assign(user, {
    id: profileData.user_id,
    email,
    name: profileData.full_name || user.name,
    business: profileData.business || user.business || "",
    role: accountType,
    level: accountType === "admin" ? "JP Admin" : (accountType === "member" ? "Innovation Hub member" : "Client Portal"),
    membershipStatus: profileData.membership_status || "free",
    vetted: Boolean(profileData.vetted_at),
    reputationPoints: Number(profileData.reputation_points || 0),
    verified: accountType === "admin" || (accountType === "member" && profileData.membership_status === "active" && Boolean(profileData.vetted_at)),
    approved: true,
    suspended: false
  });
  delete user.password;
  state.sessionEmail = email;
  syncMember(user);
  saveState();
  return user;
}

function userInitials(user) {
  return (user?.name || "JP").split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join("") || "JP";
}

function roleLabel(user) {
  if (!user) return "Innovation Hub member";
  if (user.role === "admin") return "JP Admin";
  if (user.role === "client") return "Client Portal";
  return user.level || "Innovation Hub member";
}

function profileCompletion(user) {
  const checks = [
    user.name,
    user.business,
    user.location,
    user.skill,
    user.equipment,
    user.bio,
    user.portfolio,
    user.preferredWork,
    user.capacity,
    user.profileGoals
  ];
  const complete = checks.filter((value) => String(value || "").trim()).length;
  return Math.round((complete / checks.length) * 100);
}

function openAuth(mode = "signin") {
  $("#authDialog").classList.add("open");
  $("#authDialog").setAttribute("aria-hidden", "false");
  setAuthTab(mode);
}

function closeAuth() {
  $("#authDialog").classList.remove("open");
  $("#authDialog").setAttribute("aria-hidden", "true");
  $("#authStatus").textContent = "";
}

const clientFeaturePreviews = {
  quotes: {
    label: "Quotes",
    title: "Clear requests and private quotations.",
    copy: "Send JP Innovation the scope, timing and technical information, then keep the quotation and response together in your account.",
    preview: `<div class="feature-ui" aria-label="Example client quotation">
      <div class="feature-ui-toolbar"><strong>Quotation JP-1042</strong><span class="feature-ui-status">Ready to review</span></div>
      <div class="feature-ui-summary"><span><small>PROJECT</small><b>Prototype mounting bracket</b></span><span><small>TOTAL</small><b>&pound;1,250</b></span><span><small>LEAD TIME</small><b>3 weeks</b></span></div>
      <div class="feature-ui-file"><span>&#128196;</span><span><b>JP-1042-quotation.pdf</b><small>Scope, deliverables and terms</small></span><em>View</em></div>
    </div>`,
    points: ["Submit a new request", "Review quotation details", "Keep decisions with the project"]
  },
  projects: {
    label: "Project updates",
    title: "See progress and the next action.",
    copy: "Use one private project view for agreed work, progress notes and the information JP Innovation needs from you.",
    preview: `<div class="feature-ui" aria-label="Example client project progress">
      <div class="feature-ui-toolbar"><strong>Mounting bracket development</strong><span class="feature-ui-status">In progress</span></div>
      <div class="feature-ui-timeline"><span class="complete"><b>1</b><small>Brief agreed</small></span><span class="complete"><b>2</b><small>CAD design</small></span><span class="current"><b>3</b><small>Client review</small></span><span><b>4</b><small>Final files</small></span></div>
      <div class="feature-ui-note"><small>NEXT ACTION</small><b>Review revision B and confirm the hole positions</b></div>
    </div>`,
    points: ["Current project status", "Next steps and milestones", "Technical notes in one place"]
  },
  messages: {
    label: "Direct messages",
    title: "Keep project communication easy to find.",
    copy: "Ask a question or reply to JP Innovation without losing an important decision across separate conversations.",
    preview: `<div class="feature-ui feature-ui-messages" aria-label="Example client messages">
      <div class="feature-ui-toolbar"><strong>Messages with JP Innovation</strong><span>Project JP-1042</span></div>
      <div class="feature-ui-message"><span class="feature-ui-avatar">JP</span><p><b>JP Innovation</b><small>Revision B is ready. I have increased the corner radius and added the requested mounting slot.</small></p><em>10:24</em></div>
      <div class="feature-ui-message is-client"><span class="feature-ui-avatar">YOU</span><p><b>You</b><small>Thanks. I will check the hole positions this afternoon.</small></p><em>10:31</em></div>
    </div>`,
    points: ["Quote questions", "Project updates", "A clear record of decisions"]
  },
  repeat: {
    label: "Repeat work",
    title: "Start revisions and follow-on work faster.",
    copy: "Return to the same account when a component changes, another version is needed or a completed job needs extending.",
    preview: `<div class="feature-ui" aria-label="Example repeat work request">
      <div class="feature-ui-toolbar"><strong>Previous work</strong><span>2 completed projects</span></div>
      <div class="feature-ui-file"><span>&#8635;</span><span><b>Mounting bracket &middot; JP-1042</b><small>Completed 14 June &middot; Revision B</small></span><em>Request update</em></div>
      <div class="feature-ui-note"><small>NEW REQUEST</small><b>Use the previous files and describe only what has changed.</b></div>
    </div>`,
    points: ["Reference earlier work", "Request a revision", "Keep the new scope connected"]
  }
};

function openClientFeature(key) {
  const feature = clientFeaturePreviews[key];
  const dialog = $("#clientFeatureDialog");
  if (!feature || !dialog) return;
  $("#clientFeatureLabel").textContent = feature.label;
  $("#clientFeatureTitle").textContent = feature.title;
  const visual = feature.preview || (feature.image ? `<img src="${feature.image}" alt="${feature.imageAlt || "Client Portal feature preview"}">` : "");
  $("#clientFeatureBody").innerHTML = `<div class="feature-preview-content">${visual}<p>${feature.copy}</p><ul>${feature.points.map((point) => `<li>${point}</li>`).join("")}</ul></div>`;
  dialog.classList.add("open");
  dialog.setAttribute("aria-hidden", "false");
}

function closeClientFeature() {
  const dialog = $("#clientFeatureDialog");
  if (!dialog) return;
  dialog.classList.remove("open");
  dialog.setAttribute("aria-hidden", "true");
}

function setAuthTab(mode) {
  const isRegister = mode === "register";
  const isReset = mode === "reset";
  $all(".auth-tab").forEach((button) => button.classList.toggle("active", !isReset && button.dataset.authTab === mode));
  $("#signinForm").classList.toggle("hidden", isRegister || isReset);
  $("#registerForm").classList.toggle("hidden", !isRegister || isReset);
  $("#resetPasswordForm")?.classList.toggle("hidden", !isReset);
  $("#authTitle").textContent = isReset
    ? "Choose a new password"
    : (entryMode === "hub" ? "Innovation Hub login" : "Client Portal login");
  $("#authStatus").textContent = "";
}

function hasPasswordRecoveryLink() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  return hashParams.get("type") === "recovery" || searchParams.get("type") === "recovery" || searchParams.get("reset") === "1";
}

function openPasswordReset() {
  openAuth("reset");
  $("#authStatus").textContent = "Please enter your new password below.";
}

function setText(selector, text) {
  const element = $(selector);
  if (element) element.textContent = text;
}

function configureEntryPage() {
  const isHubEntry = entryMode === "hub";
  document.body.dataset.entry = entryMode;
  document.title = isHubEntry ? "JP Innovation Hub Sign In" : "JP Innovation Client Portal";
  const identityBadge = $("#entryIdentityBadge");
  if (identityBadge) {
    identityBadge.textContent = isHubEntry ? "Innovation Hub" : "Client Portal";
  }
  setText("#entryEyebrow", isHubEntry ? "Innovation Hub member access" : "Client Portal access");
  setText("#entryTitle", isHubEntry ? "Connect. Collaborate. Build." : "Quotes. Updates. Messages.");
  setText(
    "#entryLead",
    isHubEntry
      ? "A private paid workspace for approved engineering members."
      : "Your free, private workspace for working with JP Innovation."
  );
  const signInButton = $("#entrySignInButton");
  if (signInButton) signInButton.textContent = "Sign in";
  const requestLink = $("#entryRequestLink");
  if (requestLink) {
    requestLink.textContent = "Register for access";
    requestLink.dataset.openAuth = "register";
  }
  setText("#entryPanelLabel", isHubEntry ? "Paid member access" : "Free client access");
  setText("#entryPanelTitle", isHubEntry ? "Approved members only" : "One secure account");
  setText(
    "#entryPanelCopy",
    isHubEntry
      ? "Register once, then enter when JP Innovation approves your membership."
      : "Use the same login if JP Innovation later upgrades you to paid Hub membership."
  );
  setText("#entryPanelPointOne", isHubEntry ? "Paid features unlock after approval" : "Private customer workspace");
  setText("#entryPanelPointTwo", isHubEntry ? "Client Portal access remains included" : "Innovation Hub access stays separate until approved");
}

function isClientBlockedFromHub(user) {
  return entryMode === "hub" && !hasActiveHubAccess(user);
}

function hasActiveHubAccess(user = currentUser()) {
  const status = user?.membershipStatus || (user?.role === "member" ? "active" : "");
  const inactiveStatuses = new Set(["free", "pending", "rejected", "suspended"]);
  return user?.role === "admin" || (user?.role === "member" && !inactiveStatuses.has(status));
}

function syncPublicNavAccessState(user = currentUser()) {
  const hideClientPortal = hasActiveHubAccess(user);
  try {
    if (hideClientPortal) {
      window.localStorage.setItem("jpActiveHubAccess", "1");
      document.documentElement.classList.add("hub-member-session");
    } else {
      window.localStorage.removeItem("jpActiveHubAccess");
      document.documentElement.classList.remove("hub-member-session");
    }
  } catch {}
  $all("[data-client-portal-link], #clientPortalHeaderButton").forEach((link) => {
    link.hidden = hideClientPortal;
    link.setAttribute("aria-hidden", String(hideClientPortal));
  });
}

function isClientPortalContext(user = currentUser()) {
  // Admins may deliberately preview the Client Portal. Active paid members use
  // one Hub workspace; paused/free accounts fall back here without losing data.
  if (user?.role === "admin") return entryMode === "client";
  return !hasActiveHubAccess(user);
}

function showUpgradeDialog() {
  const dialog = $("#upgradeDialog");
  if (!dialog) {
    openAuth("signin");
    $("#authStatus").textContent = "This login is for the Client Portal. Upgrade to access Innovation Hub paid features.";
    return;
  }
  dialog.classList.add("open");
  dialog.setAttribute("aria-hidden", "false");
}

function closeUpgradeDialog() {
  const dialog = $("#upgradeDialog");
  if (!dialog) return;
  dialog.classList.remove("open");
  dialog.setAttribute("aria-hidden", "true");
}

function openReputationStatusDialog() {
  const user = currentUser();
  const dialog = $("#reputationStatusDialog");
  const body = $("#reputationStatusBody");
  if (!user || !dialog || !body) return;
  const status = reputationStatusCopy(user);
  body.innerHTML = `
    <div class="reputation-dialog-heading">${reputationBadge(user)}<p class="eyebrow">Your Hub status</p><h2 id="reputationStatusTitle">${escapeHtml(status.title)}</h2><p>${escapeHtml(status.detail)}</p></div>
    <div class="reputation-dialog-metrics"><article><strong>${status.points}</strong><span>Contribution points</span></article><article><strong>${status.positive}</strong><span>Approved positive reviews</span></article></div>
    <div class="reputation-tier-guide"><article class="blue"><span class="reputation-badge blue"><span aria-hidden="true">&#9733;</span><b>Blue Verified</b></span><p>Active paid membership plus JP Innovation vetting.</p></article><article class="gold"><span class="reputation-badge gold"><span aria-hidden="true">&#9733;</span><b>Gold Trusted</b></span><p>Blue Verified plus ${goldPointsTarget} points or ${goldPositiveReviewsTarget} approved 4–5 star reviews.</p></article></div>
    <button class="primary-button reputation-open-profile" type="button">View my reputation</button>`;
  dialog.classList.add("open");
  dialog.setAttribute("aria-hidden", "false");
}

function closeReputationStatusDialog() {
  const dialog = $("#reputationStatusDialog");
  if (!dialog) return;
  dialog.classList.remove("open");
  dialog.setAttribute("aria-hidden", "true");
}

function positionMemberStatusStar() {
  const star = $("#reputationStatusButton");
  const name = $("#memberName");
  const control = $(".member-profile-control");
  if (!star || !name || !control || star.classList.contains("hidden")) return;
  const controlRect = control.getBoundingClientRect();
  const nameRect = name.getBoundingClientRect();
  const starSize = star.offsetWidth || 19;
  const left = Math.max(0, nameRect.right - controlRect.left + 6);
  const top = Math.max(0, nameRect.top - controlRect.top + ((nameRect.height - starSize) / 2));
  star.style.left = `${Math.round(left)}px`;
  star.style.top = `${Math.round(top)}px`;
  star.style.right = "auto";
  star.style.bottom = "auto";
}

function setLoggedInView() {
  const user = currentUser();
  const loggedIn = Boolean(user);
  syncPublicNavAccessState(user);
  if (loggedIn && isClientBlockedFromHub(user)) {
    state.sessionEmail = "";
    saveState();
    $("#publicShell").classList.remove("hidden");
    $("#appShell").classList.add("hidden");
    showUpgradeDialog();
    return;
  }
  $("#publicShell").classList.toggle("hidden", loggedIn);
  $("#appShell").classList.toggle("hidden", !loggedIn);
  if (!loggedIn) return;
  const isClient = isClientPortalContext(user);
  const initials = userInitials(user);
  const profilePhoto = approvedProfilePhoto(user);
  const avatarMarkup = profilePhoto
    ? `<img src="${escapeHtml(profilePhoto)}" alt="${escapeHtml(user.name)} profile photo">`
    : escapeHtml(initials);
  $("#memberInitials").innerHTML = avatarMarkup;
  const profileMenuAvatar = $("#profileMenuAvatar");
  if (profileMenuAvatar) {
    profileMenuAvatar.innerHTML = avatarMarkup;
    profileMenuAvatar.classList.toggle("has-photo", Boolean(profilePhoto));
  }
  $("#memberName").textContent = user.name;
  $("#memberRole").textContent = isClient ? "Client Portal" : roleLabel(user);
  const reputationButton = $("#reputationStatusButton");
  const inlineReputationStar = $("#memberStatusStarInline");
  const reputationTier = memberReputationTier(user);
  const hideReputation = isClient || reputationTier === "none";
  [reputationButton, inlineReputationStar].forEach((badge) => {
    if (!badge) return;
    badge.classList.toggle("hidden", hideReputation);
    badge.classList.toggle("admin", reputationTier === "admin");
    badge.classList.toggle("blue", reputationTier === "blue");
    badge.classList.toggle("gold", reputationTier === "gold");
  });
  if (reputationButton) {
    reputationButton.setAttribute("aria-label", reputationTier === "admin" ? "Open JP Admin status" : (reputationTier === "gold" ? "Open Gold Trusted member status" : "Open Blue Verified member status"));
  }
  $("#profileAdminLink")?.classList.toggle("hidden", user.role !== "admin" || isClient);
  $("#profileClientWork")?.classList.toggle("hidden", isClient);
  $("#profileMyPosts")?.classList.toggle("hidden", isClient);
  $all(".nav-link").forEach((button) => {
    button.classList.toggle("hidden", isClient && !clientViews.has(button.dataset.view));
  });
  $(".workspace-header .eyebrow").textContent = isClient ? "Client Portal" : "Innovation Hub";
  renderNotifications();
  renderMessageInbox();
  if (isClient && !clientViews.has(currentView)) currentView = "dashboard";
  if (!isClient && user.role !== "admin" && !user.onboardingComplete) {
    currentView = "onboarding";
  }
  renderView(currentView);
}

async function registerUser(data) {
  if (!portalBackend) throw new Error("Secure registration is temporarily unavailable.");
  const email = validateEmail(data.email);
  const password = String(data.password || "");
  const fullName = String(data.fullName || "").trim();
  if (password.length < 8) throw new Error("Use a password of at least 8 characters.");
  const { data: result, error } = await portalBackend.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, requested_access: entryMode },
      emailRedirectTo: `${publicSiteOrigin}/hub-portal/index.html?entry=${entryMode}&signin=1`
    }
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message || "")) {
      throw new Error("This email already has a JP Innovation login. Please sign in instead; if Hub access was declined before, signing in from the Hub page will request access again.");
    }
    throw error;
  }
  if (result.session) {
    const user = await syncSecureSession();
    if (entryMode === "hub" && user?.role === "client") {
      await portalBackend.rpc("request_hub_access");
      await syncSecureSession();
    }
    await loadSecureUserData();
  }
  return result;
}

function createMemberAccount(data) {
  const email = data.email.trim().toLowerCase();
  if (!email) throw new Error("Add an email address for the member.");
  if (state.users.some((user) => user.email === email)) throw new Error("An account already exists for that email.");
  const password = data.password.trim();
  if (password.length < 6) throw new Error("Use a temporary password of at least 6 characters.");
  const role = data.accountType === "client" ? "client" : "member";
  const user = {
    id: uid("user"),
    name: data.name.trim(),
    business: (data.business || "").trim(),
    email,
    password,
    skill: (data.skill || "").trim(),
    location: (data.location || "").trim(),
    equipment: (data.equipment || "").trim(),
    portfolio: (data.portfolio || "").trim(),
    bio: (data.bio || "").trim(),
    preferredWork: (data.preferredWork || "").trim(),
    capacity: (data.capacity || "").trim(),
    profileGoals: (data.profileGoals || "").trim(),
    directoryVisible: data.directoryVisible === true,
    quoteAlerts: data.quoteAlerts !== false,
    messageAlerts: data.messageAlerts !== false,
    eventAlerts: data.eventAlerts !== false,
    onboardingComplete: role === "client",
    verified: role === "member" && data.verified === true,
    approved: true,
    level: role === "client" ? "Client Portal" : (data.verified === true ? "Verified Professional" : "Innovation Hub member"),
    role,
    points: role === "client" ? 0 : 25,
    helpfulPoints: 0,
    warning: false,
    suspended: false,
    created: new Date().toISOString()
  };
  state.users.push(user);
  syncMember(user);
  saveState();
  return user;
}

function createApplication(data) {
  const email = (data.email || "").trim().toLowerCase();
  if (!email) throw new Error("Add an email address.");
  const existing = state.applications.find((application) => application.email === email && application.status === "pending");
  if (existing) throw new Error("There is already a pending application for that email.");
  const application = {
    id: uid("app"),
    fullName: (data.fullName || "").trim(),
    business: (data.business || "").trim(),
    email,
    phone: (data.phone || "").trim(),
    location: (data.location || "").trim(),
    skill: (data.skill || "").trim(),
    experience: (data.experience || "").trim(),
    equipment: (data.equipment || "").trim(),
    membershipType: data.membershipType || "Professional member",
    availability: data.availability || "Project dependent",
    portfolio: (data.portfolio || "").trim(),
    social: (data.social || "").trim(),
    wantsCommunity: data.wantsCommunity === true,
    wantsQuotes: data.wantsQuotes === true,
    wantsDirectory: data.wantsDirectory === true,
    events: data.events === true,
    partner: data.partner === true,
    offer: (data.offer || "").trim(),
    support: (data.support || "").trim(),
    message: (data.message || "").trim(),
    status: "pending",
    created: "Just now",
    notes: "",
    generatedPassword: ""
  };
  state.applications.unshift(application);
  saveState();
  return application;
}

function temporaryPasswordFor(application) {
  const source = `${application.fullName || "Member"}${application.email || ""}`.replace(/[^A-Za-z0-9]/g, "");
  return `Hub${source.slice(0, 6) || "Member"}2026!`;
}

async function signIn(data) {
  const email = validateEmail(data.email);
  if (!portalBackend) throw new Error("Secure login is temporarily unavailable.");
  const { error } = await portalBackend.auth.signInWithPassword({ email, password: data.password });
  if (error) {
    const message = String(error.message || "");
    if (/confirm|verified|verification/i.test(message)) {
      throw new Error("Your account exists but the email is not verified yet. If no email arrived, JP Innovation needs email confirmation switched off in Supabase for now.");
    }
    if (/invalid login|invalid credentials|password|not found/i.test(message)) {
      throw new Error("Email or password is not recognised. If you just registered, try the same password again or use password reset.");
    }
    throw new Error(message || "Sign in failed. Please try again.");
  }
  let user = await syncSecureSession();
  if (entryMode === "hub" && user?.role === "client") {
    const { error: accessError } = await portalBackend.rpc("request_hub_access");
    if (!accessError) user = await syncSecureSession();
  }
  await loadSecureUserData();
  return user;
}

async function signOut() {
  if (portalBackend) await portalBackend.auth.signOut();
  try { window.localStorage.removeItem("jpActiveHubAccess"); } catch {}
  state.sessionEmail = "";
  saveState();
  currentView = "dashboard";
  setLoggedInView();
}

function buildInterestEmail(data) {
  return [
    "Hello JP Innovation,",
    "",
    "I would like to register my interest in the JP Innovation Hub.",
    "",
    `Full name: ${data.fullName || ""}`,
    `Business name: ${data.business || ""}`,
    `Email: ${data.email || ""}`,
    `Phone: ${data.phone || ""}`,
    `Location: ${data.location || ""}`,
    `Main skill set: ${data.skill || ""}`,
    `Years of experience: ${data.experience || ""}`,
    `Equipment/machines available: ${data.equipment || ""}`,
    `Membership interest: ${data.membershipType || ""}`,
    `Availability: ${data.availability || ""}`,
    `Website/portfolio: ${data.portfolio || ""}`,
    `LinkedIn/social proof: ${data.social || ""}`,
    `Interested in engineering discussions: ${data.wantsCommunity ? "Yes" : "No"}`,
    `Interested in Quote Hub opportunities: ${data.wantsQuotes ? "Yes" : "No"}`,
    `Interested in member directory listing: ${data.wantsDirectory ? "Yes" : "No"}`,
    `Interested in hosting events: ${data.events ? "Yes" : "No"}`,
    `Interested in becoming a verified partner: ${data.partner ? "Yes" : "No"}`,
    "",
    "What they can offer:",
    data.offer || "",
    "",
    "Support they are looking for:",
    data.support || "",
    "",
    "Message:",
    data.message || "",
    "",
    "Please let me know the next step for approval and payment.",
    "",
    "Thanks"
  ].join("\n");
}

function moderationFlag(text) {
  const banned = ["spam", "scam", "abuse", "idiot", "hate"];
  const lower = text.toLowerCase();
  return banned.some((word) => lower.includes(word));
}

function renderNotifications() {
  const items = notificationItems(currentUser());
  const unread = items.filter((item) => item.isNew).length;
  const countLabel = unread > 9 ? "9+" : String(unread);
  const menuNotificationCount = $("#notificationCount");
  if (menuNotificationCount) {
    menuNotificationCount.textContent = countLabel;
    menuNotificationCount.classList.toggle("hidden", unread === 0);
  }
  const topNotificationCount = $("#notificationCountTop");
  if (topNotificationCount) {
    topNotificationCount.textContent = countLabel;
    topNotificationCount.classList.toggle("hidden", unread === 0);
  }
  const profileAlertCount = $("#profileAlertCount");
  if (profileAlertCount) {
    profileAlertCount.textContent = countLabel;
    profileAlertCount.classList.toggle("hidden", unread === 0);
  }
  const notificationList = $("#notificationList");
  if (notificationList) {
    notificationList.innerHTML = items.length ? items.slice(0, 6).map((item) => `
      <button class="notification-item notification-shortcut ${item.isNew ? "new" : ""}" data-view-link="${escapeHtml(item.view || "notifications")}" data-target-id="${escapeHtml(item.targetId || "")}" data-post-id="${escapeHtml(item.postId || "")}" data-reply-id="${escapeHtml(item.replyId || "")}" type="button">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.detail)}</span>
      </button>
    `).join("") : `<div class="notification-item"><strong>Nothing new</strong><span>New approvals, messages and account updates will appear here.</span></div>`;
  }
  renderProfileChatNotifications(items);
  maybeShowLocalPhoneNotification(items);
}

function notificationItems(user = currentUser()) {
  if (!user) return [];
  const items = [];
  const unreadMessages = unreadMessageCount(user);
  if (unreadMessages) items.push({ title: `${unreadMessages} unread message${unreadMessages === 1 ? "" : "s"}`, detail: "Open Messages to review them.", isNew: true, view: "messages" });
  if (user.role === "admin") {
    const pendingAccess = secureAdminProfiles.filter((profile) => profile.membership_status === "pending").length;
    const pendingPosts = state.posts.filter((post) => post.moderationStatus === "pending").length;
    const pendingReplies = state.posts.flatMap((post) => (post.responses || []).filter((reply) => reply.moderationStatus === "pending").map((reply) => ({ post, reply })));
    const pendingProjects = state.projects.filter((project) => project.moderationStatus === "pending").length;
    const pendingQuotes = state.quotes.filter((quote) => quote.status === "jp-review").length;
    const pendingReviews = (state.memberReviews || []).filter((review) => review.moderationStatus === "pending").length;
    const pendingPhotos = pendingProfilePhotos().length;
    if (pendingAccess) items.push({ title: `${pendingAccess} access request${pendingAccess === 1 ? "" : "s"}`, detail: "Approve or reject access in Admin Review.", isNew: true, view: "admin", targetId: "adminAccessRequests" });
    if (pendingPosts) items.push({ title: `${pendingPosts} post${pendingPosts === 1 ? "" : "s"} awaiting moderation`, detail: "Review posts before publication.", isNew: true, view: "admin", targetId: "adminPostModeration" });
    pendingReplies.slice(0, 5).forEach(({ post, reply }) => items.push({
      title: `New reply: ${post.title}`,
      detail: `${reply.author} submitted a reply for approval.`,
      isNew: true, view: "boards", kind: "board", postId: post.id, replyId: reply.id
    }));
    if (pendingProjects) items.push({ title: `${pendingProjects} project${pendingProjects === 1 ? "" : "s"} awaiting moderation`, detail: "Review member projects before publication.", isNew: true, view: "admin", targetId: "adminProjectModeration" });
    if (pendingQuotes) items.push({ title: `${pendingQuotes} quote request${pendingQuotes === 1 ? "" : "s"} awaiting review`, detail: "Review them in the admin quote queue.", isNew: true, view: "admin", targetId: "adminQuoteQueue" });
    if (pendingReviews) items.push({ title: `${pendingReviews} member review${pendingReviews === 1 ? "" : "s"} awaiting approval`, detail: "Approve both the rating and written comment.", isNew: true, view: "admin", targetId: "adminMemberReviews" });
    if (pendingPhotos) items.push({ title: `${pendingPhotos} profile photo${pendingPhotos === 1 ? "" : "s"} awaiting approval`, detail: "Approve verified member images before they appear publicly.", isNew: true, view: "admin", targetId: "adminProfilePhotos" });
  } else {
    const pendingPosts = state.posts.filter((post) => post.authorEmail === user.email && post.moderationStatus === "pending").length;
    const pendingProjects = state.projects.filter((project) => project.authorEmail === user.email && project.moderationStatus === "pending").length;
    const pendingQuotes = state.quotes.filter((quote) => quote.authorEmail === user.email && quote.status === "jp-review").length;
    if (pendingPosts) items.push({ title: `${pendingPosts} post${pendingPosts === 1 ? "" : "s"} awaiting approval`, detail: "JP Innovation will publish approved posts.", isNew: true, view: "boards" });
    if (pendingProjects) items.push({ title: `${pendingProjects} project${pendingProjects === 1 ? "" : "s"} awaiting approval`, detail: "JP Innovation will publish approved projects.", isNew: true, view: "projects" });
    if (pendingQuotes) items.push({ title: `${pendingQuotes} quote request${pendingQuotes === 1 ? "" : "s"} under review`, detail: "JP Innovation is reviewing the scope.", isNew: true, view: "quotes" });
    if (user.profilePhotoStatus === "pending") items.push({ title: "Profile photo awaiting approval", detail: "JP Innovation will verify it before it appears publicly.", isNew: true, view: "profile" });
    const boardActivity = state.posts.flatMap((post) => (post.responses || [])
      .filter((reply) => reply.authorId !== user.id && reply.moderationStatus === "approved" && (post.authorId === user.id || post.authorEmail === user.email))
      .map((reply) => ({ post, reply })))
      .sort((a, b) => new Date(b.reply.createdAt || 0) - new Date(a.reply.createdAt || 0));
    boardActivity.slice(0, 5).forEach(({ post, reply }) => items.push({
      title: `Reply to: ${post.title}`,
      detail: `${reply.author} replied in ${post.category}.`,
      isNew: !state.seenBoardReplyIds.includes(reply.id), view: "boards", kind: "board", postId: post.id, replyId: reply.id
    }));
  }
  return items;
}

function renderProfileChatNotifications(items = notificationItems(currentUser())) {
  const mount = $("#profileChatNotifications");
  if (!mount) return;
  const chatItems = items.filter((item) => item.kind === "board").slice(0, 4);
  mount.innerHTML = chatItems.length ? `
    <details class="profile-chat-summary" ${state.chatSummaryMinimised ? "" : "open"}>
      <summary><span>Chat summary</span><b aria-hidden="true"></b></summary>
      <div class="profile-chat-alerts">
        ${chatItems.map((item) => `<button class="profile-chat-alert" data-post-id="${escapeHtml(item.postId)}" data-reply-id="${escapeHtml(item.replyId || "")}" type="button"><span aria-hidden="true">&#128172;</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></span>${item.isNew ? `<b>New</b>` : ""}</button>`).join("")}
      </div>
    </details>
  ` : "";
  $(".profile-chat-summary", mount)?.addEventListener("toggle", (event) => {
    state.chatSummaryMinimised = !event.currentTarget.open;
    saveState();
  });
  $all(".profile-chat-alert", mount).forEach((button) => button.addEventListener("click", () => {
    openBoardNotification(button.dataset.postId, button.dataset.replyId);
  }));
}

function openBoardNotification(postId, replyId = "") {
  const post = state.posts.find((item) => item.id === postId);
  if (!post) return;
  personalBoardMode = false;
  personalQuotesMode = false;
  if (replyId && !state.seenBoardReplyIds.includes(replyId)) state.seenBoardReplyIds.push(replyId);
  activeBoardCategory = post.category === "General Engineering Chat" ? "General Chat" : post.category;
  activeBoardPostId = post.id;
  saveState();
  setMemberProfileMenuOpen(false);
  setMobileDashboardMenuOpen(false);
  renderView("boards");
  renderNotifications();
  window.requestAnimationFrame(() => document.getElementById(`reply-${replyId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
}

function unreadMessageCount(user = currentUser()) {
  if (!user) return 0;
  const messages = user.role === "client"
    ? state.messages.filter((message) => message.ownerEmail === user.email)
    : state.messages;
  return messages.filter((message) => message.unread).length;
}

function renderMessageInbox() {
  const count = unreadMessageCount();
  const badge = $("#messageCount");
  if (!badge) return;
  badge.textContent = count > 9 ? "9+" : String(count);
  badge.classList.toggle("hidden", count === 0);
}

function setNotificationsOpen(open) {
  const bell = $("#topNotificationBell");
  const popover = $("#notificationPopover");
  if (!popover || !bell) return;
  popover.classList.toggle("open", open);
  popover.setAttribute("aria-hidden", String(!open));
  bell.setAttribute("aria-expanded", String(open));
}

function setMemberProfileMenuOpen(open) {
  const menu = $("#memberProfileMenu");
  const button = $("#memberProfileButton");
  if (!menu || !button) return;
  menu.classList.toggle("open", open);
  menu.setAttribute("aria-hidden", String(!open));
  button.setAttribute("aria-expanded", String(open));
  if (!open) setNotificationsOpen(false);
}

function setMobileDashboardMenuOpen(open) {
  const shell = $("#appShell");
  const button = $("#mobileMenuButton");
  const sidebar = $("#dashboardSidebar");
  if (!shell || !button) return;
  shell.classList.toggle("mobile-menu-open", open);
  document.body.classList.toggle("mobile-dashboard-menu-open", open);
  button.setAttribute("aria-expanded", String(open));
  button.setAttribute("aria-label", open ? "Close dashboard menu" : "Open dashboard menu");
  const label = button.querySelector(".menu-label");
  if (label) label.textContent = open ? "Close" : "Menu";
  if (!open && sidebar) sidebar.scrollTop = 0;
}

function renderView(view) {
  const user = currentUser();
  if (!user) return;
  if (isClientPortalContext(user) && !clientViews.has(view)) view = "dashboard";
  if (!isClientPortalContext(user) && user.role !== "admin" && !user.onboardingComplete && !["onboarding", "profile", "settings"].includes(view)) {
    view = "onboarding";
  }
  currentView = view;
  const viewUrl = new URL(window.location.href);
  viewUrl.searchParams.set("entry", entryMode);
  viewUrl.searchParams.set("view", view);
  viewUrl.searchParams.delete("signin");
  viewUrl.searchParams.delete("register");
  window.history.replaceState({}, document.title, `${viewUrl.pathname}${viewUrl.search}`);
  const titles = {
    onboarding: "Profile Setup",
    dashboard: "Dashboard",
    clientwork: "My Client Work",
    boards: "Engineering Boards",
    projects: "Projects",
    quotes: "Quote Requests",
    directory: "Member Directory",
    resources: "Resources & Tools",
    events: "Events",
    messages: "Messages",
    notifications: "Notifications",
    rewards: "Rewards",
    profile: "My Profile",
    settings: "Settings",
    admin: "Admin Review"
  };
  $("#viewTitle").textContent = titles[view] || "Dashboard";
  syncNavigationState(view);
  const mount = $("#viewMount");
  mount.dataset.view = view;
  const renderers = {
    onboarding: renderOnboarding,
    dashboard: renderDashboard,
    clientwork: renderClientWork,
    boards: renderBoards,
    projects: renderProjects,
    quotes: renderQuotes,
    directory: renderDirectory,
    resources: renderResources,
    events: renderEvents,
    messages: renderMessages,
    notifications: renderNotificationsView,
    rewards: renderRewards,
    profile: renderProfile,
    settings: renderSettings,
    admin: renderAdmin
  };
  mount.innerHTML = (renderers[view] || renderDashboard)(user);
  prepareCompactSections(view);
  renderMessageInbox();
  bindViewHandlers(view);
}

function syncNavigationState(view = currentView) {
  $all(".nav-link").forEach((button) => {
    const isActive = button.dataset.view === view;
    button.classList.toggle("active", isActive);
    if (isActive) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function prepareCompactSections(view) {
  const compactViews = new Set(["dashboard", "clientwork", "onboarding", "projects", "quotes", "directory", "resources", "events", "messages", "notifications", "rewards", "profile", "settings"]);
  if (!compactViews.has(view)) return;
  const mobile = window.matchMedia("(max-width: 560px)").matches;
  $all("#viewMount > .section-card").forEach((section, index) => {
    if (section.matches("details")) return;
    const heading = section.querySelector("h2, h3");
    if (!heading) return;
    section.classList.add("compact-collapsible");
    heading.classList.add("compact-original-title");
    const toggle = document.createElement("button");
    toggle.className = "compact-section-toggle";
    toggle.type = "button";
    toggle.innerHTML = `<span>${escapeHtml(heading.textContent.trim())}</span><b aria-hidden="true">−</b>`;
    const collapsed = mobile && index > 0;
    section.classList.toggle("is-collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.querySelector("b").textContent = collapsed ? "+" : "−";
    toggle.addEventListener("click", () => {
      const willCollapse = !section.classList.contains("is-collapsed");
      section.classList.toggle("is-collapsed", willCollapse);
      toggle.setAttribute("aria-expanded", String(!willCollapse));
      toggle.querySelector("b").textContent = willCollapse ? "+" : "−";
    });
    section.prepend(toggle);
  });
}

function renderClientDashboard(user) {
  const quotes = state.quotes.filter((quote) => quote.authorEmail === user.email);
  const messages = state.messages.filter((message) => message.ownerEmail === user.email);
  return `
    <section class="section-card section-blue">
      <p class="eyebrow">Client Portal</p>
      <h2>Welcome back, ${escapeHtml(user.name)}.</h2>
      <p class="muted">Use your Client Portal account to request work, follow your private quotes and communicate directly with JP Innovation.</p>
      <div class="metrics-grid">
        ${metric("My quote requests", quotes.length)}
        ${metric("Open requests", quotes.filter((quote) => quote.status !== "closed").length)}
        ${metric("Project updates", quotes.filter((quote) => quote.status === "shortlisted" || quote.status === "closed").length)}
        ${metric("Messages", messages.length)}
      </div>
    </section>
    <section class="section-card section-violet">
      <div class="list-title"><div><h2>Client Portal tools</h2><p>Everything needed to manage work with JP Innovation without joining the paid Innovation Hub.</p></div></div>
      <div class="cards-grid">
        <article class="card"><span class="badge">Quotes</span><h3>Request engineering work</h3><p>Send specifications, follow review status and keep each request private.</p><button class="primary-button nav-link-jump" data-target-view="quotes" type="button">Open my quotes</button></article>
        <article class="card"><span class="badge">Projects</span><h3>Follow progress</h3><p>See the current stage, next action and the history linked to your requests.</p><button class="secondary-button nav-link-jump" data-target-view="projects" type="button">Open projects</button></article>
        <article class="card"><span class="badge">Contact</span><h3>Message JP Innovation</h3><p>Keep questions, updates and project communication together.</p><button class="secondary-button nav-link-jump" data-target-view="messages" type="button">Open messages</button></article>
        <article class="card"><span class="badge">Optional upgrade</span><h3>Innovation Hub</h3><p>Innovation Hub members also receive engineering boards, the professional directory, resources, events, rewards and supplier opportunities.</p><p class="muted">Ask JP Innovation to upgrade this same login when you are ready.</p></article>
      </div>
    </section>
  `;
}

function renderClientWork(user) {
  const email = cleanEmailValue(user?.email || "");
  const ownQuotes = state.quotes.filter((quote) => quote.authorId === user?.id || cleanEmailValue(quote.authorEmail || "") === email);
  const ownProjects = state.projects.filter((project) => project.authorId === user?.id || cleanEmailValue(project.authorEmail || "") === email);
  const ownMessages = state.messages.filter((message) => {
    const owner = cleanEmailValue(message.ownerEmail || "");
    const sender = cleanEmailValue(message.senderEmail || "");
    const recipient = cleanEmailValue(message.recipientEmail || "");
    return owner === email || sender === email || recipient === email;
  });
  const unread = ownMessages.filter((message) => message.unread && cleanEmailValue(message.senderEmail || "") !== email).length;
  const latestQuotes = ownQuotes.slice(0, 3);
  return `
    <section class="section-card section-blue">
      <p class="eyebrow">Included in your membership</p>
      <h2>Your JP Innovation work</h2>
      <p class="muted">Your private quotes, project progress and messages are kept inside the Innovation Hub. Upgrading never creates a second account or loses your Client Portal history.</p>
      <div class="metrics-grid">
        ${metric("My quotes", ownQuotes.length)}
        ${metric("My projects", ownProjects.length)}
        ${metric("Unread messages", unread)}
        ${metric("Total messages", ownMessages.length)}
      </div>
    </section>
    <section class="section-card section-violet">
      <div class="list-title"><div><h2>Client work</h2><p>Everything shared privately between you and JP Innovation.</p></div></div>
      <div class="cards-grid">
        <article class="card"><span class="badge">Quotes</span><h3>Requests and responses</h3><p>Submit work, review status and keep supplier responses private.</p><button class="primary-button nav-link-jump" data-target-view="quotes" type="button">Open my quotes</button></article>
        <article class="card"><span class="badge">Projects</span><h3>Project progress</h3><p>See active work, milestones and the next action against your requests.</p><button class="secondary-button nav-link-jump" data-target-view="projects" type="button">Open my projects</button></article>
        <article class="card"><span class="badge">Messages</span><h3>Direct contact</h3><p>Keep private project questions and updates together.</p><button class="secondary-button nav-link-jump" data-target-view="messages" type="button">Open messages</button></article>
      </div>
      ${latestQuotes.length ? `<div class="compact-list"><h3>Latest quote requests</h3>${latestQuotes.map((quote) => `<button class="compact-list-row nav-link-jump" data-target-view="quotes" type="button"><span><strong>${escapeHtml(quote.service || quote.title || "Quote request")}</strong><small>${escapeHtml(quote.status || "Submitted")}</small></span><b aria-hidden="true">&#8594;</b></button>`).join("")}</div>` : ""}
    </section>`;
}

function renderDashboard(user) {
  if (isClientPortalContext(user)) return renderClientDashboard(user);
  const unread = state.messages.filter((msg) => msg.unread).length;
  const quotes = state.quotes.length;
  const projects = state.projects.length;
  const posts = state.posts.length;
  const leaders = rewardLeaders();
  const completion = profileCompletion(user);
  const openQuotes = (state.quotes || []).filter((quote) => quote.status !== "closed").length;
  const activeProject = state.projects.find((project) => project.id === state.activeProjectId) || state.projects[0];
  const unresolvedPosts = state.posts.filter((post) => !countHelpfulReplies(post)).length;
  const nextActions = dashboardNextActions(user, { completion, unread, unresolvedPosts, openQuotes });
  return `
    ${user.role !== "admin" && completion < 80 ? `
      <section class="section-card setup-reminder">
        <div>
          <span class="badge">Profile setup</span>
          <h2>${completion}% complete</h2>
          <p class="muted">Finish your profile so JP Innovation can match you with the right discussions, members and quote opportunities.</p>
        </div>
        <button class="primary-button dashboard-link" data-view-link="onboarding" type="button">Continue setup</button>
      </section>
    ` : ""}
    <section class="home-hero section-card dashboard-visual-hero">
      <div>
        <p class="eyebrow">Portal home</p>
        <h2>Welcome back, ${escapeHtml(user.name.split(" ")[0] || user.name)}</h2>
        <p class="muted">A private working area for engineering questions, project support, verified contacts, quotes and member opportunities.</p>
        <div class="meta-row">
          <span class="pill good">Private Innovation Hub area</span>
          <span class="pill">${escapeHtml(roleLabel(user))}</span>
          <span class="pill">Professional member workspace</span>
        </div>
        <div class="hero-button-row">
          <button class="primary-button dashboard-link" data-view-link="boards" type="button">Ask the boards</button>
          <button class="secondary-button dashboard-link" data-view-link="quotes" type="button">Review quote requests</button>
        </div>
      </div>
      <div class="dashboard-image-card">
        <img src="../assets/cad-machined-bracket.png" alt="">
        <div>
          <span class="badge">Featured workflow</span>
          <strong>From idea to quoted project</strong>
          <p>Members can share concepts, collect practical feedback and prepare work for private supplier quotes.</p>
        </div>
      </div>
    </section>
    <div class="metrics-grid dashboard-metrics">
      ${metric("Posts", posts)}
      ${metric("Projects", projects)}
      ${metric("Open quotes", openQuotes)}
      ${metric("Unread messages", unread)}
    </div>
    <section class="section-card dashboard-actions">
      <div class="list-title"><div><h2>Quick actions</h2><p>Jump straight into the work members use most.</p></div></div>
      <div class="action-grid">
        ${quickAction("Q1", "Create board post", "Ask a technical question or start a focused engineering discussion.", "boards")}
        ${quickAction("Q2", "Add project", "Share a build, product idea or prototype for member input.", "projects")}
        ${quickAction("Q3", "Create quote request", "Prepare a private request for JP review or member quoting.", "quotes")}
        ${quickAction("MSG", "Open messages", "Read replies, member contact and project updates.", "messages")}
      </div>
    </section>
    <section class="section-card launch-focus-panel">
      <div class="list-title"><div><h2>Your next best steps</h2><p>A simple route through the Hub without hunting through every section.</p></div></div>
      <div class="attention-list">
        ${nextActions.map((item) => `
          <button class="attention-item dashboard-link" data-view-link="${escapeHtml(item.view)}" type="button">
            <span class="pill ${escapeHtml(item.tone || "")}">${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(item.detail)}</small>
          </button>
        `).join("")}
      </div>
    </section>
    <section class="section-card member-momentum section-teal">
      <div class="list-title"><div><h2>Current engineering activity</h2><p>A quick read of what is moving inside the Hub.</p></div></div>
      <div class="momentum-grid">
        <article>
          <img src="${escapeHtml(activeProject?.image || "../assets/case-study-fixture-bracket.png")}" alt="">
          <div>
            <span class="badge">Active project</span>
            <h3>${escapeHtml(activeProject?.title || "No active project")}</h3>
            <p>${escapeHtml(activeProject?.nextStep || activeProject?.description || "Create a project to begin collecting member input.")}</p>
            <button class="secondary-button dashboard-link" data-view-link="projects" type="button">Open project</button>
          </div>
        </article>
        <article class="reward-highlight">
          <span class="badge">${escapeHtml(state.rewardMonth)} competition</span>
          <strong>${escapeHtml(state.rewardPrize)}</strong>
          <p>Members earn points when their feedback is marked helpful by the person who posted.</p>
          <button class="secondary-button dashboard-link" data-view-link="rewards" type="button">View rewards</button>
        </article>
      </div>
    </section>
    <section class="section-card compact-home section-blue">
      <div class="list-title"><div><h2>Member sections</h2><p>Each section opens separately to keep the Hub tidy and simple to navigate.</p></div></div>
      <div class="section-link-grid">
        ${portalSections.map((section) => `
          <button class="section-link dashboard-link" data-view-link="${section.view}" type="button">
            <strong>${escapeHtml(section.title)}</strong>
            <span>${escapeHtml(section.detail)}</span>
          </button>
        `).join("")}
      </div>
    </section>
    <section class="section-card hub-search-panel section-violet">
      <div class="list-title"><div><h2>Find help fast</h2><p>Search people, skills, threads, projects, quotes and events.</p></div></div>
      <label class="wide">Search Hub <input id="hubSearchInput" placeholder="Try CAD, Mini, welding, Milton Keynes, quote..."></label>
      <div id="hubSearchResults" class="search-results">
        <p class="muted">Start typing to find useful help across the Hub.</p>
      </div>
    </section>
  `;
}

function metric(label, value) {
  return `<article class="metric-card"><span class="badge">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function quickAction(code, title, detail, view) {
  return `
    <button class="action-card dashboard-link" data-view-link="${escapeHtml(view)}" type="button">
      <span class="action-icon">${escapeHtml(code)}</span>
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(detail)}</small>
    </button>
  `;
}

function dashboardNextActions(user, counts) {
  return [
    counts.completion < 80
      ? { label: `${counts.completion}%`, tone: "warn", title: "Finish your member profile", detail: "Skills, capability and location help people find the right support.", view: "onboarding" }
      : { label: "Profile", tone: "good", title: "Profile is ready", detail: "Review your public directory details when your availability changes.", view: "profile" },
    counts.unread
      ? { label: `${counts.unread} unread`, tone: "warn", title: "Check messages", detail: "Reply to new Hub messages and project updates.", view: "messages" }
      : { label: "Inbox", tone: "good", title: "No unread messages", detail: "Use messages for direct contact and introductions.", view: "messages" },
    counts.unresolvedPosts
      ? { label: "Help", tone: "", title: "Answer a board question", detail: "Helpful replies build your member reputation.", view: "boards" }
      : { label: "Boards", tone: "good", title: "Browse active discussions", detail: "Start a new thread when you need advice.", view: "boards" }
  ];
}

function analyticsMetric(label, value, detail = "") {
  return `<article class="metric-card"><span class="badge">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</article>`;
}

function renderAnalyticsRows(rows = []) {
  return rows.map((row) => `
    <article class="feed-item">
      <div>
        <span class="badge">${escapeHtml(row.day || "Today")}</span>
        <h3>${escapeHtml(row.views || 0)} page views</h3>
        <p>${escapeHtml(row.visitors || 0)} visitors - Top page: ${escapeHtml(row.topPage || "Not enough data yet")}</p>
      </div>
    </article>
  `).join("");
}

async function loadSiteAnalytics() {
  const mount = $("#analyticsPanel");
  if (!mount) return;
  if (!portalBackend) {
    mount.innerHTML = `<p class="muted">Analytics will appear here once the secure backend is available.</p>`;
    return;
  }
  mount.innerHTML = `<p class="muted">Loading private site analytics...</p>`;
  try {
    const since = new Date();
    since.setDate(since.getDate() - 13);
    since.setHours(0, 0, 0, 0);
    const [viewsResult, totalsResult] = await Promise.all([
      portalBackend
        .from("page_views")
        .select("created_at,visitor_id,page_path,device_type")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000),
      portalBackend.rpc("admin_dashboard_metrics")
    ]);
    if (viewsResult.error) throw viewsResult.error;
    if (totalsResult.error) throw totalsResult.error;
    const data = viewsResult.data;
    const totals = totalsResult.data || {};
    const rows = data || [];
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayRows = rows.filter((row) => String(row.created_at || "").slice(0, 10) === todayKey);
    const uniqueToday = new Set(todayRows.map((row) => row.visitor_id)).size;
    const mobileToday = todayRows.filter((row) => row.device_type === "mobile").length;
    const dayMap = new Map();
    rows.forEach((row) => {
      const day = String(row.created_at || "").slice(0, 10);
      if (!day) return;
      if (!dayMap.has(day)) dayMap.set(day, { day, views: 0, visitors: new Set(), pages: new Map() });
      const entry = dayMap.get(day);
      entry.views += 1;
      entry.visitors.add(row.visitor_id || "unknown");
      const page = row.page_path || "/";
      entry.pages.set(page, (entry.pages.get(page) || 0) + 1);
    });
    const dailyRows = Array.from(dayMap.values()).sort((a, b) => b.day.localeCompare(a.day)).slice(0, 14).map((entry) => {
      const topPage = Array.from(entry.pages.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
      return { day: entry.day, views: entry.views, visitors: entry.visitors.size, topPage };
    });
    mount.innerHTML = `
      <div class="metrics-grid">
        ${analyticsMetric("Total website visits", totals.total_website_visits || 0, "all recorded page views")}
        ${analyticsMetric("Unique visitors", totals.unique_visitors || 0, "anonymous browser IDs")}
        ${analyticsMetric("Member registrations", totals.member_registrations || 0, "paid Hub accounts")}
        ${analyticsMetric("Client registrations", totals.client_registrations || 0, "free Client Portal accounts")}
        ${analyticsMetric("Posts created", totals.posts_created || 0, "all submitted threads")}
        ${analyticsMetric("Active members", totals.active_members || 0, "approved paid members")}
        ${analyticsMetric("Visits today", todayRows.length, `${uniqueToday} unique visitors`)}
        ${analyticsMetric("Mobile views", mobileToday, "today")}
      </div>
      <div class="feed-list analytics-feed">
        ${dailyRows.length ? renderAnalyticsRows(dailyRows) : `<p class="muted">No page views have been recorded yet.</p>`}
      </div>
    `;
  } catch (error) {
    mount.innerHTML = `
      <p class="muted">Live metrics are unavailable. No placeholder totals are being shown.</p>
      <p class="form-status">${escapeHtml(error.message || "Database metrics are not available yet.")}</p>
    `;
  }
}

function renderOnboarding(user) {
  const completion = profileCompletion(user);
  return `
    <section class="section-card onboarding-hero">
      <div>
        <p class="eyebrow">First login setup</p>
        <h2>Complete your Hub profile</h2>
        <p class="muted">This helps JP Innovation approve the right opportunities, show useful members in the directory, and keep Quote Hub work relevant.</p>
        <div class="meta-row">
          <span class="pill ${completion >= 80 ? "good" : "warn"}">${completion}% complete</span>
          <span class="pill">${escapeHtml(user.level || "Member")}</span>
          <span class="pill">${user.directoryVisible ? "Directory visible" : "Directory hidden"}</span>
        </div>
      </div>
      <div class="setup-progress">
        <span style="width: ${completion}%"></span>
      </div>
    </section>
    <section class="section-card section-amber">
      <div class="list-title"><div><h2>Member details</h2><p>Keep this practical. Other members should quickly understand what you do and what help you need.</p></div></div>
      <form id="onboardingForm" class="form-grid two">
        <label>Name <input name="name" value="${escapeHtml(user.name)}" required></label>
        <label>Business <input name="business" value="${escapeHtml(user.business || "")}"></label>
        <label>Location <input name="location" value="${escapeHtml(user.location || "")}" required></label>
        <label>Main skills <input name="skill" value="${escapeHtml(user.skill || "")}" required></label>
        <label class="wide">Equipment/capability <input name="equipment" value="${escapeHtml(user.equipment || "")}" placeholder="CAD software, machines, workshop capability..."></label>
        <label class="wide">Portfolio or website <input name="portfolio" value="${escapeHtml(user.portfolio || "")}" placeholder="https://"></label>
        <label>Preferred work <select name="preferredWork">
          ${["Design review", "CAD support", "Manufacturing quotes", "Prototype feedback", "General networking"].map((item) => `<option value="${escapeHtml(item)}" ${user.preferredWork === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
        </select></label>
        <label>Current capacity <select name="capacity">
          ${["Available for projects", "Limited availability", "Advice only", "Not offering services yet"].map((item) => `<option value="${escapeHtml(item)}" ${user.capacity === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
        </select></label>
        <label class="wide">What do you want from the Hub? <textarea name="profileGoals" rows="3" placeholder="Quotes, advice, suppliers, collaboration, events...">${escapeHtml(user.profileGoals || "")}</textarea></label>
        <label class="wide">Short profile bio <textarea name="bio" rows="4" required>${escapeHtml(user.bio || "")}</textarea></label>
        <label class="check wide"><input name="directoryVisible" type="checkbox" ${user.directoryVisible ? "checked" : ""}> Show my profile in the member directory</label>
        <label class="check wide"><input name="quoteAlerts" type="checkbox" ${user.quoteAlerts !== false ? "checked" : ""}> Send me Quote Hub opportunities</label>
        <label class="check wide"><input name="messageAlerts" type="checkbox" ${user.messageAlerts !== false ? "checked" : ""}> Send me member message alerts</label>
        <label class="check wide"><input name="eventAlerts" type="checkbox" ${user.eventAlerts !== false ? "checked" : ""}> Send me event and workshop updates</label>
        <button class="primary-button wide" type="submit">Finish setup</button>
        <p id="onboardingStatus" class="form-status wide" aria-live="polite"></p>
      </form>
    </section>
  `;
}

function visibleBoardPosts(user = currentUser()) {
  if (!user) return [];
  const posts = user.role === "admin"
    ? state.posts
    : state.posts.filter((post) => post.moderationStatus === "approved" || post.authorId === user.id || post.authorEmail === user.email);
  return sortBoardPosts(posts);
}

function visibleBoardReplies(post, user = currentUser()) {
  if (!user) return [];
  if (user.role === "admin") return post.responses || [];
  return (post.responses || []).filter((reply) => reply.moderationStatus === "approved" || reply.authorId === user.id || reply.authorEmail === user.email);
}

function renderBoards() {
  const posts = visibleBoardPosts();
  const activePost = posts.find((post) => post.id === activeBoardPostId);
  if (activePost) {
    return `
      <section class="section-card section-cyan board-thread-detail">
        <button class="secondary-button board-back-button" type="button">&larr; Back to Posts</button>
        ${postCard(activePost)}
      </section>
    `;
  }
  const unanswered = posts.filter((post) => !(post.responses || []).length).length;
  const needsHelp = posts.filter((post) => post.postType === "needs-help" && !countHelpfulReplies(post)).length;
  const helpfulReplies = posts.reduce((total, post) => total + countHelpfulReplies(post), 0);
  if (personalBoardMode) {
    const user = currentUser();
    const myPosts = posts.filter((post) => post.authorId === user?.id || post.authorEmail === user?.email);
    return `
      <section class="section-card section-cyan board-personal-header">
        <div><h2>My posts</h2><p class="muted">Your submitted board threads and their approval status.</p></div>
        <button class="secondary-button board-all-posts" type="button">Browse all boards</button>
      </section>
      <section class="section-card section-cyan board-thread-panel">
        <div class="board-thread-list">${myPosts.length ? myPosts.map(postThreadRow).join("") : `<div class="board-empty-state"><strong>No posts yet.</strong><p>Start your first post below.</p></div>`}</div>
      </section>
      ${renderBoardPostComposer("General Chat")}
    `;
  }
  if (activeBoardCategory) {
    const categoryPosts = posts.filter((post) => post.category === activeBoardCategory || (activeBoardCategory === "General Chat" && post.category === "General Engineering Chat"));
    return `
      <section class="section-card section-cyan board-category-compact">
        <div class="board-category-header">
          <div><h2>${escapeHtml(activeBoardCategory)}</h2><p class="muted">${escapeHtml(boardDescription(activeBoardCategory))}</p></div>
          <span class="pill">${categoryPosts.length} ${categoryPosts.length === 1 ? "thread" : "threads"}</span>
          <button class="secondary-button board-all-button" type="button">All boards</button>
        </div>
      </section>
      <section class="section-card section-cyan board-thread-panel">
        <div class="list-title"><div><h2>Threads</h2><p>Select a title to open the conversation and reply.</p></div></div>
        <div class="board-thread-list">${categoryPosts.length ? categoryPosts.map(postThreadRow).join("") : `<div class="board-empty-state"><strong>No discussions yet.</strong><p>Start the first ${escapeHtml(activeBoardCategory)} thread below.</p></div>`}</div>
      </section>
      ${renderBoardPostComposer(activeBoardCategory)}
    `;
  }
  return `
    <section class="section-card section-cyan board-directory">
      <div class="list-title"><div><h2>Choose a board</h2><p>Open a subject area to see its thread titles.</p></div><span class="pill">${posts.length} threads</span></div>
      <div class="board-grid">${boardCategories.map((category) => {
        const count = posts.filter((post) => post.category === category || (category === "General Chat" && post.category === "General Engineering Chat")).length;
        return `<button class="board-card board-category-button" data-board-category="${escapeHtml(category)}" type="button"><span class="board-card-icon" aria-hidden="true">&#128172;</span><h3>${escapeHtml(category)}</h3><p>${boardDescription(category)}</p><small class="board-card-count">${count} ${count === 1 ? "thread" : "threads"} &rarr;</small></button>`;
      }).join("")}</div>
    </section>
    <section class="section-card section-cyan board-thread-panel">
      <div class="list-title"><div><h2>Recent threads</h2><p>Open a discussion directly or choose a board above.</p></div><span class="pill">${posts.slice(0, 8).length}</span></div>
      <div class="board-thread-list">${posts.length ? posts.slice(0, 8).map(postThreadRow).join("") : `<div class="board-empty-state"><strong>No live discussions yet.</strong><p>Start the first engineering thread once your membership is approved.</p></div>`}</div>
    </section>
    <section class="section-card board-overview-strip">
      ${metric("Need replies", unanswered)}
      ${metric("Need helpful answer", needsHelp)}
      ${metric("Helpful replies", helpfulReplies)}
    </section>
  `;
}

function renderBoardPostComposer(selectedCategory = "General Chat") {
  return `
    <details class="section-card section-cyan board-composer">
      <summary><strong>+ Start a new thread</strong><span>Sent to JP Innovation for approval</span></summary>
      <form id="postForm" class="form-grid two">
        <label>Thread title <input name="title" required placeholder="Add a clear title"></label>
        <label>Board <select name="category">${boardCategories.map((category) => `<option value="${escapeHtml(category)}" ${category === selectedCategory ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}</select></label>
        <label>Post type <select name="postType">${boardPostTypeOptions("information")}</select></label>
        <div class="wide formatted-text-editor"><label for="newThreadDescription">First message</label>${formattingToolbar("Format first message")}<textarea id="newThreadDescription" name="description" rows="6" required placeholder="Add the important dimensions, constraints or context..."></textarea></div>
        <button class="primary-button wide" type="submit">Submit thread for approval</button>
        <p id="postStatus" class="form-status wide" aria-live="polite"></p>
      </form>
    </details>
  `;
}

function postThreadRow(post) {
  const replies = visibleBoardReplies(post);
  const preview = String(post.description || "").replace(/\s+/g, " ").trim().slice(0, 110);
  const postAuthor = memberForIdentity({ id: post.authorId, email: post.authorEmail, name: post.author });
  return `<button class="board-thread-row open-board-post ${post.isPinned ? "is-pinned" : ""}" data-post-id="${escapeHtml(post.id)}" type="button"><span class="thread-bubble" aria-hidden="true">&#128172;</span><span class="thread-row-copy"><strong>${post.isPinned ? `<span class="thread-pin-marker">Pinned</span> ` : ""}${escapeHtml(post.title)}</strong><span class="thread-row-preview">${escapeHtml(preview)}${String(post.description || "").length > 110 ? "&hellip;" : ""}</span><small>${escapeHtml(post.author)} ${reputationBadge(postAuthor, { compact: true })} &middot; ${escapeHtml(post.created || "Today")} &middot; ${escapeHtml(boardPostTypeLabel(post.postType))}</small></span><span class="thread-row-count">${replies.length} ${replies.length === 1 ? "reply" : "replies"}</span>${post.isPinned ? `<span class="pill pinned">Pinned</span>` : ""}<span class="pill ${post.moderationStatus === "approved" ? "good" : "warn"}">${post.moderationStatus === "approved" ? "Published" : "Pending"}</span><span aria-hidden="true">&rsaquo;</span></button>`;
}

function boardDescription(category) {
  const descriptions = {
    "General Chat": "General questions, introductions, tips and practical workshop discussion.",
    "General Engineering Chat": "General questions, introductions, tips and practical workshop discussion.",
    "CAD & Design": "Design reviews, drawings, tolerances, assemblies and fixtures.",
    "3D Printing": "Materials, print settings, prototypes and finishing advice.",
    "CNC & Machining": "Machining methods, workholding, cutters and small batch jobs.",
    "Welding & Fabrication": "Fabrication sequences, frames, repairs and metalwork support.",
    "Automotive Projects": "Restoration work, motorsport parts, brackets and modifications.",
    "Electronics & Automation": "Sensors, access control, PLCs, wiring and test rigs.",
    "Supplier Recommendations": "Trusted suppliers, local capability and material sourcing.",
    "Jobs & Collaboration": "Freelance help, workshop support and member job adverts."
  };
  return descriptions[category] || "Member discussion board.";
}

function renderProjects() {
  const user = currentUser();
  if (isClientPortalContext(user)) return renderClientProjects(user);
  const visibleProjects = state.projects.filter((project) => user?.role === "admin"
    || project.authorEmail === user?.email
    || project.moderationStatus === "approved");
  const activeProject = visibleProjects.find((project) => project.id === state.activeProjectId) || visibleProjects[0];
  return `
    ${activeProject ? renderProjectDetail(activeProject) : ""}
    <section class="section-card section-teal">
      <h2>Share a project</h2>
      <form id="projectForm" class="form-grid two">
        <label>Project title <input name="title" required></label>
        <label>Category <input name="category" required></label>
        <label>Location <input name="location"></label>
        <label>Progress status <select name="status">${["Planning", "In Progress", "Completed"].map(option).join("")}</select></label>
        <label class="wide">Description <textarea name="description" rows="4" required></textarea></label>
        <button class="primary-button wide" type="submit">Submit for approval</button>
      </form>
    </section>
    <section class="section-card section-teal">
      <div class="list-title"><div><h2>Member projects</h2><p>Select a project to open its full detail page.</p></div></div>
      <div class="cards-grid">${visibleProjects.map(projectCard).join("") || `<p class="muted">No approved projects yet.</p>`}</div>
    </section>
  `;
}

function renderClientProjects(user) {
  const workItems = state.quotes.filter((quote) => quote.authorEmail === user?.email);
  return `
    <section class="section-card section-teal compact-view-hero">
      <div class="list-title"><div><h2>My project progress</h2><p>Each request stays connected to its review stage, next action and follow-on work.</p></div><span class="pill">${workItems.length}</span></div>
    </section>
    <section class="section-card section-teal">
      <div class="client-project-list">
        ${workItems.length ? workItems.map((item) => {
          const step = quoteStepNumber(item.status);
          const nextAction = {
            "jp-review": "JP Innovation is checking the scope and supplied information.",
            open: "The request is approved and suitable responses are being collected.",
            shortlisted: "Review the available option and confirm any final changes.",
            closed: "This item is complete. Use follow-on work if another revision is needed."
          }[item.status] || "JP Innovation will confirm the next action.";
          return `<article class="client-project-card">
            <div class="list-title"><div><span class="badge">${escapeHtml(quoteStatusLabel(item.status))}</span><h3>${escapeHtml(item.service)}</h3></div><span class="pill">${step}/4</span></div>
            <div class="client-project-timeline" aria-label="Project progress">
              ${["Brief received", "Scope review", "Client decision", "Complete"].map((label, index) => `<span class="${index + 1 < step ? "complete" : (index + 1 === step ? "current" : "")}"><b>${index + 1}</b><small>${label}</small></span>`).join("")}
            </div>
            <div class="feature-ui-note"><small>NEXT ACTION</small><b>${escapeHtml(nextAction)}</b></div>
            <div class="card-actions">
              <button class="secondary-button client-project-message" data-project-title="${escapeHtml(item.service)}" type="button">Message JP Innovation</button>
              <button class="secondary-button repeat-quote-button" data-id="${escapeHtml(item.id)}" type="button">Request follow-on work</button>
            </div>
          </article>`;
        }).join("") : `<div class="empty-state"><strong>No projects yet</strong><span>Your first quote request will appear here automatically.</span><button class="primary-button nav-link-jump" data-target-view="quotes" type="button">Request a quote</button></div>`}
      </div>
    </section>`;
}

function renderProjectDetail(project) {
  const user = currentUser();
  const canManage = user?.role === "admin" || user?.id === project.authorId || user?.email === project.authorEmail;
  return `
    <section class="section-card project-detail">
      <div class="project-detail-main">
        ${project.image ? `<img class="project-hero-image" src="${escapeHtml(project.image)}" alt="">` : `<div class="project-hero-image empty">No image yet</div>`}
        <div>
          <span class="badge">${escapeHtml(project.category)}</span>
          <h2>${escapeHtml(project.title)}</h2>
          <p class="muted">${escapeHtml(project.description)}</p>
          <div class="meta-row">
            <span class="pill">${escapeHtml(project.author)}</span>
            <span class="pill">${escapeHtml(project.location || "Location TBC")}</span>
            <span class="pill ${projectStatusPill(project.status)}">${escapeHtml(project.status)}</span>
            <span class="pill">${project.points || 0} pts</span>
          </div>
        </div>
      </div>
      <div class="project-detail-grid">
        <article class="project-panel">
          <span class="badge">Next step</span>
          <h3>${escapeHtml(project.nextStep || "Add the next practical milestone")}</h3>
          ${canManage ? `<form class="project-update-form" data-project-id="${escapeHtml(project.id)}">
            <label>Update title <input name="title" required placeholder="Milestone, issue, decision..."></label>
            <label>Update notes <textarea name="body" rows="3" required></textarea></label>
            <button class="secondary-button" type="submit">Add update</button>
          </form>` : `<p class="muted">Project updates are managed by the project owner.</p>`}
        </article>
        <article class="project-panel">
          <div class="list-title"><div><h3>Parts and materials</h3><p>Keep track of what needs designing, making or sourcing.</p></div></div>
          <div class="mini-table">
            ${(project.parts || []).map((part) => `
              <div><strong>${escapeHtml(part.name)}</strong><span>${escapeHtml(part.material || "TBC")}</span><em>${escapeHtml(part.status || "Open")}</em></div>
            `).join("")}
          </div>
          ${canManage ? `<form class="project-part-form compact-form" data-project-id="${escapeHtml(project.id)}">
            <label>Part <input name="name" required></label>
            <label>Material <input name="material"></label>
            <label>Status <input name="status" placeholder="CAD, ordered, made..."></label>
            <button class="secondary-button" type="submit">Add part</button>
          </form>` : ""}
        </article>
      </div>
      <div class="project-detail-grid">
        <article class="project-panel">
          <div class="list-title"><div><h3>Timeline</h3><p>Short progress notes for members to follow.</p></div></div>
          <div class="timeline-list">
            ${(project.updates || []).map((update) => `
              <div><span>${escapeHtml(update.created || "Now")}</span><strong>${escapeHtml(update.title)}</strong><p>${escapeHtml(update.body)}</p></div>
            `).join("")}
          </div>
        </article>
        <article class="project-panel">
          <div class="list-title"><div><h3>Member feedback</h3><p>Useful replies can later feed into the rewards system.</p></div></div>
          <div class="project-comments">
            ${(project.discussion || []).map((comment) => `
              <div>
                <strong>${escapeHtml(comment.author)}</strong>
                <p>${escapeHtml(comment.body)}</p>
                <span class="pill ${comment.helpful ? "good" : ""}">${comment.helpful ? "Helpful" : "Comment"}</span>
              </div>
            `).join("")}
          </div>
          <form class="project-comment-form" data-project-id="${escapeHtml(project.id)}">
            <label>Add feedback <textarea name="body" rows="3" required placeholder="Ask a question or suggest a practical next step..."></textarea></label>
            <button class="secondary-button" type="submit">Post feedback</button>
          </form>
        </article>
      </div>
    </section>
  `;
}

function renderQuotes() {
  const user = currentUser();
  if (user?.role === "client") return renderClientQuotes(user);
  const isAdmin = user?.role === "admin";
  const visibleQuotes = state.quotes.filter((quote) => personalQuotesMode
    ? (quote.authorId === user?.id || quote.authorEmail === user?.email || (quote.responses || []).some((response) => response.providerId === user?.id || response.providerEmail === user?.email))
    : (isAdmin
    || quote.authorEmail === user?.email
    || quote.status === "open"
    || quote.status === "shortlisted"));
  const openQuotes = state.quotes.filter((quote) => quote.status === "open" || quote.status === "shortlisted");
  const responseCount = state.quotes.reduce((total, quote) => total + quote.responses.length, 0);
  return `
    <section class="section-card quote-hub-hero ${personalQuotesMode ? "quote-personal-hero" : ""}">
      <div>
        <p class="eyebrow">${personalQuotesMode ? "Profile shortcut" : "Flagship feature"}</p>
        <h2>${personalQuotesMode ? "My quotes" : "Private Quote Hub"}</h2>
        <p class="muted">${personalQuotesMode ? "Your quote requests and the private responses you have submitted." : "Customers submit one clear engineering request. JP Innovation reviews the scope, then approved members can quote privately without seeing competitor prices."}</p>
        ${personalQuotesMode ? `<button class="secondary-button quote-all-button" type="button">Browse Quote Hub</button>` : ""}
        ${personalQuotesMode ? "" : `
        <div class="quote-hero-actions">
          <button class="primary-button quote-jump" data-target="quoteForm" type="button">Create request</button>
          <button class="secondary-button quote-jump" data-target="quoteResponseForm" type="button">Respond privately</button>
        </div>
        <div class="quote-rule-grid">
          <article><strong>Blind pricing</strong><span>Providers only see their own submitted price.</span></article>
          <article><strong>JP first review</strong><span>Poorly scoped or unsuitable work can be held back.</span></article>
          <article><strong>Customer control</strong><span>The customer compares responses privately.</span></article>
        </div>
        `}
      </div>
      ${personalQuotesMode ? "" : `
      <div class="quote-pipeline">
        ${quoteStage("1", "JP review", "Scope checked before release")}
        ${quoteStage("2", "Open", "Verified members can quote")}
        ${quoteStage("3", "Shortlist", "Customer compares privately")}
        ${quoteStage("4", "Closed", "Job awarded or archived")}
      </div>
      `}
    </section>
    ${personalQuotesMode ? "" : `
    <section class="quote-metrics">
      ${metric("JP review", state.quotes.filter((quote) => quote.status === "jp-review").length)}
      ${metric("Open to quote", state.quotes.filter((quote) => quote.status === "open").length)}
      ${metric("Private responses", responseCount)}
      ${metric("Shortlisted", state.quotes.filter((quote) => quote.status === "shortlisted").length)}
    </section>
    <section class="notice quote-notice">Private pricing rule: each provider only sees their own submitted quote. Customers and JP Innovation can review all responses. This keeps the process fair and avoids a public price race.</section>
    `}
    <section class="section-card section-violet quote-create-panel">
      <div class="list-title"><div><h2>Request a quote</h2><p>Capture enough detail for a sensible first review before releasing it to members.</p></div></div>
      <form id="quoteForm" class="form-grid two">
        <label>Service required <input name="service" required placeholder="CNC machining, CAD design, fabrication..."></label>
        <label>Location <input name="location"></label>
        <label>Material <input name="material" placeholder="Aluminium, steel, plastic..."></label>
        <label>Quantity <input name="quantity" placeholder="1, 10, small batch..."></label>
        <label>Budget range optional <input name="budget" placeholder="Optional"></label>
        <label>Deadline <input name="deadline"></label>
        <label>Required outcome <select name="outcome">
          <option>Finished part / manufactured item</option>
          <option>Design support only</option>
          <option>Prototype for testing</option>
          <option>Repair or reverse engineering</option>
          <option>Supplier advice / feasibility</option>
        </select></label>
        <label>Tolerance / finish needs <input name="tolerance" placeholder="Standard, tight tolerance, cosmetic finish..."></label>
        <label class="wide">Description <textarea name="description" rows="4" required placeholder="What is needed, what exists already, and any important constraints..."></textarea></label>
        <label class="wide">Files / drawings note <input name="files" placeholder="STEP file, drawing, photo set, NDA required..."></label>
        <label class="check wide"><input name="jpFirst" type="checkbox" checked> Allow JP Innovation to quote first</label>
        <button class="primary-button wide" type="submit">Submit for JP approval</button>
      </form>
    </section>
    <section class="section-card section-violet">
      <div class="list-title"><div><h2>Private requests</h2><p>Status-driven requests with private provider responses.</p></div></div>
      <div class="quote-board">${visibleQuotes.map(quoteCard).join("") || `<p class="muted">No quote requests yet.</p>`}</div>
    </section>
    ${personalQuotesMode ? "" : `<section class="section-card section-violet">
      <div class="list-title"><div><h2>Submit a private response</h2><p>Responses are visible only to the customer, the responding member and JP Innovation.</p></div></div>
      <form id="quoteResponseForm" class="form-grid two">
        <label>Request <select name="requestId">${openQuotes.map((quote) => `<option value="${quote.id}">${escapeHtml(quote.service)}</option>`).join("")}</select></label>
        <label>Price <input name="price" placeholder="Private"></label>
        <label>Lead time <input name="leadTime"></label>
        <label>Assumptions <input name="assumptions" placeholder="Material supplied, drawing review needed..."></label>
        <label>Availability <input name="availability" placeholder="Can start this week, evenings only..."></label>
        <label class="wide">Notes <textarea name="notes" rows="3" placeholder="What is included, exclusions, questions for the customer..."></textarea></label>
        <button class="secondary-button wide" type="submit" ${openQuotes.length ? "" : "disabled"}>Submit private quote</button>
      </form>
    </section>`}
  `;
}

function renderClientQuotes(user) {
  const myQuotes = state.quotes.filter((quote) => quote.authorEmail === user.email);
  return `
    <section class="section-card quote-hub-hero">
      <div>
        <p class="eyebrow">Client Portal</p>
        <h2>My private quote requests</h2>
        <p class="muted">Submit work for JP Innovation to review. Only you and JP Innovation should see your request details and responses in the finished secure system.</p>
      </div>
      <div class="quote-pipeline">
        ${quoteStage("1", "Request sent", "Your requirements are recorded")}
        ${quoteStage("2", "JP review", "Scope and files are checked")}
        ${quoteStage("3", "Quote prepared", "Options are shared privately")}
        ${quoteStage("4", "Decision", "Approve, revise or close")}
      </div>
    </section>
    <section class="section-card section-violet quote-create-panel">
      <div class="list-title"><div><h2>Request a quote</h2><p>Tell JP Innovation what you need. There is no charge for using a client account.</p></div></div>
      <form id="quoteForm" class="form-grid two">
        <label>Service required <input name="service" required placeholder="CAD design, prototyping, fabrication..."></label>
        <label>Location <input name="location"></label>
        <label>Material <input name="material"></label>
        <label>Quantity <input name="quantity"></label>
        <label>Budget range optional <input name="budget"></label>
        <label>Deadline <input name="deadline"></label>
        <label>Required outcome <select name="outcome"><option>Finished part / manufactured item</option><option>Design support only</option><option>Prototype for testing</option><option>Repair or reverse engineering</option><option>Supplier advice / feasibility</option></select></label>
        <label>Tolerance / finish needs <input name="tolerance"></label>
        <label class="wide">Description <textarea name="description" rows="4" required></textarea></label>
        <label class="wide">Files / drawings note <input name="files" placeholder="STEP file, drawing, photos, NDA required..."></label>
        <input name="jpFirst" type="hidden" value="true">
        <button class="primary-button wide" type="submit">Send request to JP Innovation</button>
      </form>
    </section>
    <section class="section-card section-violet">
      <div class="list-title"><div><h2>My requests</h2><p>Requests created by this client login.</p></div></div>
      <div class="quote-board">${myQuotes.map(quoteCard).join("") || `<p class="muted">You have not submitted a quote request yet.</p>`}</div>
    </section>
  `;
}

function quoteStage(number, title, detail) {
  return `<article><span>${escapeHtml(number)}</span><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></div></article>`;
}

function renderDirectory() {
  return `
    <section class="section-card section-lime">
      <div class="list-title"><div><h2>Search members</h2><p>Filter by practical capability.</p></div></div>
      <div class="directory-tools">
        <label>Skill <input id="skillFilter" placeholder="CAD, CNC, fabrication"></label>
        <label>Location <input id="locationFilter" placeholder="Milton Keynes"></label>
        <label class="check"><input id="verifiedFilter" type="checkbox"> Verified only</label>
      </div>
    </section>
    <section class="section-card section-lime">
      <div id="directoryResults" class="directory-grid"></div>
    </section>
  `;
}

function renderResources() {
  const isAdmin = currentUser()?.role === "admin";
  return `
    <section class="section-card resources-hero">
      <div>
        <p class="eyebrow">Member resources</p>
        <h2>Practical tools for scoping work before asking for help.</h2>
        <p class="muted">Use the working calculators now, then add practical checklists, guides and templates for the member library.</p>
      </div>
      <div class="tool-summary">
        <span class="badge">Working tools</span>
        <strong>3 calculators</strong>
        <p>Quote estimate, 3D print time and clearance helper.</p>
      </div>
    </section>
    <section class="section-card section-green">
      <div class="list-title"><div><h2>Quick calculators</h2><p>Simple tools that give members a useful starting point.</p></div></div>
      <div class="tool-grid">
        <article class="tool-card">
          <span class="badge">Machining</span>
          <h3>Cutting speed</h3>
          <label>Tool diameter mm <input id="cuttingDiameter" type="number" min="0.1" step="0.1" value="10"></label>
          <label>Cutting speed m/min <input id="cuttingSpeed" type="number" min="1" step="1" value="120"></label>
          <p class="tool-result" id="cuttingSpeedResult">Recommended: 3,820 RPM</p>
        </article>
        <article class="tool-card">
          <span class="badge">Material</span>
          <h3>Material weight</h3>
          <label>Volume cm&sup3; <input id="materialVolume" type="number" min="0" step="1" value="250"></label>
          <label>Material <select id="materialDensity"><option value="2.70">Aluminium</option><option value="7.85">Steel</option><option value="8.96">Copper</option><option value="1.24">PLA</option></select></label>
          <p class="tool-result" id="materialWeightResult">Estimated weight: 0.68 kg</p>
        </article>
        <article class="tool-card">
          <span class="badge">Convert</span>
          <h3>Unit conversion</h3>
          <label>Millimetres <input id="unitMillimetres" type="number" step="0.01" value="25.4"></label>
          <p class="tool-result" id="unitConversionResult">1.000 inches</p>
        </article>
        <article class="tool-card">
          <span class="badge">Quote</span>
          <h3>Small job estimate</h3>
          <label>Hours <input id="calcHours" type="number" min="0" step="0.25" value="3"></label>
          <label>Hourly rate <input id="calcRate" type="number" min="0" step="1" value="45"></label>
          <label>Material cost <input id="calcMaterial" type="number" min="0" step="1" value="35"></label>
          <p class="tool-result" id="quoteCalcResult">Estimate: GBP 170</p>
        </article>
        <article class="tool-card">
          <span class="badge">3D Print</span>
          <h3>Print time estimate</h3>
          <label>Part weight grams <input id="printWeight" type="number" min="1" step="1" value="80"></label>
          <label>Speed grams/hour <input id="printRate" type="number" min="1" step="1" value="12"></label>
          <label>Setup minutes <input id="printSetup" type="number" min="0" step="5" value="20"></label>
          <p class="tool-result" id="printCalcResult">Estimate: 7h 0m</p>
        </article>
        <article class="tool-card">
          <span class="badge">Design</span>
          <h3>Clearance helper</h3>
          <label>Nominal size mm <input id="clearanceNominal" type="number" min="0" step="0.1" value="10"></label>
          <label>Fit type <select id="clearanceFit"><option value="close">Close fit</option><option value="standard">Standard fit</option><option value="loose">Loose fit</option></select></label>
          <p class="tool-result" id="clearanceResult">Suggested opening: 10.2 mm</p>
        </article>
      </div>
    </section>
    <section class="section-card section-green">
      <div class="list-title"><div><h2>Ready-to-use templates</h2><p>Open or save a practical starting document, then replace the prompts with the real job details.</p></div></div>
      <div class="resource-grid built-in-resources">
        ${builtInResources().map((resource) => `<article class="resource-card"><span class="badge">${escapeHtml(resource.type)}</span><h3>${escapeHtml(resource.title)}</h3><p>${escapeHtml(resource.detail)}</p><button class="secondary-button download-resource-button" data-resource-key="${escapeHtml(resource.key)}" type="button">Download template</button></article>`).join("")}
      </div>
    </section>
    ${isAdmin ? `<section class="section-card section-green">
      <div class="list-title"><div><h2>Add resource</h2><p>Create your own checklist, guide, template or useful note for members.</p></div></div>
      <form id="resourceForm" class="form-grid two">
        <label>Type <select name="type">${["Checklist", "Template", "Guide", "Tool note", "Supplier note"].map(option).join("")}</select></label>
        <label>Title <input name="title" required></label>
        <label class="wide">Detail <textarea name="detail" rows="3" required></textarea></label>
        <button class="primary-button wide" type="submit">Add resource</button>
      </form>
    </section>` : ""}
    <section class="section-card section-green">
      <div class="list-title"><div><h2>Templates and checklists</h2><p>Resources that can later become downloadable member files.</p></div></div>
      <div class="resource-grid">
        ${(state.resources || []).map((resource) => `
          <article class="resource-card">
            <span class="badge">${escapeHtml(resource.type)}</span>
            <h3>${escapeHtml(resource.title)}</h3>
            <p>${escapeHtml(resource.detail)}</p>
            <div class="card-actions">
              ${isAdmin ? `<button class="secondary-button delete-item-button" data-delete-type="resource" data-id="${escapeHtml(resource.id)}" type="button">Delete</button>` : ""}
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderEvents() {
  const isAdmin = currentUser()?.role === "admin";
  return `
    <section class="section-card section-rose">
      <h2>Engineering events</h2>
      <p class="muted">Add member meetups, workshops and site visits, then track who has registered interest.</p>
      ${isAdmin ? `<form id="eventForm" class="form-grid two">
        <label>Event title <input name="title" required></label>
        <label>Type <select name="type">${["Meetup", "Workshop", "Site visit", "Online session", "Supplier demo"].map(option).join("")}</select></label>
        <label>Date <input name="date" type="date" required></label>
        <label>Location <input name="location" required placeholder="Milton Keynes, Online, TBC..."></label>
        <button class="primary-button wide" type="submit">Add event</button>
      </form>` : ""}
      <div class="cards-grid">${state.events.map((event) => {
        const interested = event.interested || [];
        const joined = interested.includes(currentUser()?.id);
        return `
        <article class="event-card">
          <span class="badge">${escapeHtml(event.type)}</span>
          <h3>${escapeHtml(event.title)}</h3>
          <p>${escapeHtml(event.date)} - ${escapeHtml(event.location)}</p>
          <p class="muted">${interested.length} interested</p>
          <div class="card-actions">
            <button class="secondary-button event-interest-button" data-event-id="${escapeHtml(event.id)}" type="button">${joined ? "Interest registered" : "Register interest"}</button>
            ${isAdmin ? `<button class="secondary-button delete-item-button" data-delete-type="event" data-id="${escapeHtml(event.id)}" type="button">Delete</button>` : ""}
          </div>
        </article>`;
      }).join("")}
      </div>
    </section>
  `;
}

function renderNotificationsView() {
  const items = notificationItems(currentUser());
  return `
    <section class="section-card section-blue compact-view-hero">
      <div class="list-title"><div><h2>Notifications</h2><p>Only genuine account activity and items requiring action appear here.</p></div><span class="pill ${items.length ? "warn" : "good"}">${items.length}</span></div>
      <div class="notification-page-list">
        ${items.length ? items.map((item) => `
          <button class="notification-page-item dashboard-link" data-view-link="${escapeHtml(item.view)}" data-target-id="${escapeHtml(item.targetId || "")}" data-post-id="${escapeHtml(item.postId || "")}" data-reply-id="${escapeHtml(item.replyId || "")}" type="button">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.detail)}</span>
          </button>
        `).join("") : `<div class="empty-state"><strong>Nothing needs attention</strong><span>New approvals, messages and submission updates will appear here.</span></div>`}
      </div>
    </section>
  `;
}

function messageCounterparty(message, user = currentUser()) {
  if (user?.role === "client") {
    return { key: adminEmail, name: "JP Innovation", email: adminEmail };
  }
  const outgoing = cleanEmailValue(message.senderEmail || "") === cleanEmailValue(user?.email || "");
  const email = cleanEmailValue(outgoing ? message.recipientEmail : message.senderEmail);
  const name = outgoing ? (message.recipientName || email || "Hub member") : (message.from || email || "Hub member");
  return { key: email || String(name).toLowerCase(), name, email };
}

function messageConversations(messages, user = currentUser()) {
  const grouped = new Map();
  messages.forEach((message) => {
    const person = messageCounterparty(message, user);
    if (!grouped.has(person.key)) grouped.set(person.key, { ...person, messages: [] });
    grouped.get(person.key).messages.push(message);
  });
  return Array.from(grouped.values()).map((conversation) => {
    conversation.messages.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    conversation.latest = conversation.messages[conversation.messages.length - 1];
    conversation.unread = conversation.messages.filter((message) => message.unread).length;
    return conversation;
  }).sort((a, b) => new Date(b.latest?.createdAt || 0) - new Date(a.latest?.createdAt || 0));
}

function markMessagesReadLocally(user = currentUser()) {
  state.messages.forEach((message) => {
    if (user?.role === "client") {
      if (message.ownerEmail === user.email) message.unread = false;
    } else if (user?.role === "admin") {
      message.unread = false;
    } else if (message.recipientEmail === user?.email) {
      message.unread = false;
    }
  });
}

function messageComposer(user, recipients, selectedEmail = "") {
  const isClient = user?.role === "client";
  return `
    <details id="newMessageComposer" class="section-card section-cyan message-compose-panel" ${messageDraftRecipientEmail ? "open" : ""}>
      <summary class="list-title"><div><h2>New message</h2><p>${isClient ? "Send a private message to JP Innovation." : "Start a private conversation with an approved member."}</p></div><span class="pill">Compose</span></summary>
      <form id="messageForm" class="form-grid two">
        <input name="from" type="hidden" value="${escapeHtml(user?.name || "Hub member")}">
        ${isClient ? "" : `<label>To <select name="toEmail" required><option value="">Choose a member</option>${recipients.map((member) => `<option value="${escapeHtml(member.email)}" ${member.email === selectedEmail ? "selected" : ""}>${escapeHtml(member.name)}${member.business ? ` - ${escapeHtml(member.business)}` : ""}</option>`).join("")}</select></label>`}
        <label class="${isClient ? "" : ""}">Subject <input name="subject" required></label>
        <label class="wide">Message <textarea name="body" rows="4" required></textarea></label>
        <button class="primary-button wide" type="submit" ${!isClient && !recipients.length ? "disabled" : ""}>Send message</button>
      </form>
    </details>`;
}

function messageThread(conversation, user = currentUser()) {
  const latestSubject = conversation.latest?.subject || "Message";
  return `
    <section class="section-card section-blue message-thread-view">
      <div class="message-thread-header">
        <button class="secondary-button back-to-message-inbox" type="button">&larr; Inbox</button>
        <div><p class="eyebrow">Private conversation</p><h2>${escapeHtml(conversation.name)}</h2></div>
      </div>
      <div class="message-feed">
        ${conversation.messages.map((message) => {
          const outgoing = cleanEmailValue(message.senderEmail || "") === cleanEmailValue(user?.email || "") || (user?.role === "client" && message.ownerEmail === user.email && message.from === user.name);
          return `<article class="message-bubble ${outgoing ? "outgoing" : "incoming"}">
            <div class="message-bubble-meta"><strong>${escapeHtml(message.from || (outgoing ? user?.name : conversation.name))}</strong><span>${escapeHtml(message.created || "Recently")}</span></div>
            <small>${escapeHtml(message.subject || "Message")}</small>
            ${renderFormattedPostText(message.body)}
            <button class="message-delete-button delete-item-button" data-delete-type="message" data-id="${escapeHtml(message.id)}" type="button" aria-label="Delete message">Delete</button>
          </article>`;
        }).join("")}
      </div>
      <form id="messageForm" class="message-reply-form">
        <input name="from" type="hidden" value="${escapeHtml(user?.name || "Hub member")}">
        ${user?.role === "client" ? "" : `<input name="toEmail" type="hidden" value="${escapeHtml(conversation.email)}">`}
        <input name="subject" type="hidden" value="${escapeHtml(/^re:/i.test(latestSubject) ? latestSubject : `Re: ${latestSubject}`)}">
        <label>Reply <textarea name="body" rows="3" required placeholder="Write a reply..."></textarea></label>
        <button class="primary-button" type="submit">Send reply</button>
      </form>
    </section>`;
}

function renderMessages() {
  const user = currentUser();
  const memberMessages = user?.role === "client"
    ? state.messages.filter((message) => message.ownerEmail === user.email)
    : user?.role === "admin"
    ? state.messages
    : state.messages.filter((message) => message.senderEmail === user?.email || message.recipientEmail === user?.email);
  const unread = memberMessages.filter((message) => message.unread && (!message.recipientEmail || message.recipientEmail === user?.email)).length;
  const recipients = user?.role === "client" ? [] : state.members.filter((member) => member.email && member.email !== user?.email && member.directoryVisible !== false);
  const conversations = messageConversations(memberMessages, user);
  const activeConversation = conversations.find((conversation) => conversation.key === activeMessageConversationKey);
  if (activeConversation) return messageThread(activeConversation, user);
  return `
    ${messageComposer(user, recipients, messageDraftRecipientEmail)}
    <section class="section-card section-blue message-inbox-panel">
      <div class="list-title"><div><h2>Inbox</h2><p>Select a person to open the full message feed.</p></div>${unread ? `<button class="secondary-button mark-messages-read" type="button">Mark all read</button>` : ""}</div>
      <div class="message-inbox-list">${conversations.length ? conversations.map((conversation) => {
        const latest = conversation.latest;
        const preview = String(latest?.body || "").replace(/\s+/g, " ").trim();
        return `<button class="message-inbox-row open-message-thread" data-conversation-key="${escapeHtml(conversation.key)}" type="button">
          <span class="message-inbox-person"><strong>${escapeHtml(conversation.name)}</strong><small>${escapeHtml(latest?.subject || "Message")}</small></span>
          <span class="message-inbox-preview">${escapeHtml(preview.slice(0, 90))}${preview.length > 90 ? "&hellip;" : ""}</span>
          <span class="message-inbox-time">${escapeHtml(latest?.created || "Recently")}</span>
          ${conversation.unread ? `<b class="message-unread-count">${conversation.unread}</b>` : ""}
        </button>`;
      }).join("") : `<div class="empty-state"><strong>No messages yet</strong><span>Your private conversations will appear here.</span></div>`}</div>
    </section>
  `;
}

function rewardLeaders() {
  return [...state.members]
    .sort((a, b) => (b.helpfulPoints || 0) - (a.helpfulPoints || 0) || (b.points || 0) - (a.points || 0))
    .slice(0, 8);
}

function renderRewards() {
  const leaders = rewardLeaders();
  return `
    <section class="section-card rewards-hero">
      <div>
        <p class="eyebrow">Monthly member competition</p>
        <h2>${escapeHtml(state.rewardMonth)} helpful contributor award</h2>
        <p class="muted">A simple monthly competition: members earn helpful points when the person who created a post marks their reply as useful. The highest contributor can win a voucher or small workshop prize.</p>
      </div>
      <div class="reward-prize">
        <span class="badge">Prize idea</span>
        <strong>${escapeHtml(state.rewardPrize)}</strong>
        <p>Other options: material voucher, CAD review session, 3D print credit, tooling voucher or featured member spotlight.</p>
      </div>
    </section>
    <section class="section-card section-amber">
      <div class="list-title"><div><h2>How points work</h2><p>Kept simple so it is fair and easy to moderate.</p></div></div>
      <div class="reward-rules">
        <article><strong>+1 helpful point</strong><span>Post owner marks a member reply as helpful.</span></article>
        <article><strong>+2 support points</strong><span>Useful project upload or quote opportunity added.</span></article>
        <article><strong>Manual review</strong><span>JP Innovation can remove points if someone games the system.</span></article>
        <article><strong>Monthly reset</strong><span>Winner is chosen each month, with lifetime reputation kept separately.</span></article>
      </div>
    </section>
    <section class="section-card section-amber">
      <div class="list-title"><div><h2>Leaderboard</h2><p>Helpful contribution points for this month.</p></div></div>
      <div class="leaderboard">
        ${leaders.map((member, index) => `
          <article class="leader-row">
            <span>${index + 1}</span>
            <div>
              <strong>${escapeHtml(member.name)} ${reputationBadge(member, { compact: true })}</strong>
              <small>${escapeHtml(member.business || member.skill || "Innovation Hub member")}</small>
            </div>
            <b>${member.helpfulPoints || 0} pts</b>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderProfile(user) {
  const reputation = reputationStatusCopy(user);
  const reviews = approvedReviewsFor(user);
  return `
    <section class="section-card section-blue profile-reputation-card ${escapeHtml(reputation.tier)}">
      <div class="profile-reputation-heading"><div>${reputationBadge(user)}<p class="eyebrow">Member reputation</p><h2>${escapeHtml(reputation.title)}</h2><p>${escapeHtml(reputation.detail)}</p></div></div>
      <div class="reputation-progress-grid">
        <article><div><strong>Contribution points</strong><span>${reputation.points} / ${goldPointsTarget}</span></div><progress value="${reputation.points}" max="${goldPointsTarget}"></progress></article>
        <article><div><strong>Approved positive reviews</strong><span>${reputation.positive} / ${goldPositiveReviewsTarget}</span></div><progress value="${reputation.positive}" max="${goldPositiveReviewsTarget}"></progress></article>
      </div>
      <p class="muted reputation-rule">Blue Verified requires active paid membership and JP Innovation vetting. Gold requires Blue status plus either ${goldPointsTarget} points or ${goldPositiveReviewsTarget} approved reviews rated 4–5 stars.</p>
    </section>
    <section class="section-card section-silver">
      <div class="list-title">
        <div><h2>My profile</h2><p>Keep this complete for verification and quote opportunities.</p></div>
        <span class="pill good">${escapeHtml(user.level)}</span>
      </div>
      <div class="profile-photo-manager">
        <div class="profile-photo-preview">
          ${profileAvatarMarkup(user, "profile-photo-large")}
        </div>
        <div>
          <h3>Profile photo</h3>
          <p class="muted">${user.profilePhotoStatus === "pending" ? "Your new photo is waiting for JP Innovation approval before it appears publicly." : user.profilePhotoStatus === "approved" ? "Your approved photo is visible on your Hub profile and member activity." : "Upload a clear photo or logo for JP Innovation to verify before it appears publicly."}</p>
          ${user.profilePhotoPendingUrl ? `<div class="profile-photo-pending"><img src="${escapeHtml(user.profilePhotoPendingUrl)}" alt="Pending profile photo preview"><span class="pill warn">Pending approval</span></div>` : ""}
          <label class="secondary-button profile-photo-upload">Upload photo for approval <input id="profilePhotoInput" type="file" accept="image/png,image/jpeg,image/webp"></label>
          <p id="profilePhotoStatus" class="form-status" aria-live="polite"></p>
        </div>
      </div>
      <form id="profileForm" class="form-grid two">
        <label>Name <input name="name" value="${escapeHtml(user.name)}" required></label>
        <label>Business <input name="business" value="${escapeHtml(user.business)}"></label>
        <label>Location <input name="location" value="${escapeHtml(user.location)}"></label>
        <label>Skills <input name="skill" value="${escapeHtml(user.skill)}"></label>
        <label class="wide">Equipment <input name="equipment" value="${escapeHtml(user.equipment)}"></label>
        <label class="wide">Portfolio link <input name="portfolio" value="${escapeHtml(user.portfolio)}"></label>
        <label>Preferred work <input name="preferredWork" value="${escapeHtml(user.preferredWork || "")}"></label>
        <label>Current capacity <input name="capacity" value="${escapeHtml(user.capacity || "")}"></label>
        <label class="wide">Hub goals <textarea name="profileGoals" rows="3">${escapeHtml(user.profileGoals || "")}</textarea></label>
        <label class="wide">Bio <textarea name="bio" rows="4">${escapeHtml(user.bio)}</textarea></label>
        <label class="check wide"><input name="directoryVisible" type="checkbox" ${user.directoryVisible ? "checked" : ""}> Show my profile in the member directory</label>
        <button class="primary-button wide" type="submit">Save profile</button>
      </form>
    </section>
    <section class="section-card section-silver">
      <h2>Verification and reputation</h2>
      <div class="metrics-grid">
        ${metric("Status", user.level)}
        ${metric("Points", user.points)}
        ${metric("Badge", reputation.tier === "admin" ? "JP Admin" : reputation.tier === "gold" ? "Gold Trusted" : reputation.tier === "blue" ? "Blue Verified" : "Member")}
        ${metric("Reviews", reviews.length)}
        ${metric("Profile", `${profileCompletion(user)}%`)}
        ${metric("Warnings", user.warning ? "1" : "0")}
      </div>
    </section>
  `;
}

function renderSettings(user) {
  const isClient = isClientPortalContext(user);
  return `
    <section class="section-card section-silver">
      <h2>Settings</h2>
      <p class="muted">Your account, messages, board posts, projects, events, resources and quote requests use the secure shared service. Personal display preferences remain on this device.</p>
      <div class="cards-grid">
        <article class="card"><span class="badge">Account plan</span><h3>${isClient ? "Client Portal" : "Innovation Hub"}</h3><p>${isClient ? "Free access for quotes, requests and direct communication with JP Innovation." : "GBP 19/month Innovation Hub membership. Billing begins only when JP Innovation confirms activation."}</p></article>
        <article class="card"><span class="badge">Alerts</span><h3>Notifications</h3><p>Choose which Hub activity appears in your notification centre using the preferences below.</p></article>
        <article class="card"><span class="badge">Security</span><h3>Password</h3><p>Change your password here, request a recovery email or sign out any other active devices.</p></article>
        <article class="card"><span class="badge">Account</span><h3>${escapeHtml(user.email)}</h3><p>Your ${isClient ? "quote requests" : "board posts, projects and quote requests"} follow this secure login across devices.</p></article>
      </div>
    </section>
    <section class="section-card section-blue account-security-section">
      <div class="list-title"><div><h2>Account security</h2><p>Manage the password and signed-in devices for ${escapeHtml(user.email)}.</p></div></div>
      <form id="changePasswordForm" class="form-grid two" autocomplete="off">
        <label>New password <input name="password" type="password" minlength="8" required autocomplete="new-password"></label>
        <label>Confirm password <input name="confirmPassword" type="password" minlength="8" required autocomplete="new-password"></label>
        <button class="primary-button" type="submit">Change password</button>
        <button id="requestSettingsPasswordReset" class="secondary-button" type="button">Email me a reset link</button>
        <button id="signOutOtherDevices" class="secondary-button wide" type="button">Sign out other devices</button>
        <p id="accountSecurityStatus" class="form-status wide" aria-live="polite"></p>
      </form>
    </section>
    <section class="section-card section-silver">
      <div class="list-title"><div><h2>Device data backup</h2><p>Export locally saved preferences, drafts and non-secure working notes before changing browser.</p></div></div>
      <div class="trial-data-actions">
        <button id="exportDataButton" class="secondary-button" type="button">Export device data</button>
        <label class="secondary-button import-data-button">Import device data <input id="importDataInput" type="file" accept="application/json"></label>
      </div>
      <p id="dataStatus" class="form-status" aria-live="polite"></p>
    </section>
    <section class="section-card section-silver">
      <div class="list-title"><div><h2>Preferences</h2><p>Choose what this account should receive once live notifications are connected.</p></div></div>
      <form id="settingsForm" class="form-grid two">
        <label class="check wide"><input name="quoteAlerts" type="checkbox" ${user.quoteAlerts !== false ? "checked" : ""}> ${isClient ? "Quote and project updates" : "Quote Hub opportunities"}</label>
        <label class="check wide"><input name="messageAlerts" type="checkbox" ${user.messageAlerts !== false ? "checked" : ""}> Message alerts</label>
        ${isClient ? "" : `<label class="check wide"><input name="eventAlerts" type="checkbox" ${user.eventAlerts !== false ? "checked" : ""}> Event and workshop updates</label>
        <label class="check wide"><input name="directoryVisible" type="checkbox" ${user.directoryVisible ? "checked" : ""}> Show profile in member directory</label>`}
        <button class="primary-button wide" type="submit">Save preferences</button>
        <p id="settingsStatus" class="form-status wide" aria-live="polite"></p>
      </form>
    </section>
    <section class="section-card section-blue">
      <div class="list-title"><div><h2>Phone alerts</h2><p>Allow JP Innovation to show mobile notifications for admin tasks, messages and items needing attention.</p></div><span class="pill">${escapeHtml(pushPermissionLabel())}</span></div>
      <div class="cards-grid">
        <article class="card"><span class="badge">Mobile</span><h3>JP notification badge</h3><p>Alerts use the JP app icon so they appear like a proper phone notification from the site.</p></article>
        <article class="card"><span class="badge">iPhone note</span><h3>Add to Home Screen first</h3><p>Apple only allows website push notifications after the site has been saved as an app from Safari.</p></article>
      </div>
      <div class="trial-data-actions">
        <button id="enablePhoneAlerts" class="primary-button" type="button">Enable phone alerts</button>
        <button id="testPhoneAlert" class="secondary-button" type="button">Send test alert</button>
      </div>
      <p id="phoneAlertStatus" class="form-status" aria-live="polite">No notification prompt will appear until you press Enable phone alerts.</p>
    </section>
  `;
}

function secureProfileUser(profile) {
  const role = profile.account_type || "client";
  return {
    id: profile.user_id,
    email: String(profile.email || "").toLowerCase(),
    name: profile.full_name || String(profile.email || "Account").split("@")[0],
    business: profile.business || "",
    role,
    membershipStatus: profile.membership_status || (role === "client" ? "free" : "active"),
    level: role === "admin" ? "JP Admin" : (role === "member" ? "Innovation Hub member" : "Client Portal"),
    vetted: Boolean(profile.vetted_at),
    reputationPoints: Number(profile.reputation_points || 0),
    verified: role === "admin" || (role === "member" && profile.membership_status === "active" && Boolean(profile.vetted_at)),
    suspended: profile.membership_status === "suspended",
    onboardingComplete: role !== "member"
  };
}

function secureProfileApplication(profile) {
  return {
    id: `secure-${profile.user_id}`,
    userId: profile.user_id,
    secure: true,
    fullName: profile.full_name || String(profile.email || "Applicant").split("@")[0],
    business: profile.business || "",
    email: String(profile.email || "").toLowerCase(),
    membershipType: "Innovation Hub access",
    status: "pending",
    created: "Live registration",
    message: "This registered account is waiting for paid Innovation Hub approval.",
    wantsCommunity: true,
    wantsQuotes: true,
    wantsDirectory: false,
    events: false,
    partner: false
  };
}

async function loadSecureAdminProfiles(force = false) {
  if (!portalBackend || currentUser()?.role !== "admin") return;
  if (adminProfilesStatus === "loading" || (adminProfilesStatus === "ready" && !force)) return;
  adminProfilesStatus = "loading";
  adminProfilesMessage = "Loading registrations and account access from the secure database...";
  const { data, error } = await portalBackend
    .from("profiles")
    .select("user_id,email,full_name,business,account_type,membership_status,vetted_at,reputation_points")
    .order("email", { ascending: true });
  if (error) {
    adminProfilesStatus = "error";
    adminProfilesMessage = "Live account permissions still need enabling in Supabase. The admin setup script must be run before launch.";
  } else {
    secureAdminProfiles = Array.isArray(data) ? data : [];
    adminProfilesStatus = "ready";
    adminProfilesMessage = `${secureAdminProfiles.length} registered account${secureAdminProfiles.length === 1 ? "" : "s"} loaded from Supabase. Approvals made here change real Hub access.`;
    secureAdminProfiles.forEach((profile) => {
      const secureUser = secureProfileUser(profile);
      const existing = state.users.find((item) => item.email === secureUser.email);
      if (existing) Object.assign(existing, secureUser);
      else state.users.push(secureUser);
    });
    saveState();
  }
  if (currentView === "admin") renderView("admin");
}

async function updateSecureProfileAccess(userId, changes) {
  if (!portalBackend || !userId) throw new Error("This account is not connected to a live profile yet.");
  const { error } = await portalBackend.from("profiles").update(changes).eq("user_id", userId);
  if (error) throw error;
  const profile = secureAdminProfiles.find((item) => item.user_id === userId);
  if (profile) Object.assign(profile, changes);
}

function renderAdmin(user) {
  if (user.role !== "admin") return `<section class="section-card"><h2>Not available</h2><p class="muted">Admin review is only visible to JP Innovation admins.</p></section>`;
  const flagged = [...state.posts.filter((post) => post.flagged || post.reports > 0), ...state.flagged];
  const moderationPosts = state.posts.filter((post) => post.moderationStatus === "pending" || post.flagged || post.reports > 0);
  const approvedPosts = state.posts.filter((post) => post.moderationStatus === "approved")
    .sort((a, b) => String(b.approvedAt || b.createdAt || "").localeCompare(String(a.approvedAt || a.createdAt || "")));
  const moderationReplies = state.posts.flatMap((post) => (post.responses || []).filter((reply) => reply.moderationStatus === "pending").map((reply) => ({ post, reply })));
  const moderationProjects = state.projects.filter((project) => project.moderationStatus === "pending");
  const pendingMemberReviews = (state.memberReviews || []).filter((review) => review.moderationStatus === "pending");
  const photoApprovals = pendingProfilePhotos();
  const applications = adminProfilesStatus === "ready"
    ? secureAdminProfiles.filter((profile) => profile.membership_status === "pending").map(secureProfileApplication)
    : (state.applications || []).filter((application) => !application.example && application.created !== "Example");
  const pendingApplications = applications.filter((application) => application.status === "pending").length;
  const suspendedAccounts = (adminProfilesStatus === "ready" ? secureAdminProfiles.map(secureProfileUser) : state.users).filter((item) => item.suspended).length;
  const openAdminQuotes = state.quotes.filter((quote) => quote.status !== "closed").length;
  return `
    <section class="section-card section-violet admin-control-hero">
      <p class="eyebrow">Private administration</p>
      <h2>Admin control centre</h2>
      <p class="muted">Everything requiring admin attention is summarised here. Open a section only when you need its controls.</p>
      <div class="metrics-grid">
        ${metric("Access requests", pendingApplications)}
        ${metric("Post reviews", moderationPosts.length + moderationReplies.length)}
        ${metric("Project reviews", moderationProjects.length)}
        ${metric("Member reviews", pendingMemberReviews.length)}
        ${metric("Photo reviews", photoApprovals.length)}
        ${metric("Quote reviews", state.quotes.filter((quote) => quote.status === "jp-review").length)}
        ${metric("Suspended", suspendedAccounts)}
      </div>
    </section>
    <section class="section-card admin-live-status ${adminProfilesStatus === "ready" ? "section-lime" : "section-amber"}">
      <div class="list-title">
        <div><h2>Live account control</h2><p>${escapeHtml(adminProfilesMessage)}</p></div>
        <span class="pill ${adminProfilesStatus === "ready" ? "good" : "warn"}">${adminProfilesStatus === "ready" ? "Live" : "Checking"}</span>
      </div>
      <button id="refreshAdminProfiles" class="secondary-button" type="button">Refresh registrations</button>
    </section>
    <details class="section-card admin-fold section-blue">
      <summary class="list-title"><div><h2>Website analytics</h2><p>Private views, visitors and device information.</p></div></summary>
      <div id="analyticsPanel">
        <p class="muted">Loading private site analytics...</p>
      </div>
    </details>
    <details id="adminAccessRequests" class="section-card admin-fold section-violet" ${pendingApplications ? "open" : ""}>
      <summary class="list-title"><div><h2>Access applications</h2><p>Approve or reject Innovation Hub access.</p></div><span class="pill warn">${pendingApplications} pending</span></summary>
      <div class="application-list">
        ${applications.length ? applications.map((application) => `
          <article class="application-card ${escapeHtml(application.status)}">
            <div class="application-head">
              <div>
                <span class="badge">${escapeHtml(application.membershipType || "Professional member")}</span>
                <h3>${escapeHtml(application.fullName || "Unnamed applicant")}</h3>
                <p>${escapeHtml(application.business || "Independent applicant")} - ${escapeHtml(application.email || "No email")}</p>
              </div>
              <span class="pill ${applicationStatusPill(application.status)}">${escapeHtml(applicationStatusLabel(application.status))}</span>
            </div>
            <div class="application-detail-grid">
              <div><strong>Phone</strong><span>${escapeHtml(application.phone || "Not supplied")}</span></div>
              <div><strong>Location</strong><span>${escapeHtml(application.location || "Not supplied")}</span></div>
              <div><strong>Skill</strong><span>${escapeHtml(application.skill || "Not supplied")}</span></div>
              <div><strong>Experience</strong><span>${escapeHtml(application.experience || "Not supplied")}</span></div>
              <div><strong>Availability</strong><span>${escapeHtml(application.availability || "Not supplied")}</span></div>
              <div><strong>Equipment</strong><span>${escapeHtml(application.equipment || "Not supplied")}</span></div>
            </div>
            <div class="application-notes">
              <p><strong>Can offer:</strong> ${escapeHtml(application.offer || "Not supplied")}</p>
              <p><strong>Looking for:</strong> ${escapeHtml(application.support || "Not supplied")}</p>
              <p><strong>Message:</strong> ${escapeHtml(application.message || "No message")}</p>
              ${application.portfolio ? `<p><strong>Portfolio:</strong> ${escapeHtml(application.portfolio)}</p>` : ""}
              ${application.social ? `<p><strong>Social proof:</strong> ${escapeHtml(application.social)}</p>` : ""}
              ${application.generatedPassword ? `<p class="temporary-password"><strong>Temporary password:</strong> ${escapeHtml(application.generatedPassword)}</p>` : ""}
            </div>
            <div class="meta-row">
              <span class="pill">${application.wantsCommunity ? "Discussions" : "No discussions"}</span>
              <span class="pill">${application.wantsQuotes ? "Quote Hub" : "No Quote Hub"}</span>
              <span class="pill">${application.wantsDirectory ? "Directory listing" : "No directory"}</span>
              <span class="pill">${application.events ? "Event host" : "No events"}</span>
              <span class="pill ${application.partner ? "good" : ""}">${application.partner ? "Partner interest" : "Standard member"}</span>
            </div>
            <div class="admin-actions">
              ${application.secure ? "" : `<button class="secondary-button application-action" data-application-action="contacted" data-id="${escapeHtml(application.id)}" type="button">Mark contacted</button>`}
              <button class="secondary-button application-action" data-application-action="approve" data-id="${escapeHtml(application.id)}" type="button" ${application.status === "approved" ? "disabled" : ""}>${application.secure ? "Approve Hub access" : "Approve & create login"}</button>
              <button class="secondary-button application-action danger-action" data-application-action="reject" data-id="${escapeHtml(application.id)}" type="button">Reject</button>
              ${application.secure ? "" : `<button class="secondary-button application-action danger-action" data-application-action="delete" data-id="${escapeHtml(application.id)}" type="button">Delete</button>`}
            </div>
          </article>
        `).join("") : `<p class="muted">No access requests yet.</p>`}
      </div>
    </details>
    <details id="adminMemberReviews" class="section-card admin-fold section-blue" ${pendingMemberReviews.length ? "open" : ""}>
      <summary class="list-title"><div><h2>Member reviews</h2><p>Approve both the rating and written comment before it affects reputation.</p></div><span class="pill ${pendingMemberReviews.length ? "warn" : "good"}">${pendingMemberReviews.length}</span></summary>
      <div class="member-review-admin-list">${pendingMemberReviews.length ? pendingMemberReviews.map((review) => `
        <article class="member-review-admin-card">
          <div><span class="review-stars" aria-label="${review.rating} out of 5 stars">${"&#9733;".repeat(review.rating)}${"&#9734;".repeat(5 - review.rating)}</span><h3>${escapeHtml(review.reviewerName)} reviewed ${escapeHtml(review.reviewedName)}</h3><p>${escapeHtml(review.comment)}</p><small>Submitted ${escapeHtml(review.created)}</small></div>
          <div class="admin-actions"><button class="primary-button review-moderation-action" data-review-action="approved" data-review-id="${escapeHtml(review.id)}" type="button">Approve review</button><button class="secondary-button review-moderation-action danger-action" data-review-action="rejected" data-review-id="${escapeHtml(review.id)}" type="button">Reject</button></div>
        </article>`).join("") : `<p class="muted">No member reviews are waiting for approval.</p>`}</div>
    </details>
    <details id="adminProfilePhotos" class="section-card admin-fold section-cyan" ${photoApprovals.length ? "open" : ""}>
      <summary class="list-title"><div><h2>Profile photo approvals</h2><p>Approve member photos before they appear on profiles, posts and the directory.</p></div><span class="pill ${photoApprovals.length ? "warn" : "good"}">${photoApprovals.length}</span></summary>
      <div class="profile-photo-admin-list">
        ${photoApprovals.length ? photoApprovals.map((member) => `
          <article class="profile-photo-admin-card">
            <img src="${escapeHtml(member.profilePhotoPendingUrl)}" alt="${escapeHtml(member.name)} pending profile photo">
            <div>
              <span class="badge">${escapeHtml(roleLabel(member))}</span>
              <h3>${escapeHtml(member.name)}</h3>
              <p>${escapeHtml(member.business || "Independent member")} &middot; ${escapeHtml(member.email)}</p>
              <small>Submitted ${escapeHtml(member.profilePhotoSubmittedAt ? formatBoardDate(member.profilePhotoSubmittedAt) : "recently")}</small>
            </div>
            <div class="admin-actions">
              <button class="primary-button profile-photo-action" data-photo-action="approve" data-email="${escapeHtml(member.email)}" type="button">Approve photo</button>
              <button class="secondary-button profile-photo-action danger-action" data-photo-action="reject" data-email="${escapeHtml(member.email)}" type="button">Reject</button>
            </div>
          </article>`).join("") : `<p class="muted">No profile photos are waiting for approval.</p>`}
      </div>
    </details>
    <details id="adminPostModeration" class="section-card admin-fold section-rose" ${moderationPosts.length ? "open" : ""}>
      <summary class="list-title"><div><h2>Post moderation</h2><p>Approve, reject or review reported posts.</p></div><span class="pill ${moderationPosts.length ? "warn" : "good"}">${moderationPosts.length}</span></summary>
      <div class="feed-list">${moderationPosts.length ? moderationPosts.map((item) => `
        <article class="feed-item">
          <span class="pill warn">${item.moderationStatus === "pending" ? "Awaiting approval" : "Reported"}</span>
          <h3>${escapeHtml(item.title || "Flagged content")}</h3>
          ${renderFormattedPostText(item.description || item.reason || "")}
          <div class="admin-actions">
            <button class="primary-button post-moderation-action" data-post-action="approved" data-post-id="${escapeHtml(item.id)}" type="button">Approve</button>
            <button class="secondary-button post-moderation-action danger-action" data-post-action="rejected" data-post-id="${escapeHtml(item.id)}" type="button">Reject</button>
          </div>
        </article>`).join("") : `<p class="muted">No flagged content right now.</p>`}
      </div>
    </details>
    <details id="adminApprovedPosts" class="section-card admin-fold section-lime">
      <summary class="list-title"><div><h2>Approved Posts</h2><p>Published discussion history, kept separate from pending moderation.</p></div><span class="pill good">${approvedPosts.length}</span></summary>
      <div class="approved-post-list">
        ${approvedPosts.length ? approvedPosts.map((post) => `
          <article class="approved-post-row">
            <div>
              <span class="badge">Published</span>
              <h3>${escapeHtml(post.title)}</h3>
              <p>${escapeHtml(post.author)} &middot; submitted ${escapeHtml(post.created || "Date unavailable")}</p>
            </div>
            <div class="approved-post-meta">
              <span><small>Approved</small><strong>${escapeHtml(post.approvedAt ? formatBoardDate(post.approvedAt) : "Previously approved")}</strong></span>
              <span><small>Approved by</small><strong>${escapeHtml(post.approvedBy || "JP Innovation admin")}</strong></span>
              <span><small>Status</small><strong>Approved / Published</strong></span>
            </div>
            <button class="secondary-button open-board-post" data-post-id="${escapeHtml(post.id)}" type="button">Open live discussion</button>
          </article>`).join("") : `<p class="muted">No approved posts yet.</p>`}
      </div>
    </details>
    <details id="adminReplyModeration" class="section-card admin-fold section-blue" ${moderationReplies.length ? "open" : ""}>
      <summary class="list-title"><div><h2>Reply moderation</h2><p>Approve replies before they appear to other members.</p></div><span class="pill ${moderationReplies.length ? "warn" : "good"}">${moderationReplies.length}</span></summary>
      <div class="feed-list">${moderationReplies.length ? moderationReplies.map(({ post, reply }) => `
        <article class="feed-item">
          <span class="pill warn">Awaiting approval</span>
          <h3>${escapeHtml(post.title)}</h3>
          <div class="reply-author"><strong>${escapeHtml(reply.author)}</strong></div>
          ${renderFormattedPostText(reply.body)}
          <div class="admin-actions">
            <button class="primary-button reply-moderation-action" data-reply-action="approved" data-post-id="${escapeHtml(post.id)}" data-reply-id="${escapeHtml(reply.id)}" type="button">Approve</button>
            <button class="secondary-button reply-moderation-action danger-action" data-reply-action="rejected" data-post-id="${escapeHtml(post.id)}" data-reply-id="${escapeHtml(reply.id)}" type="button">Reject</button>
            <button class="secondary-button open-admin-thread" data-post-id="${escapeHtml(post.id)}" type="button">Open thread</button>
          </div>
        </article>`).join("") : `<p class="muted">No replies waiting for approval.</p>`}
      </div>
    </details>
    <details id="adminProjectModeration" class="section-card admin-fold section-teal" ${moderationProjects.length ? "open" : ""}>
      <summary class="list-title"><div><h2>Project moderation</h2><p>Approve or reject member project submissions.</p></div><span class="pill ${moderationProjects.length ? "warn" : "good"}">${moderationProjects.length}</span></summary>
      <div class="feed-list">${moderationProjects.length ? moderationProjects.map((item) => `
        <article class="feed-item">
          <span class="pill warn">Awaiting approval</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
          <div class="admin-actions">
            <button class="primary-button project-moderation-action" data-project-action="approved" data-project-id="${escapeHtml(item.id)}" type="button">Approve</button>
            <button class="secondary-button project-moderation-action danger-action" data-project-action="rejected" data-project-id="${escapeHtml(item.id)}" type="button">Reject</button>
          </div>
        </article>`).join("") : `<p class="muted">No project submissions waiting.</p>`}
      </div>
    </details>
    <details class="section-card admin-fold section-amber">
      <summary class="list-title"><div><h2>Launch checklist</h2><p>Track remaining launch work.</p></div></summary>
      <div class="launch-checklist">
        ${(state.launchChecklist || []).map((item) => `
          <article class="launch-item">
            <div>
              <span class="badge">${escapeHtml(item.area)}</span>
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.detail)}</p>
              <span class="pill ${launchPillClass(item.status)}">${escapeHtml(launchStatusLabel(item.status))}</span>
            </div>
            <div class="launch-actions">
              <button class="secondary-button launch-action" data-launch-action="ready" data-id="${escapeHtml(item.id)}" type="button">Ready</button>
              <button class="secondary-button launch-action" data-launch-action="in-progress" data-id="${escapeHtml(item.id)}" type="button">In progress</button>
              <button class="secondary-button launch-action" data-launch-action="needs-backend" data-id="${escapeHtml(item.id)}" type="button">Needs backend</button>
            </div>
          </article>
        `).join("")}
      </div>
    </details>
    <details id="adminQuoteQueue" class="section-card admin-fold section-violet">
      <summary class="list-title"><div><h2>Quote queue</h2><p>Review and control private quote requests.</p></div><span class="pill">${openAdminQuotes} open</span></summary>
      <div class="quote-admin-queue">
        ${state.quotes.map((quote) => `
          <article class="quote-queue-row">
            <div>
              <span class="badge">${escapeHtml(quoteStatusLabel(quote.status))}</span>
              <h3>${escapeHtml(quote.service)}</h3>
              <p>${escapeHtml(quote.location || "Location open")} - ${escapeHtml(quote.deadline || "Deadline TBC")} - ${quote.responses.length} private responses</p>
            </div>
            <div class="quote-admin-actions">
              <button class="secondary-button quote-action" data-quote-action="jp-review" data-id="${escapeHtml(quote.id)}" type="button">JP Review</button>
              <button class="secondary-button quote-action" data-quote-action="open" data-id="${escapeHtml(quote.id)}" type="button">Open</button>
              <button class="secondary-button quote-action" data-quote-action="shortlisted" data-id="${escapeHtml(quote.id)}" type="button">Shortlist</button>
              <button class="secondary-button quote-action" data-quote-action="closed" data-id="${escapeHtml(quote.id)}" type="button">Close</button>
            </div>
          </article>
        `).join("") || `<p class="muted">No quote requests yet.</p>`}
      </div>
    </details>
    <details class="section-card admin-fold section-lime">
      <summary class="list-title"><div><h2>Account management</h2><p>Upgrade, verify or suspend registered accounts.</p></div></summary>
      <div class="feed-list">
        ${(adminProfilesStatus === "ready" ? secureAdminProfiles.map(secureProfileUser) : state.users).map((member) => `
          <article class="feed-item admin-member-row">
            <div>
              <span class="badge">${escapeHtml(roleLabel(member))}</span>
              <div class="member-name-with-badge"><h3>${escapeHtml(member.name)}</h3>${reputationBadge(member)}</div>
              <p>${escapeHtml(member.business || "Independent member")} - ${escapeHtml(member.email)}</p>
              <div class="meta-row">
                <span class="pill ${memberReputationTier(member) !== "none" ? "good" : "warn"}">${memberReputationTier(member) === "admin" ? "JP Admin" : memberReputationTier(member) === "gold" ? "Gold Trusted" : memberReputationTier(member) === "blue" ? "Blue Verified" : "Pending vetting"}</span>
                <span class="pill ${member.suspended ? "danger" : ""}">${member.suspended ? "Suspended" : "Active"}</span>
                <span class="pill ${member.warning ? "warn" : ""}">${member.warning ? "Warned" : "No warning"}</span>
              </div>
            </div>
            <div class="admin-actions">
              ${member.role === "client" ? `<button class="primary-button admin-action" data-admin-action="upgrade" data-email="${escapeHtml(member.email)}" type="button">Upgrade to Innovation Hub</button>` : ""}
              ${member.role === "member" ? `<button class="secondary-button admin-action" data-admin-action="downgrade" data-email="${escapeHtml(member.email)}" type="button">Move to Client Portal</button>` : ""}
              <button class="secondary-button admin-action" data-admin-action="verify" data-email="${escapeHtml(member.email)}" data-user-id="${escapeHtml(member.id || "")}" type="button">Verify</button>
              <button class="secondary-button admin-action" data-admin-action="warn" data-email="${escapeHtml(member.email)}" type="button">Warn</button>
              <button class="secondary-button admin-action" data-admin-action="${member.suspended ? "restore" : "suspend"}" data-email="${escapeHtml(member.email)}" type="button">${member.suspended ? "Restore" : "Suspend"}</button>
              ${member.role === "admin" ? "" : `<button class="secondary-button admin-action danger-action" data-admin-action="remove" data-email="${escapeHtml(member.email)}" type="button">Remove</button>`}
            </div>
          </article>
        `).join("") || `<p class="muted">No member accounts have been created yet.</p>`}
      </div>
    </details>
  `;
}

function postPurposeBadge(post, helpfulCount = 0) {
  if (helpfulCount) return `<span class="pill good">${helpfulCount} helpful</span>`;
  if (post.postType === "needs-help") return `<span class="pill warn">Needs help</span>`;
  return `<span class="pill">${escapeHtml(boardPostTypeLabel(post.postType))}</span>`;
}

function postCard(post) {
  const user = currentUser();
  const postAuthor = memberForIdentity({ id: post.authorId, email: post.authorEmail, name: post.author });
  const isOwner = user?.id === post.authorId || user?.email === post.authorEmail || user?.role === "admin";
  const replies = visibleBoardReplies(post, user);
  const helpfulCount = countHelpfulReplies(post);
  return `
    <article class="feed-item thread-card" id="post-${escapeHtml(post.id)}">
      <div class="thread-topline">
        ${post.isPinned ? `<span class="pill pinned">Pinned</span>` : ""}
        <span class="badge">${escapeHtml(post.category)}</span>
        ${post.moderationStatus !== "approved" ? `<span class="pill warn">${post.moderationStatus === "rejected" ? "Not approved" : "Awaiting approval"}</span>` : ""}
        ${postPurposeBadge(post, helpfulCount)}
      </div>
      <h3>${escapeHtml(post.title)}</h3>
      ${renderFormattedPostText(post.description)}
      <div class="meta-row">
        <span class="pill author-reputation">${escapeHtml(post.author)} ${reputationBadge(postAuthor, { compact: true })}</span>
        <span class="pill">${escapeHtml(post.created || "Today")}</span>
        <span class="pill">${replies.length} replies</span>
        ${post.flagged ? `<span class="pill warn">Flagged</span>` : ""}
      </div>
      ${user?.role === "admin" ? `<div class="admin-actions thread-pin-actions"><button class="secondary-button board-pin-action" data-post-id="${escapeHtml(post.id)}" data-pin-action="${post.isPinned ? "unpin" : "pin"}" type="button">${post.isPinned ? "Unpin from top" : "Pin to top"}</button></div>` : ""}
      ${user?.role === "admin" && post.moderationStatus !== "approved" ? `<div class="admin-actions thread-moderation-actions"><button class="primary-button post-moderation-action" data-post-action="approved" data-post-id="${escapeHtml(post.id)}" type="button">Approve and publish</button><button class="secondary-button post-moderation-action danger-action" data-post-action="rejected" data-post-id="${escapeHtml(post.id)}" type="button">Reject</button></div>` : ""}
      ${replies.length ? `
        <div class="reply-list">
          ${replies.map((reply) => {
            const replyAuthor = memberForIdentity({ id: reply.authorId, email: reply.authorEmail, name: reply.author });
            return `
            <div class="reply-card" id="reply-${escapeHtml(reply.id)}">
              <div class="reply-author"><strong>${escapeHtml(reply.author)}</strong>${reputationBadge(replyAuthor, { compact: true })}</div>
              ${renderFormattedPostText(reply.body)}
              <div class="meta-row">
                <span class="pill ${reply.moderationStatus === "approved" ? (reply.helpful ? "good" : "") : "warn"}">${reply.moderationStatus === "approved" ? (reply.helpful ? "Marked helpful" : "Published reply") : reply.moderationStatus === "rejected" ? "Not approved" : "Awaiting approval"}</span>
                ${reply.helpful || !isOwner || reply.authorId === post.authorId || reply.authorEmail === post.authorEmail ? "" : `<button class="secondary-button helpful-button" data-post-id="${post.id}" data-reply-id="${reply.id}" type="button">Mark helpful</button>`}
                ${user?.role === "admin" && reply.moderationStatus === "pending" ? `<button class="primary-button reply-moderation-action" data-reply-action="approved" data-post-id="${escapeHtml(post.id)}" data-reply-id="${escapeHtml(reply.id)}" type="button">Approve reply</button><button class="secondary-button reply-moderation-action danger-action" data-reply-action="rejected" data-post-id="${escapeHtml(post.id)}" data-reply-id="${escapeHtml(reply.id)}" type="button">Reject</button>` : ""}
                ${(user?.id === reply.authorId || user?.email === reply.authorEmail || user?.role === "admin") ? `<details class="inline-edit"><summary>Edit reply</summary><form class="edit-reply-form" data-post-id="${escapeHtml(post.id)}" data-reply-id="${escapeHtml(reply.id)}"><div class="formatted-text-editor">${formattingToolbar("Format reply")}<textarea name="body" rows="4" required>${escapeHtml(reply.body)}</textarea></div><div class="card-actions"><button class="secondary-button" type="submit">Save reply</button><button class="secondary-button delete-reply-button" data-post-id="${escapeHtml(post.id)}" data-reply-id="${escapeHtml(reply.id)}" type="button">Delete reply</button></div></form></details>` : ""}
              </div>
            </div>`;
          }).join("")}
        </div>
      ` : ""}
      ${post.moderationStatus === "approved" || user?.role === "admin" ? `<form class="reply-form" data-post-id="${post.id}">
        <div class="formatted-text-editor"><label>Reply with advice, a recommendation or a question</label>${formattingToolbar("Format reply")}<textarea name="body" rows="4" required placeholder="Add useful feedback..."></textarea></div>
        <button class="secondary-button" type="submit">Submit reply for approval</button>
      </form>` : `<p class="muted">Replies open after JP Innovation approves this post.</p>`}
      <button class="secondary-button report-button" data-id="${post.id}" type="button">Report post</button>
      ${isOwner ? `<details class="post-edit-panel"><summary>Edit post</summary><form class="edit-post-form form-grid two" data-post-id="${escapeHtml(post.id)}"><label>Title <input name="title" value="${escapeHtml(post.title)}" required></label><label>Category <select name="category">${boardCategories.map((category) => `<option value="${escapeHtml(category)}" ${category === post.category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}</select></label><label>Post type <select name="postType">${boardPostTypeOptions(post.postType)}</select></label><div class="wide formatted-text-editor"><label>Description</label>${formattingToolbar("Format post")}<textarea name="description" rows="6" required>${escapeHtml(post.description)}</textarea></div><button class="primary-button" type="submit">Save changes</button><button class="secondary-button delete-item-button" data-delete-type="post" data-id="${escapeHtml(post.id)}" type="button">Delete post</button></form></details>` : ""}
    </article>
  `;
}

function postSummaryCard(post) {
  const replies = visibleBoardReplies(post);
  const helpfulCount = countHelpfulReplies(post);
  const postAuthor = memberForIdentity({ id: post.authorId, email: post.authorEmail, name: post.author });
  const preview = String(post.description || "").replace(/\s+/g, " ").trim();
  return `
    <button class="board-thread-row board-thread-row-wide open-board-post" data-post-id="${escapeHtml(post.id)}" type="button">
      <span class="thread-bubble" aria-hidden="true">&#128172;</span>
      <span class="thread-row-copy">
        <strong>${post.isPinned ? `<span class="thread-pin-marker">Pinned</span> ` : ""}${escapeHtml(post.title)}</strong>
        <span class="thread-row-preview">${escapeHtml(preview.slice(0, 150))}${preview.length > 150 ? "&hellip;" : ""}</span>
        <small>${escapeHtml(post.category)} &middot; ${escapeHtml(post.author)} ${reputationBadge(postAuthor, { compact: true })} &middot; ${escapeHtml(post.created || "Today")}</small>
      </span>
      <span class="thread-row-count">${replies.length} ${replies.length === 1 ? "reply" : "replies"}</span>
      ${postPurposeBadge(post, helpfulCount)}
      ${post.isPinned ? `<span class="pill pinned">Pinned</span>` : ""}
      <span class="pill ${post.moderationStatus === "approved" ? "good" : "warn"}">${post.moderationStatus === "approved" ? "Published" : post.moderationStatus === "rejected" ? "Rejected" : "Pending"}</span>
      <span aria-hidden="true">&rsaquo;</span>
    </button>
  `;
}

function projectCard(project) {
  const user = currentUser();
  const canDelete = user?.role === "admin" || user?.email === project.authorEmail;
  return `
    <article class="feed-item">
      ${project.image ? `<img class="post-image" src="${escapeHtml(project.image)}" alt="">` : ""}
      <span class="badge">${escapeHtml(project.category)}</span>
      ${project.moderationStatus !== "approved" ? `<span class="pill warn">${project.moderationStatus === "rejected" ? "Not approved" : "Awaiting approval"}</span>` : ""}
      <h3>${escapeHtml(project.title)}</h3>
      <p>${escapeHtml(project.description)}</p>
      <div class="meta-row">
        <span class="pill">${escapeHtml(project.author)}</span>
        <span class="pill">${escapeHtml(project.location)}</span>
        <span class="pill ${projectStatusPill(project.status)}">${escapeHtml(project.status)}</span>
        <span class="pill">${project.likes} likes</span>
        <span class="pill">${(project.discussion || []).length || project.comments} comments</span>
        <span class="pill">${project.points} pts</span>
      </div>
      <div class="card-actions">
        <button class="secondary-button project-open-button" data-project-id="${escapeHtml(project.id)}" type="button">Open project</button>
        ${canDelete ? `<button class="secondary-button delete-item-button" data-delete-type="project" data-id="${escapeHtml(project.id)}" type="button">Delete</button>` : ""}
      </div>
    </article>
  `;
}

function quoteCard(quote) {
  const user = currentUser();
  const isAdmin = user?.role === "admin";
  const isOwner = user?.email === quote.authorEmail;
  const canSeeResponses = isAdmin || isOwner;
  const currentStep = quoteStepNumber(quote.status);
  return `
    <article class="quote-card quote-workflow-card">
      <div class="quote-card-head">
        <div>
          <span class="badge">${escapeHtml(quoteStatusLabel(quote.status))}</span>
          <h3>${escapeHtml(quote.service)}</h3>
        </div>
        <div class="quote-privacy-badge">
          <strong>${escapeHtml(quote.visibility || "Private")}</strong>
          <small>Blind supplier pricing</small>
        </div>
      </div>
      <div class="quote-card-body">
        <div>
          <p>${escapeHtml(quote.description)}</p>
          <div class="meta-row">
            <span class="pill">${escapeHtml(quote.location || "Location open")}</span>
            <span class="pill">${escapeHtml(quote.deadline || "Deadline TBC")}</span>
            <span class="pill">${escapeHtml(quote.material || "Material TBC")}</span>
            <span class="pill">${escapeHtml(quote.quantity || "Quantity TBC")}</span>
            <span class="pill">${quote.jpFirst ? "JP first refusal" : "Network release"}</span>
            <span class="pill">${quote.responses.length} private responses</span>
          </div>
        </div>
        <div class="quote-mini-status">
          <span>${currentStep}/4</span>
          <strong>${escapeHtml(quoteStatusLabel(quote.status))}</strong>
          <small>${escapeHtml(quoteStatusDetail(quote.status))}</small>
        </div>
      </div>
      <div class="quote-card-steps" aria-label="Quote progress">
        ${["jp-review", "open", "shortlisted", "closed"].map((status, index) => `
          <span class="${index + 1 <= currentStep ? "active" : ""}">${index + 1}</span>
        `).join("")}
      </div>
      <div class="meta-row">
        ${quote.outcome ? `<span class="pill">${escapeHtml(quote.outcome)}</span>` : ""}
        ${quote.tolerance ? `<span class="pill">${escapeHtml(quote.tolerance)}</span>` : ""}
      </div>
      <div class="quote-detail-grid quote-detail-grid-four">
        <div><strong>Budget</strong><span>${escapeHtml(quote.budget || "Open")}</span></div>
        <div><strong>Files</strong><span>${escapeHtml(quote.files || "Not attached")}</span></div>
        <div><strong>Submitted by</strong><span>${escapeHtml(quote.author || "Customer")}</span></div>
        <div><strong>Response model</strong><span>Private to customer and JP</span></div>
      </div>
      ${canSeeResponses ? `
        <div class="private-response-list">
          <h4>Private responses</h4>
          ${quote.responses.length ? quote.responses.map((response) => `
            <article>
              <div>
                <strong>${escapeHtml(response.provider)}</strong>
                <span>${escapeHtml(response.leadTime || "Lead time TBC")}</span>
              </div>
              <b>${escapeHtml(response.price || "Private")}</b>
              ${response.availability ? `<small>${escapeHtml(response.availability)}</small>` : ""}
              ${response.assumptions ? `<em>${escapeHtml(response.assumptions)}</em>` : ""}
              <p>${escapeHtml(response.notes || "")}</p>
            </article>
          `).join("") : `<p class="muted">No responses yet.</p>`}
        </div>
      ` : `<p class="private-note">Responses are hidden from other providers.</p>`}
      ${isAdmin ? `
        <div class="quote-admin-actions">
          <button class="secondary-button quote-action" data-quote-action="jp-review" data-id="${escapeHtml(quote.id)}" type="button">JP Review</button>
          <button class="secondary-button quote-action" data-quote-action="open" data-id="${escapeHtml(quote.id)}" type="button">Open</button>
          <button class="secondary-button quote-action" data-quote-action="shortlisted" data-id="${escapeHtml(quote.id)}" type="button">Shortlist</button>
          <button class="secondary-button quote-action" data-quote-action="closed" data-id="${escapeHtml(quote.id)}" type="button">Close</button>
          <button class="secondary-button delete-item-button" data-delete-type="quote" data-id="${escapeHtml(quote.id)}" type="button">Delete</button>
        </div>
      ` : (isOwner ? `<div class="quote-admin-actions"><button class="secondary-button repeat-quote-button" data-id="${escapeHtml(quote.id)}" type="button">Request follow-on work</button></div>` : "")}
    </article>
  `;
}

function quoteStepNumber(status) {
  return {
    "jp-review": 1,
    open: 2,
    shortlisted: 3,
    closed: 4
  }[status] || 1;
}

function quoteStatusDetail(status) {
  const details = {
    draft: "Not visible to members yet",
    "jp-review": "JP checks scope before release",
    open: "Approved members can respond",
    shortlisted: "Customer is comparing privately",
    closed: "Awarded, cancelled or archived"
  };
  return details[status] || "Awaiting review";
}

function quoteStatusLabel(status) {
  const labels = {
    draft: "Draft",
    "jp-review": "JP review",
    open: "Open to quote",
    shortlisted: "Shortlisted",
    closed: "Closed"
  };
  return labels[status] || "JP review";
}

function projectStatusPill(status = "") {
  const normalised = status.toLowerCase();
  if (normalised.includes("complete")) return "good";
  if (normalised.includes("progress")) return "";
  if (normalised.includes("planning") || normalised.includes("concept")) return "warn";
  return "";
}

function launchStatusLabel(status) {
  const labels = {
    ready: "Ready for front-end review",
    "in-progress": "In progress",
    "needs-backend": "Needs live backend"
  };
  return labels[status] || "In progress";
}

function launchPillClass(status) {
  if (status === "ready") return "good";
  if (status === "needs-backend") return "warn";
  return "";
}

function applicationStatusLabel(status) {
  const labels = {
    pending: "Pending review",
    contacted: "Contacted",
    approved: "Approved",
    rejected: "Rejected"
  };
  return labels[status] || "Pending review";
}

function applicationStatusPill(status) {
  if (status === "approved") return "good";
  if (status === "rejected") return "danger";
  if (status === "contacted") return "";
  return "warn";
}

function memberCard(member) {
  const viewer = currentUser();
  const reviews = approvedReviewsFor(member);
  const canReview = viewer?.id && member.id && viewer.id !== member.id && ["member", "admin"].includes(viewer.role);
  const reviewSummary = reviews.length
    ? `${Number(member.averageRating || (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length)).toFixed(1)} / 5 from ${reviews.length} approved review${reviews.length === 1 ? "" : "s"}`
    : "No approved reviews yet";
  return `
    <article class="member-card">
      <div class="member-card-head">
        ${profileAvatarMarkup(member, "profile-avatar")}
        <div>
          <span class="badge">${escapeHtml(member.level)}</span>
          <div class="member-name-with-badge"><h3>${escapeHtml(member.name)}</h3>${reputationBadge(member)}</div>
        </div>
      </div>
      <p><strong>${escapeHtml(member.business || "Independent member")}</strong></p>
      <p>${escapeHtml(member.bio || "")}</p>
      <div class="tag-row">
        <span class="pill">${escapeHtml(member.location || "Location TBC")}</span>
        <span class="pill">${escapeHtml(member.skill || "General")}</span>
        <span class="pill">${escapeHtml(member.equipment || "Equipment TBC")}</span>
        <span class="pill">${escapeHtml(member.preferredWork || "Open to help")}</span>
        <span class="pill">${escapeHtml(member.capacity || "Capacity TBC")}</span>
        <span class="pill ${memberReputationTier(member) !== "none" ? "good" : ""}">${memberReputationTier(member) === "admin" ? "JP Admin" : memberReputationTier(member) === "gold" ? "Gold Trusted" : memberReputationTier(member) === "blue" ? "Blue Verified" : "Member"}</span>
        <span class="pill">${Number(member.reputationPoints ?? member.points ?? 0)} pts</span>
        <span class="pill">${escapeHtml(reviewSummary)}</span>
      </div>
      <div class="card-actions"><button class="secondary-button message-member-button" data-member-email="${escapeHtml(member.email || "")}" type="button">Message</button></div>
      ${reviews.length ? `<details class="member-review-history"><summary>Approved reviews (${reviews.length})</summary><div class="member-review-list">${reviews.map((review) => `<article><span class="review-stars" aria-label="${review.rating} out of 5 stars">${"&#9733;".repeat(review.rating)}${"&#9734;".repeat(5 - review.rating)}</span><p>${escapeHtml(review.comment)}</p><small>${escapeHtml(review.reviewerName)} &middot; ${escapeHtml(review.created)}</small></article>`).join("")}</div></details>` : ""}
      ${canReview ? `<details class="member-review-panel"><summary>Leave or update a review</summary><form class="member-review-form" data-reviewed-id="${escapeHtml(member.id)}"><label>Rating <select name="rating" required><option value="">Choose</option><option value="5">5 - Excellent</option><option value="4">4 - Positive</option><option value="3">3 - Satisfactory</option><option value="2">2 - Needs improvement</option><option value="1">1 - Poor</option></select></label><label>Review comment <textarea name="comment" minlength="20" maxlength="2000" rows="3" required placeholder="Describe the work, communication and outcome..."></textarea></label><button class="secondary-button" type="submit">Submit for approval</button><p class="form-status review-form-status" aria-live="polite"></p></form></details>` : ""}
    </article>
  `;
}

function option(value) {
  return `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
}

function bindViewHandlers(view) {
  if (view === "onboarding") {
    $("#onboardingForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const user = currentUser();
      Object.assign(user, formObject(event.currentTarget));
      user.onboardingComplete = true;
      syncMember(user);
      saveState();
      $("#onboardingStatus").textContent = "Setup saved. Your member profile is ready.";
      setTimeout(() => {
        currentView = "dashboard";
        setLoggedInView();
      }, 500);
    });
  }
  if (view === "boards") {
    $("#postForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const user = currentUser();
      const data = formObject(event.currentTarget);
      const status = $("#postStatus");
      if (status) status.textContent = "Publishing post...";
      try {
        const newPost = await createBoardPostRecord(data, user);
        state.posts.unshift(newPost);
        if (newPost.flagged) state.flagged.unshift({ title: data.title, description: data.description, reason: "Automatic moderation keyword flag" });
        saveState();
        event.currentTarget.reset();
        if (status) {
          status.classList.add("success");
          status.innerHTML = "<strong>Post submitted successfully.</strong><br>Your post is now awaiting admin approval.";
        }
        showSuccessToast("Post submitted successfully.", "Your post is now awaiting admin approval.");
        renderNotifications();
        window.setTimeout(() => {
          activeBoardCategory = data.category;
          renderView("boards");
        }, 1400);
      } catch (error) {
        if (status) status.textContent = error.message || "The post could not be published.";
      }
    });
    bindReports();
    bindHelpfulButtons();
    bindReplyForms();
    bindPostModerationActions();
    bindBoardPinActions();
    bindReplyModerationActions();
    bindBoardFilters();
    bindOpenBoardPosts();
    bindBoardCategoryButtons();
    bindBoardEditForms();
    bindTextFormattingTools();
    $(".board-back-button")?.addEventListener("click", () => {
      activeBoardPostId = "";
      renderView("boards");
      window.setTimeout(() => window.scrollTo({ top: boardListScrollY, left: 0, behavior: "auto" }), 0);
    });
    $(".board-all-button")?.addEventListener("click", () => {
      activeBoardCategory = "";
      activeBoardPostId = "";
      renderView("boards");
    });
    $(".board-all-posts")?.addEventListener("click", () => {
      personalBoardMode = false;
      activeBoardCategory = "";
      activeBoardPostId = "";
      renderView("boards");
    });
    $(".open-general-chat")?.addEventListener("click", () => {
      activeBoardCategory = "General Chat";
      renderView("boards");
    });
  }
  if (view === "dashboard" || view === "notifications") {
    bindDashboardLinks();
  }
  if (view === "dashboard") {
    bindHubSearch();
  }
  if (view === "projects") {
    $("#projectForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const user = currentUser();
      const data = formObject(event.currentTarget);
      const localProject = {
        id: uid("project"),
        title: data.title,
        category: data.category,
        description: data.description,
        location: data.location,
        status: data.status,
        author: user.name,
        authorEmail: user.email,
        moderationStatus: "pending",
        example: false,
        image: "",
        likes: 0,
        comments: 0,
        points: 10,
        nextStep: "Add the first project milestone",
        parts: [],
        updates: [
          { id: uid("update"), title: "Project created", body: data.description, created: "Just now" }
        ],
        discussion: []
      };
      try {
        const secureProject = await createSecureProject(data, user);
        state.projects.unshift(secureProject || localProject);
      } catch (error) {
        window.alert(error.message || "The project could not be submitted.");
        return;
      }
      state.activeProjectId = state.projects[0].id;
      saveState();
      renderNotifications();
      renderView("projects");
    });
    bindProjectDetail();
    bindClientProjectActions();
  }
  if (view === "quotes") {
    $(".quote-all-button")?.addEventListener("click", () => {
      personalQuotesMode = false;
      renderView("quotes");
    });
    $("#quoteForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const user = currentUser();
      const data = formObject(event.currentTarget);
      const localQuote = {
        id: uid("quote"),
        service: data.service,
        location: data.location,
        material: data.material,
        quantity: data.quantity,
        budget: data.budget,
        deadline: data.deadline,
        outcome: data.outcome,
        tolerance: data.tolerance,
        description: data.description,
        files: data.files || "No files noted",
        jpFirst: data.jpFirst,
        status: "jp-review",
        created: "Just now",
        visibility: "Private",
        author: user.name,
        authorEmail: user.email,
        responses: [],
        example: false
      };
      try {
        const secureQuote = await createSecureQuote(data, user);
        state.quotes.unshift(secureQuote || localQuote);
      } catch (error) {
        window.alert(error.message || "The quote request could not be submitted.");
        return;
      }
      saveState();
      renderNotifications();
      renderView("quotes");
    });
    $("#quoteResponseForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const user = currentUser();
      const data = formObject(event.currentTarget);
      const quote = state.quotes.find((item) => item.id === data.requestId);
      if (!quote) return;
      const localResponse = {
        provider: user.name,
        providerEmail: user.email,
        price: data.price,
        leadTime: data.leadTime,
        assumptions: data.assumptions,
        availability: data.availability,
        notes: data.notes,
        status: "submitted",
        created: "Just now"
      };
      try {
        const secureResponse = await createSecureQuoteResponse(quote, data, user);
        quote.responses.push(secureResponse || localResponse);
      } catch (error) {
        window.alert(error.message || "The private quote could not be submitted.");
        return;
      }
      saveState();
      renderView("quotes");
    });
    bindQuoteActions();
    bindOpenBoardPosts();
    bindQuoteJumps();
    bindRepeatWorkActions();
  }
  if (view === "directory") bindDirectory();
  if (view === "resources") {
    bindResourceTools();
    bindResourceDownloads();
    $("#resourceForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = formObject(event.currentTarget);
      const user = currentUser();
      try {
        const secureResource = await createSecureResource(data, user);
        state.resources.unshift(secureResource || {
          id: uid("resource"), type: data.type, title: data.title.trim(), detail: data.detail.trim(), example: false
        });
      } catch (error) {
        window.alert(error.message || "The resource could not be added.");
        return;
      }
      saveState();
      renderView("resources");
    });
  }
  if (view === "events") {
    $("#eventForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = formObject(event.currentTarget);
      const user = currentUser();
      try {
        const secureEvent = await createSecureEvent(data, user);
        state.events.unshift(secureEvent || {
          id: uid("event"), title: data.title.trim(), date: data.date.trim(),
          location: data.location.trim(), type: data.type, interested: [], example: false
        });
      } catch (error) {
        window.alert(error.message || "The event could not be added.");
        return;
      }
      saveState();
      renderView("events");
    });
    $all(".event-interest-button").forEach((button) => button.addEventListener("click", async () => {
      const item = state.events.find((event) => event.id === button.dataset.eventId);
      const user = currentUser();
      if (!item || !user) return;
      item.interested = item.interested || [];
      try {
        const synced = await toggleSecureEventInterest(item, user);
        if (!synced) {
          item.interested = item.interested.includes(user.id)
            ? item.interested.filter((entry) => entry !== user.id)
            : [...item.interested, user.id];
        }
      } catch (error) {
        window.alert(error.message || "Your event interest could not be updated.");
        return;
      }
      saveState();
      renderView("events");
    }));
  }
  if (view === "messages") {
    $all(".open-message-thread").forEach((button) => button.addEventListener("click", async () => {
      activeMessageConversationKey = button.dataset.conversationKey || "";
      try {
        await markSecureMessagesRead();
      } catch (error) {
        window.alert(error.message || "The conversation could not be marked as read.");
        return;
      }
      markMessagesReadLocally(currentUser());
      saveState();
      renderView("messages");
    }));
    $(".back-to-message-inbox")?.addEventListener("click", () => {
      activeMessageConversationKey = "";
      renderView("messages");
    });
    $(".mark-messages-read")?.addEventListener("click", async () => {
      const user = currentUser();
      try {
        await markSecureMessagesRead();
      } catch (error) {
        window.alert(error.message || "Messages could not be marked as read.");
        return;
      }
      markMessagesReadLocally(user);
      saveState();
      renderView("messages");
    });
    $("#messageForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = formObject(event.currentTarget);
      const user = currentUser();
      const recipientEmail = user?.role === "client" ? adminEmail : cleanEmailValue(data.toEmail || "");
      const recipient = state.members.find((member) => member.email === recipientEmail);
      try {
        const secureMessage = await createSecureMessage(data, user, recipientEmail);
        const createdMessage = secureMessage || {
          id: uid("msg"), from: data.from.trim(), subject: data.subject.trim(), body: data.body.trim(), unread: true,
          ownerEmail: user?.role === "client" ? user.email : "", senderEmail: user?.email || "", recipientEmail,
          recipientName: user?.role === "client" ? "JP Innovation" : (recipient?.name || recipientEmail),
          created: "Just now", createdAt: new Date().toISOString(), example: false
        };
        state.messages.unshift(createdMessage);
        activeMessageConversationKey = messageCounterparty(createdMessage, user).key;
      } catch (error) {
        window.alert(error.message || "The message could not be sent.");
        return;
      }
      messageDraftRecipientEmail = "";
      saveState();
      renderView("messages");
    });
  }
  if (view === "settings") {
    bindTrialDataTools();
    bindAccountSecurity();
  }
  if (view === "admin") {
    const createForm = $("#adminCreateMemberForm");
    if (createForm) {
      createForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const status = $("#adminCreateStatus");
        try {
          const member = createMemberAccount(formObject(event.currentTarget));
          status.textContent = `${member.name} can now sign in with ${member.email}.`;
          event.currentTarget.reset();
          setTimeout(() => renderView("admin"), 900);
        } catch (error) {
          status.textContent = error.message;
        }
      });
    }
    bindApplicationActions();
    bindAdminActions();
    bindPostModerationActions();
    bindBoardPinActions();
    bindReplyModerationActions();
    bindProjectModerationActions();
    bindQuoteActions();
    bindOpenBoardPosts();
    loadSiteAnalytics();
    $("#refreshAdminProfiles")?.addEventListener("click", () => loadSecureAdminProfiles(true));
    if (adminProfilesStatus === "idle") loadSecureAdminProfiles();
  }
  if (view === "profile") {
    $("#profileForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const user = currentUser();
      Object.assign(user, formObject(event.currentTarget));
      user.onboardingComplete = user.onboardingComplete || profileCompletion(user) >= 70;
      syncMember(user);
      saveState();
      setLoggedInView();
      renderView("profile");
    });
    bindProfilePhotoUpload();
  }
  if (view === "settings") {
    $("#settingsForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const user = currentUser();
      Object.assign(user, formObject(event.currentTarget));
      syncMember(user);
      saveState();
      setLoggedInView();
      $("#settingsStatus").textContent = "Preferences saved.";
    });
    bindPhoneAlertControls();
  }
  $all(".nav-link-jump").forEach((button) => button.addEventListener("click", () => renderView(button.dataset.targetView)));
  bindDeleteButtons();
}

function bindPhoneAlertControls() {
  const status = $("#phoneAlertStatus");
  $("#enablePhoneAlerts")?.addEventListener("click", async () => {
    if (!status) return;
    status.textContent = "Preparing phone alerts...";
    try {
      status.textContent = await enablePhoneNotifications();
      renderView("settings");
    } catch (error) {
      status.textContent = error.message || "Phone alerts could not be enabled on this device.";
    }
  });
  $("#testPhoneAlert")?.addEventListener("click", async () => {
    if (!status) return;
    try {
      if (!pushSupported()) throw new Error("This browser does not support website notifications.");
      if (Notification.permission !== "granted") throw new Error("Press Enable phone alerts first.");
      const registration = await registerNotificationServiceWorker();
      await registration.showNotification("JP Innovation test alert", {
        body: "This is how admin tasks, messages and Hub updates will appear.",
        icon: "/assets/jp-app-icon-192.png",
        badge: "/assets/jp-app-icon-180.png",
        tag: `jp-test-${Date.now()}`,
        data: { url: "/hub-portal/index.html?entry=hub&view=notifications" }
      });
      status.textContent = "Test alert sent to this device.";
    } catch (error) {
      status.textContent = error.message || "The test alert could not be sent.";
    }
  });
}

function bindAccountSecurity() {
  const user = currentUser();
  const status = $("#accountSecurityStatus");
  const form = $("#changePasswordForm");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = formObject(event.currentTarget);
    const password = String(data.password || "");
    const confirmPassword = String(data.confirmPassword || "");
    if (password.length < 8) {
      status.textContent = "Use a password of at least 8 characters.";
      return;
    }
    if (password !== confirmPassword) {
      status.textContent = "The two passwords do not match.";
      return;
    }
    if (!portalBackend) {
      status.textContent = "Secure password changes are temporarily unavailable. Please try again.";
      return;
    }
    status.textContent = "Updating your password...";
    const { error } = await portalBackend.auth.updateUser({ password });
    if (error) {
      status.textContent = error.message;
      return;
    }
    event.currentTarget.reset();
    status.textContent = "Password updated successfully.";
  });
  $("#requestSettingsPasswordReset")?.addEventListener("click", async () => {
    if (!portalBackend || !user?.email) {
      status.textContent = "Secure password recovery is temporarily unavailable. Please try again.";
      return;
    }
    status.textContent = "Sending your reset email...";
    const resetEntry = isClientPortalContext(user) ? "client" : "hub";
    const { error } = await portalBackend.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${publicSiteOrigin}/hub-portal/index.html?entry=${resetEntry}&signin=1&reset=1`
    });
    status.textContent = error ? error.message : `Reset email sent to ${user.email}.`;
  });
  $("#signOutOtherDevices")?.addEventListener("click", async () => {
    if (!portalBackend) {
      status.textContent = "Secure session controls are temporarily unavailable. Please try again.";
      return;
    }
    status.textContent = "Signing out other devices...";
    const { error } = await portalBackend.auth.signOut({ scope: "others" });
    status.textContent = error ? error.message : "Other devices have been signed out. This device remains signed in.";
  });
}

function bindProfilePhotoUpload() {
  const input = $("#profilePhotoInput");
  const status = $("#profilePhotoStatus");
  if (!input) return;
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    const user = currentUser();
    if (!file || !user) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      if (status) status.textContent = "Please upload a PNG, JPG or WebP image.";
      input.value = "";
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      if (status) status.textContent = "Please use an image under 2.5MB so the Hub stays quick on mobile.";
      input.value = "";
      return;
    }
    if (status) status.textContent = "Preparing photo for JP Innovation approval...";
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      user.profilePhotoPendingUrl = String(reader.result || "");
      user.profilePhotoStatus = "pending";
      user.profilePhotoSubmittedAt = new Date().toISOString();
      syncMember(user);
      saveState();
      showSuccessToast("Photo submitted for approval.", "It will appear publicly after JP Innovation verifies it.");
      renderNotifications();
      renderView("profile");
    });
    reader.addEventListener("error", () => {
      if (status) status.textContent = "That photo could not be read. Please try a different image.";
    });
    reader.readAsDataURL(file);
  });
}

function bindAdminActions() {
  $all(".launch-action").forEach((button) => {
    button.addEventListener("click", () => {
      const item = (state.launchChecklist || []).find((entry) => entry.id === button.dataset.id);
      if (!item) return;
      item.status = button.dataset.launchAction;
      saveState();
      renderView("admin");
    });
  });
  $all(".admin-action").forEach((button) => {
    button.addEventListener("click", async () => {
      const member = state.users.find((user) => user.email === button.dataset.email);
      if (!member) return;
      const action = button.dataset.adminAction;
      try {
        if (member.id && adminProfilesStatus === "ready") {
          if (action === "upgrade") await updateSecureProfileAccess(member.id, { account_type: "member", membership_status: "active", vetted_at: new Date().toISOString() });
          if (action === "downgrade") await updateSecureProfileAccess(member.id, { account_type: "client", membership_status: "free", vetted_at: null });
          if (action === "verify") await updateSecureProfileAccess(member.id, { membership_status: "active", vetted_at: new Date().toISOString() });
          if (action === "suspend") await updateSecureProfileAccess(member.id, { membership_status: "suspended" });
          if (action === "restore") await updateSecureProfileAccess(member.id, { membership_status: member.role === "client" ? "free" : "active" });
          if (action === "remove") await updateSecureProfileAccess(member.id, { account_type: "client", membership_status: "suspended" });
        }
      } catch (error) {
        adminProfilesMessage = `Account update failed: ${error.message}`;
        renderView("admin");
        return;
      }
      if (action === "upgrade") {
        member.role = "member";
        member.level = "Innovation Hub member";
        member.onboardingComplete = false;
        member.points ||= 25;
        member.vetted = true;
        member.verified = true;
        member.badgeTier = "blue";
      }
      if (action === "downgrade") {
        member.role = "client";
        member.level = "Client Portal";
        member.verified = false;
        member.vetted = false;
        member.badgeTier = "none";
        member.directoryVisible = false;
        member.onboardingComplete = true;
      }
      if (action === "verify") {
        member.verified = true;
        member.vetted = true;
        member.badgeTier = memberReputationTier(member) === "gold" ? "gold" : "blue";
        member.level = member.role === "admin" ? "JP Trusted Partner" : "Verified Professional";
        member.suspended = false;
      }
      if (action === "warn") {
        member.warning = !member.warning;
      }
      if (action === "suspend") {
        member.suspended = true;
      }
      if (action === "restore") {
        member.suspended = false;
      }
      if (action === "remove") {
        state.users = state.users.filter((user) => user.email !== member.email);
        state.members = state.members.filter((item) => item.email !== member.email);
        saveState();
        renderView("admin");
        return;
      }
      syncMember(member);
      saveState();
      renderView("admin");
    });
  });
  $all(".profile-photo-action").forEach((button) => {
    button.addEventListener("click", () => {
      const member = state.users.find((user) => user.email === button.dataset.email);
      if (!member) return;
      if (button.dataset.photoAction === "approve") {
        member.profilePhotoUrl = member.profilePhotoPendingUrl;
        member.profilePhotoPendingUrl = "";
        member.profilePhotoStatus = "approved";
        member.profilePhotoReviewedAt = new Date().toISOString();
      } else {
        member.profilePhotoPendingUrl = "";
        member.profilePhotoStatus = member.profilePhotoUrl ? "approved" : "rejected";
        member.profilePhotoReviewedAt = new Date().toISOString();
      }
      syncMember(member);
      saveState();
      renderNotifications();
      renderView("admin");
    });
  });
  $all(".review-moderation-action").forEach((button) => button.addEventListener("click", async () => {
    const nextStatus = button.dataset.reviewAction;
    try {
      await moderateMemberReview(button.dataset.reviewId, nextStatus);
      await loadSecureWorkspace();
      showSuccessToast(
        nextStatus === "approved" ? "Member review approved." : "Member review rejected.",
        nextStatus === "approved" ? "The rating and comment now contribute to the member's public reputation." : "The review remains hidden from member profiles."
      );
      renderNotifications();
      renderView("admin");
    } catch (error) {
      adminProfilesMessage = `Review moderation failed: ${error.message}`;
      renderView("admin");
    }
  }));
}

function bindPostModerationActions() {
  $all(".post-moderation-action").forEach((button) => {
    button.addEventListener("click", async () => {
      const post = state.posts.find((item) => item.id === button.dataset.postId);
      if (!post) return;
      const moderationStatus = button.dataset.postAction;
      const returnView = currentView;
      try {
        await moderateBoardPostRecord(post, moderationStatus, currentUser());
        if (boardBackendAvailable) await loadSecureBoards();
        saveState();
        renderNotifications();
        showSuccessToast(
          moderationStatus === "approved" ? "Post approved and published." : "Post status updated.",
          moderationStatus === "approved" ? "It is now visible in the live discussion feed." : "The moderation queue has refreshed."
        );
        renderView(returnView === "boards" ? "boards" : "admin");
      } catch (error) {
        adminProfilesMessage = `Post moderation failed: ${error.message}`;
        renderView("admin");
      }
    });
  });
}

function bindBoardPinActions() {
  $all(".board-pin-action").forEach((button) => {
    button.addEventListener("click", async () => {
      const user = currentUser();
      if (user?.role !== "admin") return;
      const post = state.posts.find((item) => item.id === button.dataset.postId);
      if (!post) return;
      const shouldPin = button.dataset.pinAction === "pin";
      try {
        await toggleBoardPostPinRecord(post, shouldPin);
        if (boardBackendAvailable) await loadSecureBoards();
        saveState();
        showSuccessToast(
          shouldPin ? "Post pinned." : "Post unpinned.",
          shouldPin ? "This thread now appears at the top of the board." : "This thread has returned to normal board order."
        );
        renderView(currentView);
      } catch (error) {
        window.alert(error.message || "The pinned status could not be updated.");
      }
    });
  });
}

function bindReplyModerationActions() {
  $all(".reply-moderation-action").forEach((button) => {
    button.addEventListener("click", async () => {
      const post = state.posts.find((item) => item.id === button.dataset.postId);
      const reply = post?.responses?.find((item) => item.id === button.dataset.replyId);
      if (!post || !reply) return;
      const moderationStatus = button.dataset.replyAction;
      try {
        if (boardBackendAvailable) {
          const { error } = await portalBackend.from("board_replies").update({ moderation_status: moderationStatus }).eq("id", reply.id).eq("post_id", post.id);
          if (error) throw error;
        }
        reply.moderationStatus = moderationStatus;
        if (boardBackendAvailable) await loadSecureBoards();
        saveState();
        renderNotifications();
        showSuccessToast(
          moderationStatus === "approved" ? "Reply approved." : "Reply rejected.",
          moderationStatus === "approved" ? "The reply is now visible in the discussion thread." : "The reply remains hidden from members."
        );
        renderView(currentView);
      } catch (error) {
        window.alert(error.message || "The reply moderation update failed.");
      }
    });
  });
  $all(".open-admin-thread").forEach((button) => button.addEventListener("click", () => openBoardNotification(button.dataset.postId)));
}

function bindProjectModerationActions() {
  $all(".project-moderation-action").forEach((button) => {
    button.addEventListener("click", async () => {
      const project = state.projects.find((item) => item.id === button.dataset.projectId);
      if (!project) return;
      const moderationStatus = button.dataset.projectAction;
      try {
        if (contentBackendAvailable) {
          const { error } = await portalBackend.from("hub_projects").update({ moderation_status: moderationStatus }).eq("id", project.id);
          if (error) throw error;
        }
      } catch (error) {
        adminProfilesMessage = `Project moderation failed: ${error.message}`;
        renderView("admin");
        return;
      }
      project.moderationStatus = moderationStatus;
      saveState();
      renderNotifications();
      renderView("admin");
    });
  });
}

function bindApplicationActions() {
  $all(".application-action").forEach((button) => {
    button.addEventListener("click", async () => {
      const visibleApplications = adminProfilesStatus === "ready"
        ? secureAdminProfiles.filter((profile) => profile.membership_status === "pending").map(secureProfileApplication)
        : (state.applications || []);
      const application = visibleApplications.find((item) => item.id === button.dataset.id);
      if (!application) return;
      const action = button.dataset.applicationAction;
      if (application.secure) {
        try {
          if (action === "approve") await updateSecureProfileAccess(application.userId, { account_type: "member", membership_status: "active", vetted_at: new Date().toISOString() });
          if (action === "reject") await updateSecureProfileAccess(application.userId, { account_type: "client", membership_status: "free", vetted_at: null });
          adminProfilesMessage = action === "approve" ? `${application.fullName} now has paid Innovation Hub access.` : `${application.fullName}'s Hub request was moved back to free Client Portal access. They can sign in from the Hub page to request access again later.`;
          renderView("admin");
        } catch (error) {
          adminProfilesMessage = `Access update failed: ${error.message}`;
          renderView("admin");
        }
        return;
      }
      if (action === "delete") {
        state.applications = state.applications.filter((item) => item.id !== application.id);
        saveState();
        renderView("admin");
        return;
      }
      if (action === "reject") {
        application.status = "rejected";
        application.notes = "Rejected by admin.";
      }
      if (action === "contacted") {
        application.status = "contacted";
        application.notes = "Contacted by admin.";
      }
      if (action === "approve") {
        const password = temporaryPasswordFor(application);
        const existingUser = state.users.find((user) => user.email === application.email);
        const member = existingUser || createMemberAccount({
          name: application.fullName || application.email,
          business: application.business || "",
          email: application.email,
          password,
          location: application.location || "",
          skill: application.skill || "",
          equipment: application.equipment || "",
          portfolio: application.portfolio || "",
          bio: application.offer || application.message || "",
          preferredWork: application.membershipType || "",
          capacity: application.availability || "",
          profileGoals: application.support || "",
          directoryVisible: application.wantsDirectory === true,
          quoteAlerts: application.wantsQuotes !== false,
          messageAlerts: true,
          eventAlerts: application.events === true,
          verified: true,
          vetted: true,
          badgeTier: "blue"
        });
        application.status = "approved";
        application.generatedPassword = existingUser ? "Existing login already created" : password;
        application.notes = `${member.name} login ${existingUser ? "already exists" : "created"}.`;
      }
      saveState();
      renderView("admin");
    });
  });
}

function bindQuoteActions() {
  $all(".quote-action").forEach((button) => {
    button.addEventListener("click", async () => {
      const quote = state.quotes.find((item) => item.id === button.dataset.id);
      if (!quote) return;
      const nextStatus = button.dataset.quoteAction;
      try {
        if (contentBackendAvailable) {
          const { error } = await portalBackend.from("quote_requests").update({ status: nextStatus }).eq("id", quote.id);
          if (error) throw error;
        }
      } catch (error) {
        window.alert(error.message || "The quote status could not be updated.");
        return;
      }
      quote.status = nextStatus;
      quote.visibility = quote.status === "closed" ? "Archived" : "Private";
      saveState();
      renderView(currentView);
    });
  });
}

function bindQuoteJumps() {
  $all(".quote-jump").forEach((button) => {
    button.addEventListener("click", () => {
      const target = $(`#${button.dataset.target}`);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      const firstField = target.querySelector("input, textarea, select");
      window.setTimeout(() => firstField?.focus(), 350);
    });
  });
}

function bindTrialDataTools() {
  const exportButton = $("#exportDataButton");
  const importInput = $("#importDataInput");
  const status = $("#dataStatus");
  exportButton?.addEventListener("click", () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      source: "JP Innovation Hub trial",
      state
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `jp-innovation-hub-trial-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    if (status) status.textContent = "Trial data exported.";
  });
  importInput?.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      const importedState = backup.state || backup;
      if (!importedState.users || !importedState.posts || !importedState.projects) {
        throw new Error("That file does not look like a Hub trial backup.");
      }
      localStorage.setItem(storeKey, JSON.stringify(importedState));
      if (status) status.textContent = "Trial data imported. Reloading...";
      window.setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      if (status) status.textContent = error.message;
    } finally {
      importInput.value = "";
    }
  });
}

function bindProjectDetail() {
  $all(".project-open-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeProjectId = button.dataset.projectId;
      saveState();
      renderView("projects");
    });
  });
  $all(".project-update-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const project = state.projects.find((item) => item.id === form.dataset.projectId);
      if (!project) return;
      const data = formObject(form);
      project.updates ||= [];
      try {
        const secureUpdate = await createSecureProjectUpdate(project, data, currentUser());
        project.updates.unshift(secureUpdate || { id: uid("update"), title: data.title, body: data.body, created: "Just now" });
      } catch (error) {
        window.alert(error.message || "The project update could not be added.");
        return;
      }
      project.nextStep = data.title;
      project.points = (project.points || 0) + 3;
      saveState();
      renderView("projects");
    });
  });
  $all(".project-part-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const project = state.projects.find((item) => item.id === form.dataset.projectId);
      if (!project) return;
      const data = formObject(form);
      project.parts ||= [];
      try {
        const securePart = await createSecureProjectPart(project, data, currentUser());
        project.parts.push(securePart || { id: uid("part"), name: data.name, material: data.material || "TBC", status: data.status || "Open" });
      } catch (error) {
        window.alert(error.message || "The project part could not be added.");
        return;
      }
      saveState();
      renderView("projects");
    });
  });
  $all(".project-comment-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const user = currentUser();
      const project = state.projects.find((item) => item.id === form.dataset.projectId);
      if (!project || !user) return;
      const data = formObject(form);
      project.discussion ||= [];
      try {
        const secureComment = await createSecureProjectComment(project, data, user);
        project.discussion.unshift(secureComment || { id: uid("comment"), author: user.name, body: data.body, helpful: false, created: "Just now" });
      } catch (error) {
        window.alert(error.message || "The project comment could not be added.");
        return;
      }
      project.comments = project.discussion.length;
      user.points += 1;
      syncMember(user);
      saveState();
      renderView("projects");
    });
  });
}

function bindResourceTools() {
  const formatCurrency = (value) => `GBP ${Math.max(0, Math.round(value)).toLocaleString("en-GB")}`;
  const numberValue = (id) => Number($(`#${id}`)?.value || 0);
  const updateQuote = () => {
    const total = numberValue("calcHours") * numberValue("calcRate") + numberValue("calcMaterial");
    const result = $("#quoteCalcResult");
    if (result) result.textContent = `Estimate: ${formatCurrency(total)}`;
  };
  const updatePrint = () => {
    const hours = numberValue("printWeight") / Math.max(1, numberValue("printRate"));
    const totalMinutes = Math.round(hours * 60 + numberValue("printSetup"));
    const result = $("#printCalcResult");
    if (result) result.textContent = `Estimate: ${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
  };
  const updateClearance = () => {
    const allowance = { close: 0.1, standard: 0.2, loose: 0.4 }[$("#clearanceFit")?.value] || 0.2;
    const opening = numberValue("clearanceNominal") + allowance;
    const result = $("#clearanceResult");
    if (result) result.textContent = `Suggested opening: ${opening.toFixed(1)} mm`;
  };
  const updateCuttingSpeed = () => {
    const diameter = Math.max(0.1, numberValue("cuttingDiameter"));
    const rpm = Math.round((numberValue("cuttingSpeed") * 1000) / (Math.PI * diameter));
    const result = $("#cuttingSpeedResult");
    if (result) result.textContent = `Recommended: ${rpm.toLocaleString("en-GB")} RPM`;
  };
  const updateMaterialWeight = () => {
    const kilograms = (numberValue("materialVolume") * numberValue("materialDensity")) / 1000;
    const result = $("#materialWeightResult");
    if (result) result.textContent = `Estimated weight: ${kilograms.toFixed(2)} kg`;
  };
  const updateUnitConversion = () => {
    const inches = numberValue("unitMillimetres") / 25.4;
    const result = $("#unitConversionResult");
    if (result) result.textContent = `${inches.toFixed(3)} inches`;
  };
  ["calcHours", "calcRate", "calcMaterial"].forEach((id) => $(`#${id}`)?.addEventListener("input", updateQuote));
  ["printWeight", "printRate", "printSetup"].forEach((id) => $(`#${id}`)?.addEventListener("input", updatePrint));
  ["clearanceNominal", "clearanceFit"].forEach((id) => $(`#${id}`)?.addEventListener("input", updateClearance));
  $("#clearanceFit")?.addEventListener("change", updateClearance);
  ["cuttingDiameter", "cuttingSpeed"].forEach((id) => $(`#${id}`)?.addEventListener("input", updateCuttingSpeed));
  ["materialVolume", "materialDensity"].forEach((id) => $(`#${id}`)?.addEventListener("input", updateMaterialWeight));
  $("#materialDensity")?.addEventListener("change", updateMaterialWeight);
  $("#unitMillimetres")?.addEventListener("input", updateUnitConversion);
  updateQuote();
  updatePrint();
  updateClearance();
  updateCuttingSpeed();
  updateMaterialWeight();
  updateUnitConversion();
}

function bindResourceDownloads() {
  $all(".download-resource-button").forEach((button) => button.addEventListener("click", () => {
    const resource = builtInResources().find((item) => item.key === button.dataset.resourceKey);
    if (!resource) return;
    const rows = resource.sections.map((section) => `<p><strong>${escapeHtml(section)}</strong></p><p>________________________________________________________________</p>`).join("");
    const documentHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(resource.title)}</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;color:#17202a}h1{color:#087bf0}p{line-height:1.5}</style></head><body><h1>${escapeHtml(resource.title)}</h1><p>${escapeHtml(resource.detail)}</p>${rows}</body></html>`;
    const blob = new Blob([documentHtml], { type: "application/msword" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${resource.key}.doc`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }));
}

function bindRepeatWorkActions() {
  $all(".repeat-quote-button").forEach((button) => button.addEventListener("click", () => {
    const original = state.quotes.find((quote) => quote.id === button.dataset.id);
    if (!original) return;
    if (currentView !== "quotes") renderView("quotes");
    window.setTimeout(() => {
      const form = $("#quoteForm");
      if (!form) return;
      const assign = (name, value) => { if (form.elements[name]) form.elements[name].value = value || ""; };
      assign("service", `Follow-on: ${original.service}`);
      assign("location", original.location);
      assign("material", original.material);
      assign("quantity", original.quantity);
      assign("outcome", original.outcome);
      assign("tolerance", original.tolerance);
      assign("description", `Previous request: ${original.service}\n\nWhat has changed:\n`);
      assign("files", `Reference previous request ${original.service}. Add any revised files.`);
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      form.elements.description?.focus();
    }, 50);
  }));
}

function bindClientProjectActions() {
  bindRepeatWorkActions();
  $all(".client-project-message").forEach((button) => button.addEventListener("click", () => {
    const subject = `Project update: ${button.dataset.projectTitle || "My project"}`;
    renderView("messages");
    window.setTimeout(() => {
      const form = $("#messageForm");
      if (!form) return;
      if (form.elements.subject) form.elements.subject.value = subject;
      form.elements.body?.focus();
    }, 50);
  }));
}

function bindDashboardLinks() {
  $all(".dashboard-link").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.postId) {
        openBoardNotification(button.dataset.postId, button.dataset.replyId || "");
        return;
      }
      personalBoardMode = false;
      personalQuotesMode = false;
      renderView(button.dataset.viewLink);
      const targetId = button.dataset.targetId;
      if (!targetId) return;
      window.requestAnimationFrame(() => {
        const target = document.getElementById(targetId);
        if (!target) return;
        if (target.matches("details")) target.open = true;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  });
}

function bindHubSearch() {
  const input = $("#hubSearchInput");
  const results = $("#hubSearchResults");
  if (!input || !results) return;
  const render = () => {
    const items = buildSearchResults(input.value);
    results.innerHTML = input.value.trim()
      ? (items.length ? items.map((item) => `
        <button class="search-result dashboard-link" data-view-link="${item.view}" type="button">
          <span class="badge">${escapeHtml(item.type)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.detail)}</small>
        </button>
      `).join("") : `<p class="muted">No matching results yet.</p>`)
      : `<p class="muted">Start typing to find useful help across the Hub.</p>`;
    bindDashboardLinks();
  };
  input.addEventListener("input", render);
  render();
}

function bindBoardFilters() {
  const search = $("#boardSearch");
  const category = $("#boardCategory");
  const mode = $("#boardMode");
  const results = $("#boardResults");
  if (!search || !category || !mode || !results) return;
  const render = () => {
    const term = search.value.trim().toLowerCase();
    const filtered = visibleBoardPosts().filter((post) => boardMatches(post, term, category.value, mode.value));
    results.innerHTML = filtered.length ? filtered.map(postSummaryCard).join("") : `<p class="muted">No threads match those filters.</p>`;
    bindOpenBoardPosts();
  };
  [search, category, mode].forEach((input) => input.addEventListener("input", render));
  category.addEventListener("change", render);
  mode.addEventListener("change", render);
  render();
}

function bindOpenBoardPosts() {
  $all(".open-board-post").forEach((button) => {
    button.addEventListener("click", () => {
      boardListScrollY = window.scrollY;
      activeBoardPostId = button.dataset.postId;
      renderView("boards");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function bindBoardCategoryButtons() {
  $all(".board-category-button").forEach((button) => {
    button.addEventListener("click", () => {
      activeBoardCategory = button.dataset.boardCategory;
      activeBoardPostId = "";
      renderView("boards");
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  });
}

function bindDeleteButtons() {
  $all(".delete-item-button").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        if (button.dataset.deleteType === "post") await deleteBoardPostRecord(button.dataset.id);
        else {
          if (contentBackendAvailable && button.dataset.deleteType === "project") {
            const { error } = await portalBackend.from("hub_projects").delete().eq("id", button.dataset.id);
            if (error) throw error;
          }
          if (contentBackendAvailable && button.dataset.deleteType === "quote") {
            const { error } = await portalBackend.from("quote_requests").delete().eq("id", button.dataset.id);
            if (error) throw error;
          }
          if (sharedWorkspaceBackendAvailable && button.dataset.deleteType === "resource") {
            const { error } = await portalBackend.from("hub_resources").delete().eq("id", button.dataset.id);
            if (error) throw error;
          }
          if (sharedWorkspaceBackendAvailable && button.dataset.deleteType === "event") {
            const { error } = await portalBackend.from("hub_events").delete().eq("id", button.dataset.id);
            if (error) throw error;
          }
          if (sharedWorkspaceBackendAvailable && button.dataset.deleteType === "message") {
            const { error } = await portalBackend.from("hub_messages").delete().eq("id", button.dataset.id);
            if (error) throw error;
          }
          deleteItem(button.dataset.deleteType, button.dataset.id);
        }
        saveState();
        renderView(currentView);
      } catch (error) {
        window.alert(error.message || "This item could not be deleted.");
      }
    });
  });
}

function deleteItem(type, id) {
  const removeFrom = (key) => {
    state[key] = (state[key] || []).filter((item) => item.id !== id);
  };
  if (type === "post") {
    removeFrom("posts");
    if (activeBoardPostId === id) activeBoardPostId = "";
  }
  if (type === "project") {
    removeFrom("projects");
    state.activeProjectId = state.projects[0]?.id || "";
  }
  if (type === "quote") removeFrom("quotes");
  if (type === "resource") removeFrom("resources");
  if (type === "event") removeFrom("events");
  if (type === "message") removeFrom("messages");
}

function bindReports() {
  $all(".report-button").forEach((button) => {
    button.addEventListener("click", () => {
      const post = state.posts.find((item) => item.id === button.dataset.id);
      if (!post) return;
      post.reports += 1;
      post.flagged = true;
      saveState();
      renderView(currentView);
    });
  });
}

function bindHelpfulButtons() {
  $all(".helpful-button").forEach((button) => {
    button.addEventListener("click", async () => {
      const post = state.posts.find((item) => item.id === button.dataset.postId);
      const reply = post?.responses?.find((item) => item.id === button.dataset.replyId);
      if (!post || !reply || reply.helpful) return;
      if (boardBackendAvailable) {
        const { error } = await portalBackend.rpc("mark_board_reply_helpful", { reply_uuid: reply.id });
        if (error) {
          window.alert(error.message || "The reply could not be marked helpful.");
          return;
        }
      }
      reply.helpful = true;
      state.helpfulAwards.push({
        id: uid("helpful"),
        postId: post.id,
        replyId: reply.id,
        responderEmail: reply.authorEmail,
        awardedBy: post.authorEmail,
        created: new Date().toISOString()
      });
      const member = state.members.find((item) => item.email === reply.authorEmail);
      if (member) {
        member.helpfulPoints = (member.helpfulPoints || 0) + 1;
        member.points = (member.points || 0) + 1;
        member.reputationPoints = (member.reputationPoints || 0) + 10;
        member.badgeTier = memberReputationTier(member);
      }
      const user = state.users.find((item) => item.email === reply.authorEmail);
      if (user) {
        user.helpfulPoints = (user.helpfulPoints || 0) + 1;
        user.points = (user.points || 0) + 1;
        user.reputationPoints = (user.reputationPoints || 0) + 10;
        user.badgeTier = memberReputationTier(user);
      }
      saveState();
      if (reputationBackendAvailable) await loadSecureWorkspace();
      renderView(currentView);
    });
  });
}

function bindReplyForms() {
  $all(".reply-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const user = currentUser();
      const post = state.posts.find((item) => item.id === form.dataset.postId);
      if (!user || !post) return;
      const data = formObject(form);
      const body = data.body.trim();
      if (!body) return;
      try {
        const reply = await createBoardReplyRecord(post, body, user);
        post.responses ||= [];
        post.responses.push(reply);
        user.points += 1;
        syncMember(user);
        saveState();
        renderView("boards");
      } catch (error) {
        window.alert(error.message || "The reply could not be posted.");
      }
    });
  });
}

function bindBoardEditForms() {
  $all(".edit-post-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const post = state.posts.find((item) => item.id === form.dataset.postId);
      if (!post) return;
      try {
        await updateBoardPostRecord(post, formObject(form));
        saveState();
        renderView("boards");
      } catch (error) {
        window.alert(error.message || "The post could not be updated.");
      }
    });
  });
  $all(".edit-reply-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const post = state.posts.find((item) => item.id === form.dataset.postId);
      const reply = post?.responses?.find((item) => item.id === form.dataset.replyId);
      const body = formObject(form).body.trim();
      if (!post || !reply || !body) return;
      try {
        await updateBoardReplyRecord(post, reply, body);
        saveState();
        renderView("boards");
      } catch (error) {
        window.alert(error.message || "The reply could not be updated.");
      }
    });
  });
  $all(".delete-reply-button").forEach((button) => {
    button.addEventListener("click", async () => {
      const post = state.posts.find((item) => item.id === button.dataset.postId);
      if (!post) return;
      try {
        await deleteBoardReplyRecord(post, button.dataset.replyId);
        saveState();
        renderView("boards");
      } catch (error) {
        window.alert(error.message || "The reply could not be deleted.");
      }
    });
  });
}

function bindDirectory() {
  const skill = $("#skillFilter");
  const location = $("#locationFilter");
  const verified = $("#verifiedFilter");
  const render = () => {
    const skillTerm = skill.value.trim().toLowerCase();
    const locationTerm = location.value.trim().toLowerCase();
    const verifiedOnly = verified.checked;
    const results = state.members.filter((member) => {
      const visibleMatch = member.directoryVisible !== false;
      const skillMatch = !skillTerm || member.skill.toLowerCase().includes(skillTerm);
      const locationMatch = !locationTerm || member.location.toLowerCase().includes(locationTerm);
      const verifiedMatch = !verifiedOnly || memberReputationTier(member) !== "none";
      return visibleMatch && skillMatch && locationMatch && verifiedMatch;
    });
    $("#directoryResults").innerHTML = results.length ? results.map(memberCard).join("") : `<p class="muted">No matching members found.</p>`;
    $all(".message-member-button", $("#directoryResults")).forEach((button) => button.addEventListener("click", () => {
      messageDraftRecipientEmail = button.dataset.memberEmail || "";
      activeMessageConversationKey = "";
      renderView("messages");
    }));
    bindMemberReviewForms($("#directoryResults"));
  };
  [skill, location, verified].forEach((input) => input.addEventListener("input", render));
  verified.addEventListener("change", render);
  render();
}

function bindMemberReviewForms(root = document) {
  $all(".member-review-form", root).forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = $(".review-form-status", form);
    const data = formObject(form);
    if (status) status.textContent = "Submitting review for approval...";
    try {
      await submitMemberReview(form.dataset.reviewedId, data.rating, data.comment);
      if (status) {
        status.classList.add("success");
        status.textContent = "Review submitted. JP Innovation will approve the rating and comment before it appears.";
      }
      form.reset();
      renderNotifications();
    } catch (error) {
      if (status) status.textContent = error.message || "The review could not be submitted.";
    }
  }));
}

function syncMember(user) {
  const existing = state.members.find((member) => member.email === user.email);
  const data = {
    name: user.name,
    business: user.business,
    email: user.email,
    location: user.location || "Not set",
    skill: user.skill || "General Engineering",
    equipment: user.equipment || "Not listed",
    verified: user.verified,
    vetted: user.vetted,
    badgeTier: user.badgeTier,
    reputationPoints: user.reputationPoints || 0,
    approvedPositiveReviews: user.approvedPositiveReviews || 0,
    approvedReviewCount: user.approvedReviewCount || 0,
    averageRating: user.averageRating || 0,
    level: user.level,
    points: user.points,
    helpfulPoints: user.helpfulPoints || 0,
    bio: user.bio || "Innovation Hub member.",
    preferredWork: user.preferredWork || "",
    capacity: user.capacity || "",
    profilePhotoUrl: user.profilePhotoUrl || "",
    profilePhotoPendingUrl: user.profilePhotoPendingUrl || "",
    profilePhotoStatus: user.profilePhotoStatus || "none",
    directoryVisible: user.directoryVisible === true
  };
  if (existing) Object.assign(existing, data);
  else state.members.push(data);
}

async function boot() {
  trackPageView();
  if (portalBackend) {
    portalBackend.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") openPasswordReset();
    });
  }
  try {
    await syncSecureSession();
    await loadSecureUserData();
  } catch (error) {
    state.sessionEmail = "";
    saveState();
    console.error("Secure session could not be loaded.", error);
  }
  if (entryMode === "client" && hasActiveHubAccess(currentUser()) && currentUser()?.role !== "admin") {
    window.location.replace("index.html?entry=hub");
    return;
  }
  if (entryMode === "hub" && !currentUser()) {
    window.location.replace(`../hub/index.html${signInRequested ? "?signin=1" : ""}`);
    return;
  }
  document.documentElement.classList.remove("restoring-portal-session");
  configureEntryPage();
  setupEmailFieldCleaning();
  registerNotificationServiceWorker().catch(() => {});
  $all("[data-client-feature]").forEach((button) => button.addEventListener("click", () => openClientFeature(button.dataset.clientFeature)));
  $("#closeClientFeature")?.addEventListener("click", closeClientFeature);
  $("#clientFeatureDialog")?.addEventListener("click", (event) => {
    if (event.target === $("#clientFeatureDialog")) closeClientFeature();
  });
  $("#clientFeatureSignIn")?.addEventListener("click", () => {
    closeClientFeature();
    openAuth("signin");
  });
  $all("[data-open-auth]").forEach((button) => button.addEventListener("click", () => openAuth(button.dataset.openAuth)));
  $("#closeAuth").addEventListener("click", closeAuth);
  $("#authDialog").addEventListener("click", (event) => {
    if (event.target === $("#authDialog")) closeAuth();
  });
  $("#closeUpgrade")?.addEventListener("click", closeUpgradeDialog);
  $("#upgradeDialog")?.addEventListener("click", (event) => {
    if (event.target === $("#upgradeDialog")) closeUpgradeDialog();
  });
  $all(".auth-tab").forEach((button) => button.addEventListener("click", () => setAuthTab(button.dataset.authTab)));
  $("#registerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const registerForm = event.currentTarget;
    try {
      const result = await registerUser(formObject(registerForm));
      if (result.session) {
        closeAuth();
        setLoggedInView();
      } else {
        $("#authStatus").textContent = "Account created. Check your email to verify it, then sign in.";
        if (typeof registerForm?.reset === "function") registerForm.reset();
        setAuthTab("signin");
      }
    } catch (error) {
      $("#authStatus").textContent = error.message;
    }
  });
  $("#signinForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await signIn(formObject(event.currentTarget));
      closeAuth();
      setLoggedInView();
    } catch (error) {
      $("#authStatus").textContent = error.message;
    }
  });
  $("#resetPasswordForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = formObject(event.currentTarget);
    const password = String(data.password || "");
    const confirmPassword = String(data.confirmPassword || "");
    if (password.length < 8) {
      $("#authStatus").textContent = "Use a password of at least 8 characters.";
      return;
    }
    if (password !== confirmPassword) {
      $("#authStatus").textContent = "The two passwords do not match.";
      return;
    }
    if (!portalBackend) {
      $("#authStatus").textContent = "Secure password reset is temporarily unavailable. Please try again.";
      return;
    }
    $("#authStatus").textContent = "Saving your new password...";
    const { error } = await portalBackend.auth.updateUser({ password });
    if (error) {
      $("#authStatus").textContent = error.message;
      return;
    }
    event.currentTarget.reset();
    $("#authStatus").textContent = "Password updated. You can now sign in with the new password.";
    await portalBackend.auth.signOut();
    setAuthTab("signin");
    window.history.replaceState({}, document.title, `/hub-portal/index.html?entry=${entryMode}&signin=1`);
  });
  $("#logoutButton").addEventListener("click", async () => {
    setMemberProfileMenuOpen(false);
    setMobileDashboardMenuOpen(false);
    await signOut();
  });
  $("#forgotPasswordButton")?.addEventListener("click", async () => {
    let email = "";
    try {
      email = validateEmail($("#signinEmail").value);
    } catch (error) {
      $("#authStatus").textContent = error.message;
      return;
    }
    const { error } = await portalBackend.auth.resetPasswordForEmail(email, {
      redirectTo: passwordResetRedirectUrl
    });
    $("#authStatus").textContent = error ? error.message : "Password reset email sent. Check your inbox.";
  });
  $("#resendVerificationButton")?.addEventListener("click", async () => {
    let email = "";
    try {
      email = validateEmail($("#signinEmail").value);
    } catch (error) {
      $("#authStatus").textContent = error.message;
      return;
    }
    if (!portalBackend) {
      $("#authStatus").textContent = "Secure verification is temporarily unavailable. Please try again.";
      return;
    }
    const { error } = await portalBackend.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${publicSiteOrigin}/hub-portal/index.html?entry=client&signin=1`
      }
    });
    $("#authStatus").textContent = error ? error.message : "Verification email requested. Check inbox and spam, then sign in.";
  });
  $("#mobileMenuButton")?.addEventListener("click", () => {
    const willOpen = !$("#appShell").classList.contains("mobile-menu-open");
    if (willOpen) setMemberProfileMenuOpen(false);
    setMobileDashboardMenuOpen(willOpen);
  });
  $("#mobileMenuBackdrop")?.addEventListener("click", () => setMobileDashboardMenuOpen(false));
  $("#dashboardHomeButton")?.addEventListener("click", () => {
    setNotificationsOpen(false);
    setMemberProfileMenuOpen(false);
    personalBoardMode = false;
    personalQuotesMode = false;
    renderView("dashboard");
    setMobileDashboardMenuOpen(false);
  });
  $("#memberProfileButton")?.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = !$("#memberProfileMenu")?.classList.contains("open");
    setNotificationsOpen(false);
    if (willOpen) setMobileDashboardMenuOpen(false);
    setMemberProfileMenuOpen(willOpen);
  });
  const openStatusFromHeader = (event) => {
    event.stopPropagation();
    setMemberProfileMenuOpen(false);
    setMobileDashboardMenuOpen(false);
    openReputationStatusDialog();
  };
  $("#reputationStatusButton")?.addEventListener("click", openStatusFromHeader);
  $("#memberStatusStarInline")?.addEventListener("click", openStatusFromHeader);
  $("#closeReputationStatus")?.addEventListener("click", closeReputationStatusDialog);
  $("#reputationStatusDialog")?.addEventListener("click", (event) => {
    if (event.target === $("#reputationStatusDialog")) closeReputationStatusDialog();
    if (event.target.closest?.(".reputation-open-profile")) {
      closeReputationStatusDialog();
      renderView("profile");
    }
  });
  $("#memberProfileMenu")?.addEventListener("click", (event) => event.stopPropagation());
  $all("[data-profile-view]").forEach((button) => button.addEventListener("click", () => {
    personalBoardMode = false;
    personalQuotesMode = false;
    renderView(button.dataset.profileView);
    setMemberProfileMenuOpen(false);
    setMobileDashboardMenuOpen(false);
  }));
  $all("[data-profile-action]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.profileAction;
    personalBoardMode = action === "my-posts";
    personalQuotesMode = action === "my-quotes";
    activeBoardCategory = "";
    activeBoardPostId = "";
    renderView(action === "my-posts" ? "boards" : "quotes");
    setMemberProfileMenuOpen(false);
    setMobileDashboardMenuOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }));
  $("#messageInboxButton")?.addEventListener("click", (event) => {
    event.stopPropagation();
    setNotificationsOpen(false);
    personalBoardMode = false;
    personalQuotesMode = false;
    activeMessageConversationKey = "";
    renderView("messages");
    setMemberProfileMenuOpen(false);
    setMobileDashboardMenuOpen(false);
  });
  $("#notificationBell")?.addEventListener("click", (event) => {
    event.stopPropagation();
    personalBoardMode = false;
    personalQuotesMode = false;
    renderView("notifications");
    setMemberProfileMenuOpen(false);
    setMobileDashboardMenuOpen(false);
  });
  $("#topNotificationBell")?.addEventListener("click", (event) => {
    event.stopPropagation();
    const willOpen = !$("#notificationPopover")?.classList.contains("open");
    setMemberProfileMenuOpen(false);
    setMobileDashboardMenuOpen(false);
    setNotificationsOpen(willOpen);
  });
  $("#closeNotifications")?.addEventListener("click", (event) => {
    event.stopPropagation();
    setNotificationsOpen(false);
  });
  $("#notificationPopover")?.addEventListener("click", (event) => {
    event.stopPropagation();
    const shortcut = event.target.closest?.(".notification-shortcut");
    if (!shortcut) return;
    if (shortcut.dataset.postId) {
      openBoardNotification(shortcut.dataset.postId, shortcut.dataset.replyId || "");
    } else {
      personalBoardMode = false;
      personalQuotesMode = false;
      renderView(shortcut.dataset.viewLink || "notifications");
      const targetId = shortcut.dataset.targetId;
      if (targetId) {
        window.requestAnimationFrame(() => {
          const target = document.getElementById(targetId);
          if (!target) return;
          if (target.matches("details")) target.open = true;
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
    setNotificationsOpen(false);
  });
  document.addEventListener("click", () => {
    setNotificationsOpen(false);
    setMemberProfileMenuOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setNotificationsOpen(false);
      setMemberProfileMenuOpen(false);
      setMobileDashboardMenuOpen(false);
      closeReputationStatusDialog();
    }
  });
  $all(".nav-link").forEach((button) => button.addEventListener("click", (event) => {
    event.preventDefault();
    const destination = button.dataset.view || "dashboard";
    setMemberProfileMenuOpen(false);
    setMobileDashboardMenuOpen(false);
    activeBoardPostId = "";
    activeBoardCategory = "";
    personalBoardMode = false;
    personalQuotesMode = false;
    if (destination === "messages") activeMessageConversationKey = "";
    renderView(destination);
    button.blur();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }));
  $("#applyForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = $("#applyStatus");
    try {
      const data = formObject(form);
      const application = createApplication(data);
      const subject = "JP Innovation Hub membership interest";
      const body = buildInterestEmail(data);
      const mailto = `mailto:jpinnovation.enquiries@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      status.innerHTML = `Access request saved for review. <a href="${mailto}">Send an email copy</a>`;
      form.reset();
      form.querySelector("input[name='wantsCommunity']").checked = true;
      form.querySelector("input[name='wantsQuotes']").checked = true;
      if (currentUser()?.role === "admin") renderView("admin");
      return application;
    } catch (error) {
      status.textContent = error.message;
    }
  });
  setLoggedInView();
  if (!currentUser() && hasPasswordRecoveryLink()) openPasswordReset();
  else if (!currentUser() && registerRequested) window.setTimeout(() => openAuth("register"), landingAuthDelayMs);
  else if (!currentUser() && signInRequested && !$("#upgradeDialog")?.classList.contains("open")) window.setTimeout(() => openAuth("signin"), landingAuthDelayMs);
}

boot();
