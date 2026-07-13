const storeKey = "jpHubPortal.v1";
const supabaseUrl = "https://ueqdkiwouxhhdhdmjlsl.supabase.co";
const supabasePublishableKey = "sb_publishable_nLAyyfVIBq_eM3TzZQHb-g_EV-knjl-";
const portalBackend = window.supabase?.createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
const publicSiteOrigin = "https://www.jpinnovation.co.uk";
const passwordResetRedirectUrl = `${publicSiteOrigin}/hub-portal/index.html?entry=client&signin=1&reset=1`;

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
let messageDraftRecipientEmail = "";
let boardBackendAvailable = false;
let boardBackendMessage = "Checking secure board storage...";
let contentBackendAvailable = false;
let secureAdminProfiles = [];
let adminProfilesStatus = "idle";
let adminProfilesMessage = "Connecting to live account records...";
const entryParams = new URLSearchParams(window.location.search);
const entryMode = entryParams.get("entry") === "hub" ? "hub" : "client";
const signInRequested = entryParams.get("signin") === "1";
const registerRequested = entryParams.get("register") === "1";
const requestedView = entryParams.get("view");
if (["dashboard", "onboarding", "boards", "projects", "quotes", "directory", "resources", "events", "messages", "notifications", "rewards", "profile", "settings", "admin"].includes(requestedView)) {
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

const clientViews = new Set(["dashboard", "quotes", "messages", "notifications", "profile", "settings"]);

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

function formObject(form) {
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

function boardMatches(post, term, category, mode) {
  const haystack = [
    post.title,
    post.category,
    post.description,
    post.author,
    ...(post.responses || []).flatMap((reply) => [reply.author, reply.body])
  ].join(" ").toLowerCase();
  const termMatch = !term || haystack.includes(term);
  const categoryMatch = category === "All" || post.category === category;
  const modeMatch =
    mode === "all" ||
    (mode === "unanswered" && !(post.responses || []).length) ||
    (mode === "helpful" && countHelpfulReplies(post) > 0) ||
    (mode === "needs-help" && !countHelpfulReplies(post));
  return termMatch && categoryMatch && modeMatch;
}

function buildSearchResults(term) {
  const query = term.trim().toLowerCase();
  if (!query) return [];
  const contains = (value) => String(value || "").toLowerCase().includes(query);
  return [
    ...state.posts
      .filter((post) => [post.title, post.category, post.description, post.author, ...(post.responses || []).map((reply) => reply.body)].some(contains))
      .map((post) => ({ type: "Board thread", title: post.title, detail: `${post.category} - ${post.responses?.length || 0} replies`, view: "boards" })),
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

function mapBoardPost(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.body,
    author: row.author_name || "Hub member",
    authorId: row.author_id,
    created: formatBoardDate(row.created_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reports: row.reports || 0,
    flagged: row.flagged === true,
    moderationStatus: row.moderation_status || "pending",
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
  const { data, error } = await portalBackend
    .from("board_posts")
    .select("id,title,category,body,author_id,author_name,created_at,updated_at,flagged,reports,moderation_status,board_replies(id,body,author_id,author_name,created_at,updated_at,helpful,moderation_status)")
    .order("created_at", { ascending: false });
  if (error) {
    boardBackendAvailable = false;
    boardBackendMessage = "Device-only mode until the secure Boards database is installed.";
    return false;
  }
  boardBackendAvailable = true;
  boardBackendMessage = "Live member posts are securely shared across devices.";
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
      body: data.description.trim(),
      author_id: user.id,
      author_name: user.name,
      flagged,
      moderation_status: "pending"
    }).select("id,title,category,body,author_id,author_name,created_at,updated_at,flagged,reports,moderation_status").single();
    if (error) throw error;
    return mapBoardPost({ ...row, board_replies: [] });
  }
  return {
    id: uid("post"), title: data.title, category: data.category, description: data.description,
    author: user.name, authorEmail: user.email, authorId: user.id, created: "Just now",
    reports: 0, flagged, moderationStatus: "pending", responses: []
  };
}

async function updateBoardPostRecord(post, data) {
  if (boardBackendAvailable) {
    const { error } = await portalBackend.from("board_posts").update({
      title: data.title.trim(), category: data.category, body: data.description.trim()
    }).eq("id", post.id);
    if (error) throw error;
  }
  Object.assign(post, { title: data.title.trim(), category: data.category, description: data.description.trim() });
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
    .select("user_id,email,full_name,business,account_type,membership_status")
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
    image: "../assets/case-study-fixture-bracket.png",
    imageAlt: "Manufacture-ready engineering part for a quotation",
    points: ["Submit a new request", "Review quotation details", "Keep decisions with the project"]
  },
  projects: {
    label: "Project updates",
    title: "See progress and the next action.",
    copy: "Use one private project view for agreed work, progress notes and the information JP Innovation needs from you.",
    image: "../assets/case-study-linkage-assembly.png",
    imageAlt: "Mechanical linkage project assembly",
    points: ["Current project status", "Next steps and milestones", "Technical notes in one place"]
  },
  messages: {
    label: "Direct messages",
    title: "Keep project communication easy to find.",
    copy: "Ask a question or reply to JP Innovation without losing an important decision across separate conversations.",
    image: "../assets/mechanical-assembly.jpg",
    imageAlt: "Engineering assembly discussed with JP Innovation",
    points: ["Quote questions", "Project updates", "A clear record of decisions"]
  },
  repeat: {
    label: "Repeat work",
    title: "Start revisions and follow-on work faster.",
    copy: "Return to the same account when a component changes, another version is needed or a completed job needs extending.",
    image: "../assets/retaining-bracket.jpg",
    imageAlt: "Engineered retaining bracket for repeat manufacture",
    points: ["Reference earlier work", "Request a revision", "Keep the new scope connected"]
  }
};

function openClientFeature(key) {
  const feature = clientFeaturePreviews[key];
  const dialog = $("#clientFeatureDialog");
  if (!feature || !dialog) return;
  $("#clientFeatureLabel").textContent = feature.label;
  $("#clientFeatureTitle").textContent = feature.title;
  $("#clientFeatureBody").innerHTML = `<div class="feature-preview-content"><img src="${feature.image}" alt="${feature.imageAlt}"><p>${feature.copy}</p><ul>${feature.points.map((point) => `<li>${point}</li>`).join("")}</ul></div>`;
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
  return entryMode === "hub" && user?.role === "client";
}

function isClientPortalContext(user = currentUser()) {
  // Admins always need the full Hub workspace, even when their saved session
  // was restored from the Client Portal entry URL on mobile.
  if (user?.role === "admin") return false;
  return entryMode === "client" || user?.role === "client";
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

function setLoggedInView() {
  const user = currentUser();
  const loggedIn = Boolean(user);
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
  $("#memberInitials").textContent = userInitials(user);
  $("#memberName").textContent = user.name;
  $("#memberRole").textContent = isClient ? "Client Portal" : roleLabel(user);
  $("#profileAdminLink")?.classList.toggle("hidden", user.role !== "admin" || isClient);
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
      data: { full_name: fullName },
      emailRedirectTo: `${publicSiteOrigin}/hub-portal/index.html?entry=client&signin=1`
    }
  });
  if (error) throw error;
  if (result.session) {
    const user = await syncSecureSession();
    if (entryMode === "hub" && user?.role === "client") {
      await portalBackend.rpc("request_hub_access");
      await syncSecureSession();
    }
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
  return user;
}

