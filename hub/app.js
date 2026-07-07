const store = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const keys = {
  users: "jpiHubUsers",
  session: "jpiHubSession",
  posts: "jpiHubPosts",
  projects: "jpiHubProjects",
  quotes: "jpiHubQuotes",
  providerQuotes: "jpiHubProviderQuotes",
  applications: "jpiHubApplications",
  membershipInterest: "jpiHubMembershipInterest",
  profile: "jpiHubProfile"
};

const boards = [
  "General Engineering Chat",
  "CAD & Design",
  "3D Printing",
  "CNC & Machining",
  "Welding & Fabrication",
  "Automotive Projects",
  "Electronics & Automation",
  "Supplier Recommendations",
  "Jobs & Collaboration"
];

const seedMembers = [
  { name: "Alex Morgan", business: "Morgan Design Works", location: "Milton Keynes", skill: "CAD & Design", equipment: "SolidWorks, FDM printer", verified: true, points: 420 },
  { name: "Priya Shah", business: "Shah Automation", location: "Bedford", skill: "Electronics & Automation", equipment: "PLC test bench, soldering station", verified: true, points: 355 },
  { name: "Daniel Price", business: "Precision Fabrication MK", location: "Milton Keynes", skill: "Welding & Fabrication", equipment: "MIG/TIG, tube bender", verified: false, points: 180 },
  { name: "Sam Taylor", business: "Taylor Machining", location: "Northampton", skill: "CNC & Machining", equipment: "3-axis CNC, manual lathe", verified: true, points: 510 }
];

const events = [
  { title: "CAD Clinic Evening", date: "2026-08-12", location: "Milton Keynes", detail: "Bring a design problem and review it with other members." },
  { title: "Prototype Review Session", date: "2026-09-04", location: "Bedford", detail: "Show work-in-progress prototypes and discuss improvements." },
  { title: "Supplier Network Breakfast", date: "2026-09-25", location: "Northampton", detail: "Meet local manufacturers, fabricators and design partners." }
];

const abuseWords = ["spam", "scam", "abuse", "idiot", "hate"];
const ownerEmails = [];
const membershipPrice = "£19/month";
const postingEnabled = false;

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function currentUser() {
  const email = store.get(keys.session, null);
  return store.get(keys.users, []).find((user) => user.email === email) || null;
}

function normaliseEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function roleForEmail(email) {
  return ownerEmails.includes(normaliseEmail(email)) ? "Owner" : "Member";
}