async function signOut() {
  if (portalBackend) await portalBackend.auth.signOut();
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
  $("#notificationCount").textContent = unread > 9 ? "9+" : String(unread);
  $("#notificationCount").classList.toggle("hidden", unread === 0);
  const profileAlertCount = $("#profileAlertCount");
  if (profileAlertCount) {
    profileAlertCount.textContent = unread > 9 ? "9+" : String(unread);
    profileAlertCount.classList.toggle("hidden", unread === 0);
  }
  renderProfileChatNotifications(items);
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
    if (pendingAccess) items.push({ title: `${pendingAccess} access request${pendingAccess === 1 ? "" : "s"}`, detail: "Approve or reject access in Admin Review.", isNew: true, view: "admin", targetId: "adminAccessRequests" });
    if (pendingPosts) items.push({ title: `${pendingPosts} post${pendingPosts === 1 ? "" : "s"} awaiting moderation`, detail: "Review posts before publication.", isNew: true, view: "admin", targetId: "adminPostModeration" });
    pendingReplies.slice(0, 5).forEach(({ post, reply }) => items.push({
      title: `New reply: ${post.title}`,
      detail: `${reply.author} submitted a reply for approval.`,
      isNew: true, view: "boards", kind: "board", postId: post.id, replyId: reply.id
    }));
    if (pendingProjects) items.push({ title: `${pendingProjects} project${pendingProjects === 1 ? "" : "s"} awaiting moderation`, detail: "Review member projects before publication.", isNew: true, view: "admin", targetId: "adminProjectModeration" });
    if (pendingQuotes) items.push({ title: `${pendingQuotes} quote request${pendingQuotes === 1 ? "" : "s"} awaiting review`, detail: "Review them in the admin quote queue.", isNew: true, view: "admin", targetId: "adminQuoteQueue" });
  } else {
    const pendingPosts = state.posts.filter((post) => post.authorEmail === user.email && post.moderationStatus === "pending").length;
    const pendingProjects = state.projects.filter((project) => project.authorEmail === user.email && project.moderationStatus === "pending").length;
    const pendingQuotes = state.quotes.filter((quote) => quote.authorEmail === user.email && quote.status === "jp-review").length;
    if (pendingPosts) items.push({ title: `${pendingPosts} post${pendingPosts === 1 ? "" : "s"} awaiting approval`, detail: "JP Innovation will publish approved posts.", isNew: true, view: "boards" });
    if (pendingProjects) items.push({ title: `${pendingProjects} project${pendingProjects === 1 ? "" : "s"} awaiting approval`, detail: "JP Innovation will publish approved projects.", isNew: true, view: "projects" });
    if (pendingQuotes) items.push({ title: `${pendingQuotes} quote request${pendingQuotes === 1 ? "" : "s"} under review`, detail: "JP Innovation is reviewing the scope.", isNew: true, view: "quotes" });
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
  const bell = $("#notificationBell");
  const popover = $("#notificationPopover");
  if (!popover || !bell) return;
  popover.classList.toggle("open", open);
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
  $all(".nav-link").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  const mount = $("#viewMount");
  mount.dataset.view = view;
  const renderers = {
    onboarding: renderOnboarding,
    dashboard: renderDashboard,
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

function prepareCompactSections(view) {
  const compactViews = new Set(["dashboard", "onboarding", "projects", "quotes", "directory", "resources", "events", "messages", "notifications", "rewards", "profile", "settings"]);
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
        ${metric("Messages", messages.length)}
        ${metric("Account plan", "Client Portal")}
      </div>
    </section>
    <section class="section-card section-violet">
      <div class="list-title"><div><h2>Client Portal tools</h2><p>Everything needed to manage work with JP Innovation without joining the paid Innovation Hub.</p></div></div>
      <div class="cards-grid">
        <article class="card"><span class="badge">Quotes</span><h3>Request engineering work</h3><p>Send specifications, follow review status and keep each request private.</p><button class="primary-button nav-link-jump" data-target-view="quotes" type="button">Open my quotes</button></article>
        <article class="card"><span class="badge">Contact</span><h3>Message JP Innovation</h3><p>Keep questions, updates and project communication together.</p><button class="secondary-button nav-link-jump" data-target-view="messages" type="button">Open messages</button></article>
        <article class="card"><span class="badge">Optional upgrade</span><h3>Innovation Hub</h3><p>Innovation Hub members also receive engineering boards, the professional directory, resources, events, rewards and supplier opportunities.</p><p class="muted">Ask JP Innovation to upgrade this same login when you are ready.</p></article>
      </div>
    </section>
  `;
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
    const { data, error } = await portalBackend
      .from("page_views")
      .select("created_at,visitor_id,page_path,device_type")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
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
        ${analyticsMetric("Today", todayRows.length, "page views")}
        ${analyticsMetric("Visitors today", uniqueToday, "anonymous devices")}
        ${analyticsMetric("Mobile views", mobileToday, "today")}
        ${analyticsMetric("Last 14 days", rows.length, "page views")}
      </div>
      <div class="feed-list analytics-feed">
        ${dailyRows.length ? renderAnalyticsRows(dailyRows) : `<p class="muted">No page views have been recorded yet.</p>`}
      </div>
    `;
  } catch (error) {
    mount.innerHTML = `
      <p class="muted">Analytics are ready in the website code, but the Supabase page_views table still needs adding.</p>
      <p class="form-status">${escapeHtml(error.message || "Database table not available yet.")}</p>
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
  if (user.role === "admin") return state.posts;
  return state.posts.filter((post) => post.moderationStatus === "approved" || post.authorId === user.id || post.authorEmail === user.email);
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
        <button class="secondary-button board-back-button" type="button">&larr; Back to ${escapeHtml(activeBoardCategory || activePost.category)}</button>
        ${postCard(activePost)}
      </section>
    `;
  }
  const unanswered = posts.filter((post) => !(post.responses || []).length).length;
  const needsHelp = posts.filter((post) => !countHelpfulReplies(post)).length;
  const helpfulReplies = posts.reduce((total, post) => total + countHelpfulReplies(post), 0);
  if (activeBoardCategory) {
    const categoryPosts = posts.filter((post) => post.category === activeBoardCategory || (activeBoardCategory === "General Chat" && post.category === "General Engineering Chat"));
    return `
      <section class="section-card section-cyan">
        <div class="board-category-header">
          <div><p class="eyebrow">Engineering Boards</p><h2>${escapeHtml(activeBoardCategory)}</h2><p class="muted">${escapeHtml(boardDescription(activeBoardCategory))}</p></div>
          <button class="secondary-button board-all-button" type="button">All boards</button>
        </div>
        <div class="meta-row"><span class="pill">${categoryPosts.length} ${categoryPosts.length === 1 ? "thread" : "threads"}</span><span class="pill ${boardBackendAvailable ? "good" : "warn"}">${escapeHtml(boardBackendMessage)}</span></div>
      </section>
      <section class="section-card section-cyan">
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
        <label>Thread title <input name="title" required placeholder="What would you like help with?"></label>
        <label>Board <select name="category">${boardCategories.map((category) => `<option value="${escapeHtml(category)}" ${category === selectedCategory ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}</select></label>
        <label class="wide">First message <textarea name="description" rows="4" required placeholder="Add the important dimensions, constraints or context..."></textarea></label>
        <button class="primary-button wide" type="submit">Submit thread for approval</button>
        <p id="postStatus" class="form-status wide" aria-live="polite"></p>
      </form>
    </details>
  `;
}

function postThreadRow(post) {
  const replies = visibleBoardReplies(post);
  return `<button class="board-thread-row open-board-post" data-post-id="${escapeHtml(post.id)}" type="button"><span class="thread-bubble" aria-hidden="true">&#128172;</span><span class="thread-row-copy"><strong>${escapeHtml(post.title)}</strong><small>${escapeHtml(post.author)} &middot; ${escapeHtml(post.created || "Today")}</small></span><span class="thread-row-count">${replies.length} ${replies.length === 1 ? "reply" : "replies"}</span>${post.moderationStatus !== "approved" ? `<span class="pill warn">Pending</span>` : ""}<span aria-hidden="true">&rsaquo;</span></button>`;
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

function renderProjectDetail(project) {
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
          <form class="project-update-form" data-project-id="${escapeHtml(project.id)}">
            <label>Update title <input name="title" required placeholder="Milestone, issue, decision..."></label>
            <label>Update notes <textarea name="body" rows="3" required></textarea></label>
            <button class="secondary-button" type="submit">Add update</button>
          </form>
        </article>
        <article class="project-panel">
          <div class="list-title"><div><h3>Parts and materials</h3><p>Keep track of what needs designing, making or sourcing.</p></div></div>
          <div class="mini-table">
            ${(project.parts || []).map((part) => `
              <div><strong>${escapeHtml(part.name)}</strong><span>${escapeHtml(part.material || "TBC")}</span><em>${escapeHtml(part.status || "Open")}</em></div>
            `).join("")}
          </div>
          <form class="project-part-form compact-form" data-project-id="${escapeHtml(project.id)}">
            <label>Part <input name="name" required></label>
            <label>Material <input name="material"></label>
            <label>Status <input name="status" placeholder="CAD, ordered, made..."></label>
            <button class="secondary-button" type="submit">Add part</button>
          </form>
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
  const visibleQuotes = state.quotes.filter((quote) => isAdmin
    || quote.authorEmail === user?.email
    || quote.status === "open"
    || quote.status === "shortlisted");
  const openQuotes = state.quotes.filter((quote) => quote.status === "open" || quote.status === "shortlisted");
  const responseCount = state.quotes.reduce((total, quote) => total + quote.responses.length, 0);
  return `
    <section class="section-card quote-hub-hero">
      <div>
        <p class="eyebrow">Flagship feature</p>
        <h2>Private Quote Hub</h2>
        <p class="muted">Customers submit one clear engineering request. JP Innovation reviews the scope, then approved members can quote privately without seeing competitor prices.</p>
        <div class="quote-hero-actions">
          <button class="primary-button quote-jump" data-target="quoteForm" type="button">Create request</button>
          <button class="secondary-button quote-jump" data-target="quoteResponseForm" type="button">Respond privately</button>
        </div>
        <div class="quote-rule-grid">
          <article><strong>Blind pricing</strong><span>Providers only see their own submitted price.</span></article>
          <article><strong>JP first review</strong><span>Poorly scoped or unsuitable work can be held back.</span></article>
          <article><strong>Customer control</strong><span>The customer compares responses privately.</span></article>
        </div>
      </div>
      <div class="quote-pipeline">
        ${quoteStage("1", "JP review", "Scope checked before release")}
        ${quoteStage("2", "Open", "Verified members can quote")}
        ${quoteStage("3", "Shortlist", "Customer compares privately")}
        ${quoteStage("4", "Closed", "Job awarded or archived")}
      </div>
    </section>
    <section class="quote-metrics">
      ${metric("JP review", state.quotes.filter((quote) => quote.status === "jp-review").length)}
      ${metric("Open to quote", state.quotes.filter((quote) => quote.status === "open").length)}
      ${metric("Private responses", responseCount)}
      ${metric("Shortlisted", state.quotes.filter((quote) => quote.status === "shortlisted").length)}
    </section>
    <section class="notice quote-notice">Private pricing rule: each provider only sees their own submitted quote. Customers and JP Innovation can review all responses. This keeps the process fair and avoids a public price race.</section>
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
    <section class="section-card section-violet">
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
    </section>
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
      <div class="list-title"><div><h2>Add resource</h2><p>Create your own checklist, guide, template or useful note for members.</p></div></div>
      <form id="resourceForm" class="form-grid two">
        <label>Type <select name="type">${["Checklist", "Template", "Guide", "Tool note", "Supplier note"].map(option).join("")}</select></label>
        <label>Title <input name="title" required></label>
        <label class="wide">Detail <textarea name="detail" rows="3" required></textarea></label>
        <button class="primary-button wide" type="submit">Add resource</button>
      </form>
    </section>
    <section class="section-card section-green">
      <div class="list-title"><div><h2>Templates and checklists</h2><p>Resources that can later become downloadable member files.</p></div></div>
      <div class="resource-grid">
        ${(state.resources || []).map((resource) => `
          <article class="resource-card">
            <span class="badge">${escapeHtml(resource.type)}</span>
            <h3>${escapeHtml(resource.title)}</h3>
            <p>${escapeHtml(resource.detail)}</p>
            <div class="card-actions">
              <button class="secondary-button delete-item-button" data-delete-type="resource" data-id="${escapeHtml(resource.id)}" type="button">Delete</button>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderEvents() {
  return `
    <section class="section-card section-rose">
      <h2>Engineering events</h2>
      <p class="muted">Add member meetups, workshops and site visits, then track who has registered interest.</p>
      <form id="eventForm" class="form-grid two">
        <label>Event title <input name="title" required></label>
        <label>Type <select name="type">${["Meetup", "Workshop", "Site visit", "Online session", "Supplier demo"].map(option).join("")}</select></label>
        <label>Date <input name="date" type="date" required></label>
        <label>Location <input name="location" required placeholder="Milton Keynes, Online, TBC..."></label>
        <button class="primary-button wide" type="submit">Add event</button>
      </form>
      <div class="cards-grid">${state.events.map((event) => {
        const interested = event.interested || [];
        const joined = interested.includes(currentUser()?.email);
        return `
        <article class="event-card">
          <span class="badge">${escapeHtml(event.type)}</span>
          <h3>${escapeHtml(event.title)}</h3>
          <p>${escapeHtml(event.date)} - ${escapeHtml(event.location)}</p>
          <p class="muted">${interested.length} interested</p>
          <div class="card-actions">
            <button class="secondary-button event-interest-button" data-event-id="${escapeHtml(event.id)}" type="button">${joined ? "Interest registered" : "Register interest"}</button>
            <button class="secondary-button delete-item-button" data-delete-type="event" data-id="${escapeHtml(event.id)}" type="button">Delete</button>
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

function renderMessages() {
  const user = currentUser();
  if (user?.role === "client") {
    const messages = state.messages.filter((message) => message.ownerEmail === user.email);
    const unread = messages.filter((message) => message.unread).length;
    return `
      <section class="section-card section-blue">
        <div class="list-title"><div><h2>Messages with JP Innovation</h2><p>Use this area for quote questions, project updates and anything JP Innovation needs to review.</p></div>${unread ? `<button class="secondary-button mark-messages-read" type="button">Mark all read</button>` : ""}</div>
        <form id="messageForm" class="form-grid two">
          <input name="from" type="hidden" value="${escapeHtml(user.name)}">
          <label>Subject <input name="subject" required></label>
          <label class="wide">Message <textarea name="body" rows="4" required></textarea></label>
          <button class="primary-button wide" type="submit">Send message</button>
        </form>
        <div class="feed-list">${messages.map((message) => `
          <article class="feed-item">
            <span class="badge">${message.unread ? "Awaiting review" : "Seen"}</span>
            <h3>${escapeHtml(message.subject)}</h3>
            <p>${escapeHtml(message.body)}</p>
          </article>`).join("") || `<p class="muted">No messages yet.</p>`}
        </div>
      </section>
    `;
  }
  const memberMessages = user?.role === "admin"
    ? state.messages
    : state.messages.filter((message) => message.senderEmail === user?.email || message.recipientEmail === user?.email);
  const unread = memberMessages.filter((message) => message.unread && (!message.recipientEmail || message.recipientEmail === user?.email)).length;
  const recipients = state.members.filter((member) => member.email && member.email !== user?.email && member.directoryVisible !== false);
  return `
    <section class="section-card section-blue">
      <div class="list-title"><div><h2>Messages</h2><p>Send a direct message to an approved member and keep project follow-ups together.</p></div>${unread ? `<button class="secondary-button mark-messages-read" type="button">Mark all read</button>` : ""}</div>
      <form id="messageForm" class="form-grid two">
        <input name="from" type="hidden" value="${escapeHtml(user?.name || "Hub member")}">
        <label>To <select name="toEmail" required><option value="">Choose a member</option>${recipients.map((member) => `<option value="${escapeHtml(member.email)}" ${member.email === messageDraftRecipientEmail ? "selected" : ""}>${escapeHtml(member.name)}${member.business ? ` - ${escapeHtml(member.business)}` : ""}</option>`).join("")}</select></label>
        <label>Subject <input name="subject" required></label>
        <label class="wide">Message <textarea name="body" rows="3" required></textarea></label>
        <button class="primary-button wide" type="submit" ${recipients.length ? "" : "disabled"}>Send message</button>
      </form>
      <div class="feed-list">${memberMessages.map((message) => `
        <article class="feed-item">
          <span class="badge">${message.unread ? "Unread" : "Read"}</span>
          <h3>${escapeHtml(message.subject)}</h3>
          <p><strong>${escapeHtml(message.from)}</strong>${message.recipientName ? ` to ${escapeHtml(message.recipientName)}` : ""}</p>
          <p>${escapeHtml(message.body)}</p>
          <button class="secondary-button delete-item-button" data-delete-type="message" data-id="${escapeHtml(message.id)}" type="button">Delete</button>
        </article>`).join("") || `<p class="muted">No messages yet.</p>`}
      </div>
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
              <strong>${escapeHtml(member.name)}</strong>
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
  return `
    <section class="section-card section-silver">
      <div class="list-title">
        <div><h2>My profile</h2><p>Keep this complete for verification and quote opportunities.</p></div>
        <span class="pill good">${escapeHtml(user.level)}</span>
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
        ${metric("Badges", user.verified ? "Verified" : "Member")}
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
      <p class="muted">Your secure account, board posts, projects and quote requests use the shared service. Personal display preferences remain on this device.</p>
      <div class="cards-grid">
        <article class="card"><span class="badge">Account plan</span><h3>${isClient ? "Client Portal" : "Innovation Hub"}</h3><p>${isClient ? "Free access for quotes, requests and direct communication with JP Innovation." : "GBP 19/month Innovation Hub membership. Billing begins only when JP Innovation confirms activation."}</p></article>
        <article class="card"><span class="badge">Email</span><h3>Notifications</h3><p>Important account and submission updates appear in the notification centre. Email alerts are being connected separately.</p></article>
        <article class="card"><span class="badge">Security</span><h3>Password</h3><p>Secure Supabase login is connected. Password changes and recovery should stay inside the protected sign-in flow.</p></article>
        <article class="card"><span class="badge">Account</span><h3>${escapeHtml(user.email)}</h3><p>Your ${isClient ? "quote requests" : "board posts, projects and quote requests"} follow this secure login across devices.</p></article>
      </div>
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
    verified: role === "admin" || profile.membership_status === "active",
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
    .select("user_id,email,full_name,business,account_type,membership_status")
    .order("email", { ascending: true });
  if (error) {
    adminProfilesStatus = "error";
    adminProfilesMessage = "Live account permissions still need enabling in Supabase. The admin setup script must be run before launch.";
  } else {
    secureAdminProfiles = data || [];
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
  const moderationReplies = state.posts.flatMap((post) => (post.responses || []).filter((reply) => reply.moderationStatus === "pending").map((reply) => ({ post, reply })));
  const moderationProjects = state.projects.filter((project) => project.moderationStatus === "pending");
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
    <details id="adminPostModeration" class="section-card admin-fold section-rose" ${moderationPosts.length ? "open" : ""}>
      <summary class="list-title"><div><h2>Post moderation</h2><p>Approve, reject or review reported posts.</p></div><span class="pill ${moderationPosts.length ? "warn" : "good"}">${moderationPosts.length}</span></summary>
      <div class="feed-list">${moderationPosts.length ? moderationPosts.map((item) => `
        <article class="feed-item">
          <span class="pill warn">${item.moderationStatus === "pending" ? "Awaiting approval" : "Reported"}</span>
          <h3>${escapeHtml(item.title || "Flagged content")}</h3>
          <p>${escapeHtml(item.description || item.reason || "")}</p>
          <div class="admin-actions">
            <button class="primary-button post-moderation-action" data-post-action="approved" data-post-id="${escapeHtml(item.id)}" type="button">Approve</button>
            <button class="secondary-button post-moderation-action danger-action" data-post-action="rejected" data-post-id="${escapeHtml(item.id)}" type="button">Reject</button>
          </div>
        </article>`).join("") : `<p class="muted">No flagged content right now.</p>`}
      </div>
    </details>
    <details id="adminReplyModeration" class="section-card admin-fold section-blue" ${moderationReplies.length ? "open" : ""}>
      <summary class="list-title"><div><h2>Reply moderation</h2><p>Approve replies before they appear to other members.</p></div><span class="pill ${moderationReplies.length ? "warn" : "good"}">${moderationReplies.length}</span></summary>
      <div class="feed-list">${moderationReplies.length ? moderationReplies.map(({ post, reply }) => `
        <article class="feed-item">
          <span class="pill warn">Awaiting approval</span>
          <h3>${escapeHtml(post.title)}</h3>
          <p><strong>${escapeHtml(reply.author)}:</strong> ${escapeHtml(reply.body)}</p>
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
              <h3>${escapeHtml(member.name)}</h3>
              <p>${escapeHtml(member.business || "Independent member")} - ${escapeHtml(member.email)}</p>
              <div class="meta-row">
                <span class="pill ${member.verified ? "good" : "warn"}">${member.verified ? "Verified" : "Pending"}</span>
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

function postCard(post) {
  const user = currentUser();
  const isOwner = user?.id === post.authorId || user?.email === post.authorEmail || user?.role === "admin";
  const replies = visibleBoardReplies(post, user);
  const helpfulCount = countHelpfulReplies(post);
  return `
    <article class="feed-item thread-card" id="post-${escapeHtml(post.id)}">
      <div class="thread-topline">
        <span class="badge">${escapeHtml(post.category)}</span>
        ${post.moderationStatus !== "approved" ? `<span class="pill warn">${post.moderationStatus === "rejected" ? "Not approved" : "Awaiting approval"}</span>` : ""}
        ${helpfulCount ? `<span class="pill good">${helpfulCount} helpful</span>` : `<span class="pill warn">Needs help</span>`}
      </div>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.description)}</p>
      <div class="meta-row">
        <span class="pill">${escapeHtml(post.author)}</span>
        <span class="pill">${escapeHtml(post.created || "Today")}</span>
        <span class="pill">${replies.length} replies</span>
        ${post.flagged ? `<span class="pill warn">Flagged</span>` : ""}
      </div>
      ${replies.length ? `
        <div class="reply-list">
          ${replies.map((reply) => `
            <div class="reply-card" id="reply-${escapeHtml(reply.id)}">
              <p><strong>${escapeHtml(reply.author)}</strong> ${escapeHtml(reply.body)}</p>
              <div class="meta-row">
                <span class="pill ${reply.moderationStatus === "approved" ? (reply.helpful ? "good" : "") : "warn"}">${reply.moderationStatus === "approved" ? (reply.helpful ? "Marked helpful" : "Published reply") : reply.moderationStatus === "rejected" ? "Not approved" : "Awaiting approval"}</span>
                ${reply.helpful || !isOwner || reply.authorId === post.authorId || reply.authorEmail === post.authorEmail ? "" : `<button class="secondary-button helpful-button" data-post-id="${post.id}" data-reply-id="${reply.id}" type="button">Mark helpful</button>`}
                ${user?.role === "admin" && reply.moderationStatus === "pending" ? `<button class="primary-button reply-moderation-action" data-reply-action="approved" data-post-id="${escapeHtml(post.id)}" data-reply-id="${escapeHtml(reply.id)}" type="button">Approve reply</button><button class="secondary-button reply-moderation-action danger-action" data-reply-action="rejected" data-post-id="${escapeHtml(post.id)}" data-reply-id="${escapeHtml(reply.id)}" type="button">Reject</button>` : ""}
                ${(user?.id === reply.authorId || user?.email === reply.authorEmail || user?.role === "admin") ? `<details class="inline-edit"><summary>Edit reply</summary><form class="edit-reply-form" data-post-id="${escapeHtml(post.id)}" data-reply-id="${escapeHtml(reply.id)}"><textarea name="body" rows="3" required>${escapeHtml(reply.body)}</textarea><div class="card-actions"><button class="secondary-button" type="submit">Save reply</button><button class="secondary-button delete-reply-button" data-post-id="${escapeHtml(post.id)}" data-reply-id="${escapeHtml(reply.id)}" type="button">Delete reply</button></div></form></details>` : ""}
              </div>
            </div>
          `).join("")}
        </div>
      ` : ""}
      ${post.moderationStatus === "approved" || user?.role === "admin" ? `<form class="reply-form" data-post-id="${post.id}">
        <label>Reply with advice, a recommendation or a question
          <textarea name="body" rows="3" required placeholder="Add useful feedback..."></textarea>
        </label>
        <button class="secondary-button" type="submit">Submit reply for approval</button>
      </form>` : `<p class="muted">Replies open after JP Innovation approves this post.</p>`}
      <button class="secondary-button report-button" data-id="${post.id}" type="button">Report post</button>
      ${isOwner ? `<details class="post-edit-panel"><summary>Edit post</summary><form class="edit-post-form form-grid two" data-post-id="${escapeHtml(post.id)}"><label>Title <input name="title" value="${escapeHtml(post.title)}" required></label><label>Category <select name="category">${boardCategories.map((category) => `<option value="${escapeHtml(category)}" ${category === post.category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}</select></label><label class="wide">Description <textarea name="description" rows="4" required>${escapeHtml(post.description)}</textarea></label><button class="primary-button" type="submit">Save changes</button><button class="secondary-button delete-item-button" data-delete-type="post" data-id="${escapeHtml(post.id)}" type="button">Delete post</button></form></details>` : ""}
    </article>
  `;
}

function postSummaryCard(post) {
  const replies = visibleBoardReplies(post);
  const helpfulCount = countHelpfulReplies(post);
  return `
    <article class="feed-item thread-card thread-summary">
      <div class="thread-topline">
        <span class="badge">${escapeHtml(post.category)}</span>
        ${post.moderationStatus !== "approved" ? `<span class="pill warn">${post.moderationStatus === "rejected" ? "Not approved" : "Awaiting approval"}</span>` : ""}
        ${helpfulCount ? `<span class="pill good">${helpfulCount} helpful</span>` : `<span class="pill warn">Needs help</span>`}
      </div>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.description)}</p>
      <div class="meta-row">
        <span class="pill">${escapeHtml(post.author)}</span>
        <span class="pill">${escapeHtml(post.created || "Today")}</span>
        <span class="pill">${replies.length} ${replies.length === 1 ? "reply" : "replies"}</span>
      </div>
      <button class="primary-button open-board-post" data-post-id="${escapeHtml(post.id)}" type="button">Open discussion</button>
    </article>
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
      ` : ""}
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
  return `
    <article class="member-card">
      <span class="badge">${escapeHtml(member.level)}</span>
      <h3>${escapeHtml(member.name)}</h3>
      <p><strong>${escapeHtml(member.business || "Independent member")}</strong></p>
      <p>${escapeHtml(member.bio || "")}</p>
      <div class="tag-row">
        <span class="pill">${escapeHtml(member.location || "Location TBC")}</span>
        <span class="pill">${escapeHtml(member.skill || "General")}</span>
        <span class="pill">${escapeHtml(member.equipment || "Equipment TBC")}</span>
        <span class="pill">${escapeHtml(member.preferredWork || "Open to help")}</span>
        <span class="pill">${escapeHtml(member.capacity || "Capacity TBC")}</span>
        <span class="pill ${member.verified ? "good" : ""}">${member.verified ? "Verified" : "Member"}</span>
        <span class="pill">${member.points} pts</span>
      </div>
      <button class="secondary-button message-member-button" data-member-email="${escapeHtml(member.email || "")}" type="button">Message</button>
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
        if (status) status.textContent = "Post submitted for JP Innovation approval.";
        renderNotifications();
        window.setTimeout(() => {
          activeBoardCategory = data.category;
          renderView("boards");
        }, 550);
      } catch (error) {
        if (status) status.textContent = error.message || "The post could not be published.";
      }
    });
    bindReports();
    bindHelpfulButtons();
    bindReplyForms();
    bindReplyModerationActions();
    bindBoardFilters();
    bindOpenBoardPosts();
    bindBoardCategoryButtons();
    bindBoardEditForms();
    $(".board-back-button")?.addEventListener("click", () => {
      activeBoardPostId = "";
      renderView("boards");
    });
    $(".board-all-button")?.addEventListener("click", () => {
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
    $("#projectForm").addEventListener("submit", async (event) => {
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
  }
  if (view === "quotes") {
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
    bindQuoteJumps();
  }
  if (view === "directory") bindDirectory();
  if (view === "resources") {
    bindResourceTools();
    $("#resourceForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = formObject(event.currentTarget);
      state.resources.unshift({
        id: uid("resource"),
        type: data.type,
        title: data.title.trim(),
        detail: data.detail.trim(),
        example: false
      });
      saveState();
      renderView("resources");
    });
  }
  if (view === "events") {
    $("#eventForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = formObject(event.currentTarget);
      state.events.unshift({
        id: uid("event"),
        title: data.title.trim(),
        date: data.date.trim(),
        location: data.location.trim(),
        type: data.type,
        interested: [],
        example: false
      });
      saveState();
      renderView("events");
    });
    $all(".event-interest-button").forEach((button) => button.addEventListener("click", () => {
      const item = state.events.find((event) => event.id === button.dataset.eventId);
      const email = currentUser()?.email;
      if (!item || !email) return;
      item.interested = item.interested || [];
      item.interested = item.interested.includes(email)
        ? item.interested.filter((entry) => entry !== email)
        : [...item.interested, email];
      saveState();
      renderView("events");
    }));
  }
  if (view === "messages") {
    $(".mark-messages-read")?.addEventListener("click", () => {
      const user = currentUser();
      state.messages.forEach((message) => {
        if (user?.role === "client") {
          if (message.ownerEmail === user.email) message.unread = false;
        } else if (user?.role === "admin") {
          message.unread = false;
        } else {
          if (message.recipientEmail === user?.email) message.unread = false;
        }
      });
      saveState();
      renderView("messages");
    });
    $("#messageForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = formObject(event.currentTarget);
      const user = currentUser();
      const recipientEmail = user?.role === "client" ? adminEmail : cleanEmailValue(data.toEmail || "");
      const recipient = state.members.find((member) => member.email === recipientEmail);
      state.messages.unshift({
        id: uid("msg"),
        from: data.from.trim(),
        subject: data.subject.trim(),
        body: data.body.trim(),
        unread: true,
        ownerEmail: user?.role === "client" ? user.email : "",
        senderEmail: user?.email || "",
        recipientEmail,
        recipientName: user?.role === "client" ? "JP Innovation" : (recipient?.name || recipientEmail),
        example: false
      });
      messageDraftRecipientEmail = "";
      saveState();
      renderView("messages");
    });
  }
  if (view === "settings") bindTrialDataTools();
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
    bindReplyModerationActions();
    bindProjectModerationActions();
    bindQuoteActions();
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
  }
  if (view === "settings") {
    $("#settingsForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const user = currentUser();
      Object.assign(user, formObject(event.currentTarget));
      syncMember(user);
      saveState();
      $("#settingsStatus").textContent = "Preferences saved.";
      setLoggedInView();
      renderView("settings");
    });
  }
  $all(".nav-link-jump").forEach((button) => button.addEventListener("click", () => renderView(button.dataset.targetView)));
  bindDeleteButtons();
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
          if (action === "upgrade") await updateSecureProfileAccess(member.id, { account_type: "member", membership_status: "active" });
          if (action === "downgrade") await updateSecureProfileAccess(member.id, { account_type: "client", membership_status: "free" });
          if (action === "verify") await updateSecureProfileAccess(member.id, { membership_status: "active" });
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
      }
      if (action === "downgrade") {
        member.role = "client";
        member.level = "Client Portal";
        member.verified = false;
        member.directoryVisible = false;
        member.onboardingComplete = true;
      }
      if (action === "verify") {
        member.verified = true;
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
}

function bindPostModerationActions() {
  $all(".post-moderation-action").forEach((button) => {
    button.addEventListener("click", async () => {
      const post = state.posts.find((item) => item.id === button.dataset.postId);
      if (!post) return;
      const moderationStatus = button.dataset.postAction;
      try {
        if (boardBackendAvailable) {
          const { error } = await portalBackend.from("board_posts").update({
            moderation_status: moderationStatus,
            flagged: moderationStatus === "approved" ? false : post.flagged
          }).eq("id", post.id);
          if (error) throw error;
        }
        post.moderationStatus = moderationStatus;
        if (moderationStatus === "approved") post.flagged = false;
        saveState();
        renderNotifications();
        renderView("admin");
      } catch (error) {
        adminProfilesMessage = `Post moderation failed: ${error.message}`;
        renderView("admin");
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
        saveState();
        renderNotifications();
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
          if (action === "approve") await updateSecureProfileAccess(application.userId, { account_type: "member", membership_status: "active" });
          if (action === "reject") await updateSecureProfileAccess(application.userId, { account_type: "client", membership_status: "rejected" });
          adminProfilesMessage = action === "approve" ? `${application.fullName} now has paid Innovation Hub access.` : `${application.fullName}'s Hub request was rejected; Client Portal access remains available.`;
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
          verified: application.partner === true || application.wantsDirectory === true
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
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const project = state.projects.find((item) => item.id === form.dataset.projectId);
      if (!project) return;
      const data = formObject(form);
      project.updates ||= [];
      project.updates.unshift({ id: uid("update"), title: data.title, body: data.body, created: "Just now" });
      project.nextStep = data.title;
      project.points = (project.points || 0) + 3;
      saveState();
      renderView("projects");
    });
  });
  $all(".project-part-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const project = state.projects.find((item) => item.id === form.dataset.projectId);
      if (!project) return;
      const data = formObject(form);
      project.parts ||= [];
      project.parts.push({ id: uid("part"), name: data.name, material: data.material || "TBC", status: data.status || "Open" });
      saveState();
      renderView("projects");
    });
  });
  $all(".project-comment-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const user = currentUser();
      const project = state.projects.find((item) => item.id === form.dataset.projectId);
      if (!project || !user) return;
      const data = formObject(form);
      project.discussion ||= [];
      project.discussion.unshift({ id: uid("comment"), author: user.name, body: data.body, helpful: false, created: "Just now" });
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
  ["calcHours", "calcRate", "calcMaterial"].forEach((id) => $(`#${id}`)?.addEventListener("input", updateQuote));
  ["printWeight", "printRate", "printSetup"].forEach((id) => $(`#${id}`)?.addEventListener("input", updatePrint));
  ["clearanceNominal", "clearanceFit"].forEach((id) => $(`#${id}`)?.addEventListener("input", updateClearance));
  $("#clearanceFit")?.addEventListener("change", updateClearance);
  updateQuote();
  updatePrint();
  updateClearance();
}

function bindDashboardLinks() {
  $all(".dashboard-link").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.postId) {
        openBoardNotification(button.dataset.postId, button.dataset.replyId || "");
        return;
      }
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
      }
      const user = state.users.find((item) => item.email === reply.authorEmail);
      if (user) {
        user.helpfulPoints = (user.helpfulPoints || 0) + 1;
        user.points = (user.points || 0) + 1;
      }
      saveState();
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
      const verifiedMatch = !verifiedOnly || member.verified;
      return visibleMatch && skillMatch && locationMatch && verifiedMatch;
    });
    $("#directoryResults").innerHTML = results.length ? results.map(memberCard).join("") : `<p class="muted">No matching members found.</p>`;
    $all(".message-member-button", $("#directoryResults")).forEach((button) => button.addEventListener("click", () => {
      messageDraftRecipientEmail = button.dataset.memberEmail || "";
      renderView("messages");
    }));
  };
  [skill, location, verified].forEach((input) => input.addEventListener("input", render));
  verified.addEventListener("change", render);
  render();
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
    level: user.level,
    points: user.points,
    helpfulPoints: user.helpfulPoints || 0,
    bio: user.bio || "Innovation Hub member.",
    preferredWork: user.preferredWork || "",
    capacity: user.capacity || "",
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
    await clearKnownPretendSecureContent();
    await loadSecureBoards();
    await loadSecureSubmissions();
  } catch (error) {
    state.sessionEmail = "";
    saveState();
    console.error("Secure session could not be loaded.", error);
  }
  if (entryMode === "hub" && !currentUser()) {
    window.location.replace(`../hub/index.html${signInRequested ? "?signin=1" : ""}`);
    return;
  }
  document.documentElement.classList.remove("restoring-portal-session");
  configureEntryPage();
  setupEmailFieldCleaning();
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
    window.history.replaceState({}, document.title, "/hub-portal/index.html?entry=client&signin=1");
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
  $("#memberProfileMenu")?.addEventListener("click", (event) => event.stopPropagation());
  $all("[data-profile-view]").forEach((button) => button.addEventListener("click", () => {
    renderView(button.dataset.profileView);
    setMemberProfileMenuOpen(false);
    setMobileDashboardMenuOpen(false);
  }));
  $("#messageInboxButton")?.addEventListener("click", (event) => {
    event.stopPropagation();
    setNotificationsOpen(false);
    renderView("messages");
    setMemberProfileMenuOpen(false);
    setMobileDashboardMenuOpen(false);
  });
  $("#notificationBell")?.addEventListener("click", (event) => {
    event.stopPropagation();
    renderView("notifications");
    setMemberProfileMenuOpen(false);
    setMobileDashboardMenuOpen(false);
  });
  $("#closeNotifications")?.addEventListener("click", (event) => {
    event.stopPropagation();
    setNotificationsOpen(false);
  });
  $("#notificationPopover")?.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("click", () => {
    setNotificationsOpen(false);
    setMemberProfileMenuOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setNotificationsOpen(false);
      setMemberProfileMenuOpen(false);
      setMobileDashboardMenuOpen(false);
    }
  });
  $all(".nav-link").forEach((button) => button.addEventListener("click", (event) => {
    event.preventDefault();
    const destination = button.dataset.view || "dashboard";
    setMemberProfileMenuOpen(false);
    setMobileDashboardMenuOpen(false);
    activeBoardPostId = "";
    activeBoardCategory = "";
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
  else if (!currentUser() && registerRequested) openAuth("register");
  else if (!currentUser() && signInRequested && !$("#upgradeDialog")?.classList.contains("open")) openAuth("signin");
}

boot();