function isAdmin(user = currentUser()) {
  return Boolean(user && (user.role === "Owner" || user.role === "Admin" || ownerEmails.includes(normaliseEmail(user.email))));
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formData(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  $all("input[type='checkbox']", form).forEach((input) => {
    data[input.name] = input.checked;
  });
  return data;
}

function moderate(text) {
  const lower = String(text || "").toLowerCase();
  return abuseWords.some((word) => lower.includes(word)) ? "flagged" : "approved";
}

function showAuth(tab = "login") {
  $("#authPanel").hidden = false;
  setAuthTab(tab);
}

function closeAuth() {
  $("#authPanel").hidden = true;
}

function shouldForceSignIn() {
  const params = new URLSearchParams(window.location.search);
  return params.has("signin") || params.has("login");
}

function signOut(openLogin = true) {
  localStorage.removeItem(keys.session);
  closeAuth();
  showMemberArea();
  if (openLogin) showAuth("login");
}

function setAuthTab(tab) {
  $all("[data-auth-tab]").forEach((button) => button.classList.toggle("active", button.dataset.authTab === tab));
  $("#loginForm").hidden = tab !== "login";
  $("#registerForm").hidden = tab !== "register";
}

function showMemberArea() {
  const user = currentUser();
  const isLoggedIn = Boolean(user);
  $all(".public-view").forEach((section) => { section.hidden = isLoggedIn; });
  $("#appShell").hidden = !isLoggedIn;
  $(".public-nav").hidden = isLoggedIn;
  if (!isLoggedIn) {
    $all(".sidebar button[data-view]").forEach((button) => button.classList.remove("active"));
    const dashboardButton = $('.sidebar button[data-view="dashboard"]');
    if (dashboardButton) dashboardButton.classList.add("active");
    $all(".view").forEach((panel) => panel.classList.remove("active"));
    const dashboard = $("#view-dashboard");
    if (dashboard) dashboard.classList.add("active");
    return;
  }

  $all('[data-view="admin"]').forEach((button) => { button.hidden = !isAdmin(user); });
  $("#memberPill").textContent = user.business ? `${user.name} | ${user.business} | ${user.role || roleForEmail(user.email)}` : `${user.name} | ${user.role || roleForEmail(user.email)}`;
  $("#welcomeTitle").textContent = `Welcome back, ${user.name}.`;
  hydrateProfile();
  updatePostingState();
  renderAll();
}

function switchView(view) {
  if (view === "admin" && !isAdmin()) {
    view = "dashboard";
  }
  $all(".sidebar button[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $all(".view").forEach((panel) => panel.classList.remove("active"));
  $(`#view-${view}`).classList.add("active");
  $("#viewTitle").textContent = $(`.sidebar button[data-view="${view}"]`).textContent;
  renderAll();
}

function seedData() {
  const users = store.get(keys.users, []);
  let changed = false;
  users.forEach((user) => {
    const role = roleForEmail(user.email);
    if (user.role !== role) {
      user.role = role;
      changed = true;
    }
  });
  if (changed) store.set(keys.users, users);

  if (!store.get(keys.posts, null)) {
    store.set(keys.posts, [
      { id: uid("post"), title: "Best way to tolerance a 3D printed fixture?", category: "3D Printing", description: "Looking for practical advice on repeatable locating features.", author: "Alex Morgan", status: "approved", reports: 0 },
      { id: uid("post"), title: "Local aluminium anodising recommendations", category: "Supplier Recommendations", description: "Any reliable suppliers around Milton Keynes or Northampton?", author: "Sam Taylor", status: "approved", reports: 0 }
    ]);
  }
  if (!store.get(keys.projects, null)) {
    store.set(keys.projects, [
      { id: uid("project"), title: "Adjustable inspection jig", category: "Fixtures", description: "Compact fixture concept for repeatable inspection checks.", location: "Milton Keynes", status: "In Progress", author: "JP Innovation", likes: 18, comments: 4, points: 90 },
      { id: uid("project"), title: "Compact linkage prototype", category: "Mechanisms", description: "Pivot alignment and spacer clearance validation before manufacture.", location: "Bedford", status: "Completed", author: "Morgan Design Works", likes: 26, comments: 7, points: 130 }
    ]);
  }
  if (!store.get(keys.quotes, null)) {
    store.set(keys.quotes, [
      { id: uid("quote"), service: "CNC prototype bracket", location: "Milton Keynes", budget: "Optional", description: "Small batch aluminium brackets for prototype validation.", deadline: "2026-08-30", jpFirst: true, author: "Example Customer" }
    ]);
  }
}

function renderBoards() {
  $("#boardGrid").innerHTML = boards.map((board) => `
    <article class="board-card">
      <span>${board}</span>
      <h3>${board}</h3>
      <p class="muted">Focused discussion, project support and supplier knowledge.</p>
    </article>
  `).join("");
  $("#postCategory").innerHTML = boards.map((board) => `<option>${board}</option>`).join("");
}

function renderPosts() {
  const posts = store.get(keys.posts, []);
  $("#postList").innerHTML = posts.map((post) => `
    <article class="list-card">
      <div class="list-meta"><span>${post.category}</span><span>${post.status}</span><span>${post.reports || 0} reports</span></div>
      <h3>${post.title}</h3>
      <p>${post.description}</p>
      <p class="muted">Posted by ${post.author}</p>
      <div class="controls">
        <button class="small-button" data-report-post="${post.id}">Report post</button>
      </div>
    </article>
  `).join("");
  $("#recentPosts").innerHTML = posts.slice(-3).reverse().map((post) => `<p><strong>${post.category}</strong> ${post.title}</p>`).join("");
  $("#flaggedPosts").innerHTML = posts.filter((post) => post.status === "flagged" || post.reports > 0).map((post) => `<p><strong>${post.title}</strong> ${post.status}, ${post.reports || 0} reports</p>`).join("") || "<p>No flagged posts.</p>";
}

function renderProjects() {
  const projects = store.get(keys.projects, []);
  $("#projectList").innerHTML = projects.map((project) => `
    <article class="list-card">
      <div class="list-meta"><span>${project.category}</span><span>${project.status}</span><span>${project.location || "Remote"}</span></div>
      <h3>${project.title}</h3>
      <p>${project.description}</p>
      <p class="muted">Author: ${project.author} | Likes: ${project.likes || 0} | Comments: ${project.comments || 0} | Points: ${project.points || 0}</p>
    </article>
  `).join("");
  $("#recentProjects").innerHTML = projects.slice(-3).reverse().map((project) => `<p><strong>${project.status}</strong> ${project.title}</p>`).join("");
}

function renderQuotes() {
  const quotes = store.get(keys.quotes, []);
  const responses = store.get(keys.providerQuotes, []);
  $("#quoteRequestSelect").innerHTML = quotes.map((quote) => `<option value="${quote.id}">${quote.service} - ${quote.location}</option>`).join("");
  $("#quoteList").innerHTML = quotes.map((quote) => {
    const count = responses.filter((response) => response.request === quote.id).length;
    return `
      <article class="list-card">
        <div class="list-meta"><span>${quote.location}</span><span>${quote.deadline || "No fixed deadline"}</span><span>${quote.jpFirst ? "JP first refusal" : "Network release"}</span></div>
        <h3>${quote.service}</h3>
        <p>${quote.description}</p>
        <p class="muted">Private responses received: ${count}</p>
      </article>
    `;
  }).join("");
  $("#recentQuotes").innerHTML = quotes.slice(-3).reverse().map((quote) => `<p><strong>${quote.location}</strong> ${quote.service}</p>`).join("");
}

function renderDirectory() {
  const filters = formData($("#directoryFilters"));
  const members = seedMembers.concat(profileAsMember()).filter(Boolean);
  const filtered = members.filter((member) => {
    const skillMatch = !filters.skill || member.skill.toLowerCase().includes(filters.skill.toLowerCase());
    const locationMatch = !filters.location || member.location.toLowerCase().includes(filters.location.toLowerCase());
    const verifiedMatch = !filters.verified || member.verified;
    return skillMatch && locationMatch && verifiedMatch;
  });

  $("#directoryList").innerHTML = filtered.map((member) => `
    <article class="member-card">
      <div><h3>${member.name}</h3>${member.verified ? "<span class='badge'>Verified</span>" : ""}</div>
      <p>${member.business}</p>
      <dl>
        <dt>Location</dt><dd>${member.location}</dd>
        <dt>Skill set</dt><dd>${member.skill}</dd>
        <dt>Equipment</dt><dd>${member.equipment}</dd>
        <dt>Reputation</dt><dd>${member.points} points</dd>
      </dl>
      <button class="small-button" type="button">Message</button>
    </article>
  `).join("");
}

function profileAsMember() {
  const profile = store.get(keys.profile, null);
  if (!profile) return null;
  return {
    name: profile.name || "My Profile",
    business: profile.business || "Independent member",
    location: profile.location || "Not set",
    skill: profile.skills || "Engineering",
    equipment: profile.equipment || "Not set",
    verified: profile.verification && profile.verification !== "Member",
    points: Number(profile.points || 0)
  };
}

function renderEvents() {
  const html = events.map((event) => `
    <article class="list-card">
      <div class="list-meta"><span>${event.date}</span><span>${event.location}</span></div>
      <h3>${event.title}</h3>
      <p>${event.detail}</p>
    </article>
  `).join("");
  $("#eventsList").innerHTML = html;
  $("#railEvents").innerHTML = events.slice(0, 2).map((event) => `<p><strong>${event.date}</strong> ${event.title}</p>`).join("");
}

function renderDashboard() {
  const posts = store.get(keys.posts, []);
  const projects = store.get(keys.projects, []);
  const quotes = store.get(keys.quotes, []);
  $("#activityFeed").innerHTML = [
    `<p><strong>${projects.length}</strong> member projects shared.</p>`,
    `<p><strong>${posts.length}</strong> engineering discussions active.</p>`,
    `<p><strong>${quotes.length}</strong> private quote requests available.</p>`,
    `<p><strong>${membershipPrice}</strong> founding member interest is open.</p>`
  ].join("");
  $("#contributors").innerHTML = seedMembers.sort((a, b) => b.points - a.points).slice(0, 4).map((member) => `<p><strong>${member.name}</strong> ${member.points} points</p>`).join("");
  $("#alertList").innerHTML = [
    "<p>New members require approval before verified badges are shown.</p>",
    "<p>Blind quote responses stay private to each provider.</p>"
  ].join("");
}

function renderAdmin() {
  const applications = store.get(keys.applications, []);
  const interests = store.get(keys.membershipInterest, []);
  const users = store.get(keys.users, []);
  $("#applicationsList").innerHTML = applications.slice(-6).reverse().map((app) => `<p><strong>${app.fullName}</strong> ${app.skill} | ${app.location}</p>`).join("") || "<p>No applications yet.</p>";
  $("#userStatusList").innerHTML = [
    ...users.map((user) => `<p><strong>${user.name}</strong> <span class="${user.status === "Suspended" ? "status-suspended" : "status-warning"}">${user.role || "Member"} | ${user.status || "Active"}</span></p>`),
    ...interests.slice(-6).reverse().map((interest) => `<p><strong>${interest.email}</strong> membership interest at ${interest.price}</p>`)
  ].join("") || "<p>No users registered.</p>";
}

function updatePostingState() {
  ["#postForm", "#projectForm", "#quoteForm", "#providerQuoteForm"].forEach((selector) => {
    const form = $(selector);
    if (!form) return;
    form.classList.toggle("is-locked", !postingEnabled);
    $all("input, textarea, select, button", form).forEach((field) => {
      field.disabled = !postingEnabled;
    });
  });
}

function renderAll() {
  renderBoards();
  renderPosts();
  renderProjects();
  renderQuotes();
  renderDirectory();
  renderEvents();
  renderDashboard();
  renderAdmin();
}

function hydrateProfile() {
  const user = currentUser();
  const existing = store.get(keys.profile, null);
  const profile = existing || {
    name: user.name,
    business: user.business,
    location: "",
    skills: "",
    equipment: "",
    portfolio: "",
    verification: "Member",
    points: 25,
    bio: "",
    badges: "New Member"
  };
  Object.entries(profile).forEach(([key, value]) => {
    const field = $(`#profileForm [name="${key}"]`);
    if (field) field.value = value;
  });
  store.set(keys.profile, profile);
}

function showInterestSentMessage() {
  const params = new URLSearchParams(window.location.search);
  const status = $("#applyStatus");
  if (params.get("interest") === "sent" && status) {
    status.textContent = "Thanks. Your interest has been sent to JP Innovation. You will receive a reply after review.";
  }
}

function registerHandlers() {
  $all("[data-open-auth]").forEach((button) => button.addEventListener("click", () => showAuth(button.dataset.openAuth)));
  $("[data-close-auth]").addEventListener("click", closeAuth);
  $all("[data-auth-tab]").forEach((button) => button.addEventListener("click", () => setAuthTab(button.dataset.authTab)));

  document.addEventListener("click", (event) => {
    const authButton = event.target.closest("[data-open-auth]");
    if (authButton) {
      event.preventDefault();
      showAuth(authButton.dataset.openAuth || "login");
      return;
    }

    if (event.target.closest("[data-close-auth]")) {
      event.preventDefault();
      closeAuth();
      return;
    }

    const authTab = event.target.closest("[data-auth-tab]");
    if (authTab) {
      event.preventDefault();
      setAuthTab(authTab.dataset.authTab || "login");
    }
  });

  $("#applyForm").addEventListener("submit", (event) => {
    const apps = store.get(keys.applications, []);
    apps.push({ id: uid("app"), ...formData(event.currentTarget), submitted: new Date().toISOString() });
    store.set(keys.applications, apps);
    $("#applyStatus").textContent = "Sending your interest to JP Innovation...";
  });

  $("#registerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    closeAuth();
    document.querySelector("#apply").scrollIntoView({ behavior: "smooth" });
  });

  $("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = formData(event.currentTarget);
    const user = store.get(keys.users, []).find((entry) => normaliseEmail(entry.email) === normaliseEmail(data.email) && entry.password === data.password);
    if (!user) {
      $("#loginStatus").textContent = "Email or password not recognised.";
      return;
    }
    if (user.status === "Suspended") {
      $("#loginStatus").textContent = "This member account is suspended.";
      return;
    }
    store.set(keys.session, normaliseEmail(user.email));
    closeAuth();
    showMemberArea();
    switchView("dashboard");
  });

  $("#logoutButton").addEventListener("click", () => {
    signOut(true);
  });

  $all("[data-logout]").forEach((button) => button.addEventListener("click", () => signOut(true)));

  $all(".sidebar button[data-view]").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));

  $("#postForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!postingEnabled) return;
    const user = currentUser();
    const data = formData(event.currentTarget);
    const posts = store.get(keys.posts, []);
    const status = moderate(`${data.title} ${data.description}`);
    posts.push({ id: uid("post"), ...data, author: user.name, status, reports: 0 });
    store.set(keys.posts, posts);
    event.currentTarget.reset();
    $("#postStatus").textContent = status === "flagged" ? "Post submitted for moderation review." : "Post published.";
    renderAll();
  });

  $("#projectForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!postingEnabled) return;
    const user = currentUser();
    const data = formData(event.currentTarget);
    const projects = store.get(keys.projects, []);
    projects.push({ id: uid("project"), ...data, author: user.name, likes: 0, comments: 0, points: 20 });
    store.set(keys.projects, projects);
    event.currentTarget.reset();
    renderAll();
  });

  $("#quoteForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!postingEnabled) return;
    const user = currentUser();
    const data = formData(event.currentTarget);
    const quotes = store.get(keys.quotes, []);
    quotes.push({ id: uid("quote"), ...data, author: user.name });
    store.set(keys.quotes, quotes);
    event.currentTarget.reset();
    renderAll();
  });

  $("#providerQuoteForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!postingEnabled) return;
    const user = currentUser();
    const data = formData(event.currentTarget);
    const responses = store.get(keys.providerQuotes, []);
    responses.push({ id: uid("provider-quote"), ...data, provider: user.name, private: true });
    store.set(keys.providerQuotes, responses);
    event.currentTarget.reset();
    renderAll();
  });

  $("#directoryFilters").addEventListener("input", renderDirectory);

  $("#profileForm").addEventListener("submit", (event) => {
    event.preventDefault();
    store.set(keys.profile, formData(event.currentTarget));
    renderAll();
    switchView("profile");
  });

  document.addEventListener("click", (event) => {
    const reportButton = event.target.closest("[data-report-post]");
    if (!reportButton) return;
    const posts = store.get(keys.posts, []);
    const post = posts.find((entry) => entry.id === reportButton.dataset.reportPost);
    if (post) {
      post.reports = (post.reports || 0) + 1;
      post.status = "flagged";
      store.set(keys.posts, posts);
      renderAll();
    }
  });
}

// These hooks are where the production version would connect payments, backend auth,
// database storage, email notifications, file uploads and stronger moderation checks.
function init() {
  seedData();
  registerHandlers();
  showInterestSentMessage();
  if (shouldForceSignIn()) {
    localStorage.removeItem(keys.session);
  }
  showMemberArea();
  if (shouldForceSignIn()) {
    showAuth("login");
  }
}

init();
