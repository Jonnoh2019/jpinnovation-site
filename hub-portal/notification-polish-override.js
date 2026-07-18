/* JP Innovation notification polish: high-visibility Android/web push presentation and clean settings status. */
(function () {
  const JP_NOTIFICATION_VERSION = "jp-notification-polish-20260718";
  const jpIcon = "/assets/jp-innovation-logo.png?v=" + JP_NOTIFICATION_VERSION;
  const jpBadge = "/assets/jp-notification-badge.png?v=" + JP_NOTIFICATION_VERSION;
  const swPath = "/jp-service-worker.js?v=" + JP_NOTIFICATION_VERSION;

  function escapeText(value) {
    return typeof escapeHtml === "function"
      ? escapeHtml(value)
      : String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
  }

  function addNotificationPolishStyles() {
    if (document.getElementById("notificationPolishStyles")) return;
    const style = document.createElement("style");
    style.id = "notificationPolishStyles";
    style.textContent = `
      .phone-alert-title { align-items:flex-start!important; gap:10px!important; }
      .phone-alert-title h2 { display:inline-flex; flex-wrap:wrap; align-items:center; gap:9px; }
      .phone-status-pill { display:inline-flex; align-items:center; gap:6px; min-height:26px; padding:5px 10px; border-radius:999px; border:1px solid rgba(48,216,143,.34); background:rgba(48,216,143,.11); color:#73e3a4; font-size:11px; font-weight:950; letter-spacing:.03em; white-space:nowrap; }
      .phone-status-pill.is-disabled { border-color:rgba(255,255,255,.12); background:rgba(255,255,255,.045); color:var(--silver,#aeb8c6); }
      .phone-status-pill.is-blocked { border-color:rgba(255,107,107,.32); background:rgba(255,107,107,.1); color:#ff8c8c; }
      #phoneAlertStatus { font-size:12px; line-height:1.35; }
      @media(max-width:560px){ .phone-alert-title h2 { gap:7px; } .phone-status-pill { min-height:24px; padding:4px 9px; font-size:10.5px; } }
    `;
    document.head.appendChild(style);
  }

  async function registerPolishedNotificationServiceWorker() {
    if (!("serviceWorker" in navigator)) return null;
    const registration = await navigator.serviceWorker.register(swPath, { scope: "/" });
    if (registration.update) registration.update().catch(() => {});
    return registration;
  }

  if ("serviceWorker" in navigator) {
    registerNotificationServiceWorker = registerPolishedNotificationServiceWorker;
  }

  function notificationUrl(view) {
    return "/hub-portal/index.html?entry=hub&view=" + encodeURIComponent(view || "notifications") + "&t=" + Date.now();
  }

  function polishedNotificationOptions(body, view) {
    return {
      body: body || "Open JP Innovation to view the update.",
      icon: jpIcon,
      image: jpIcon,
      badge: jpBadge,
      tag: "jp-admin-" + (view || "notification") + "-" + Date.now(),
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [220, 90, 220, 90, 260],
      actions: [{ action: "open", title: "Open JP Hub" }],
      priority: "max",
      urgency: "high",
      importance: "max",
      channelId: "jp-admin-alerts",
      visibility: "public",
      timestamp: Date.now(),
      data: { url: notificationUrl(view) }
    };
  }

  async function showPolishedPhoneNotification(title, body, view) {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      throw new Error("This browser does not support website notifications.");
    }
    if (Notification.permission !== "granted") throw new Error("Press Enable phone alerts first.");
    const registration = await registerPolishedNotificationServiceWorker();
    await registration.showNotification(title || "JP Innovation", polishedNotificationOptions(body, view));
  }

  window.jpShowPolishedPhoneNotification = showPolishedPhoneNotification;

  if (typeof enablePhoneNotifications === "function") {
    enablePhoneNotifications = async function enablePhoneNotifications() {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        throw new Error("This browser does not support website notifications.");
      }
      if (typeof isIosDevice === "function" && isIosDevice() && typeof isStandaloneApp === "function" && !isStandaloneApp()) {
        throw new Error("On iPhone, add JP Innovation to your Home Screen first, then open the app icon and enable alerts.");
      }
      const registration = await registerPolishedNotificationServiceWorker();
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notifications were not enabled. You can change this in your browser settings.");
      await registration.showNotification("JP Innovation alerts enabled", polishedNotificationOptions("Admin tasks, messages and Hub updates will appear here.", "notifications"));
      const publicKey = window.JP_INNOVATION_PUSH_PUBLIC_KEY || "";
      if (!publicKey) return "Phone alerts are enabled on this device. Backend push sending still needs the secure server key before off-site alerts can be sent automatically.";
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: typeof urlBase64ToUint8Array === "function" ? urlBase64ToUint8Array(publicKey) : publicKey
      });
      if (typeof savePushSubscription === "function") await savePushSubscription(subscription);
      return "Phone alerts enabled and this device has been registered for live push notifications.";
    };
  }

  if (typeof maybeShowLocalPhoneNotification === "function") {
    maybeShowLocalPhoneNotification = async function maybeShowLocalPhoneNotification(items = []) {
      const user = typeof currentUser === "function" ? currentUser() : null;
      if (!items.length || !user?.email) return;
      const item = items.find((entry) => entry.isNew) || items[0];
      try {
        await showPolishedPhoneNotification("JP Innovation", `${item.title || "Update"}\n${item.detail || "Open JP Innovation to view it."}`, item.view || "notifications");
      } catch (error) {
        console.debug("Local JP notification skipped", error);
      }
    };
  }

  const baseRenderSettings = typeof renderSettings === "function" ? renderSettings : null;
  if (baseRenderSettings) {
    renderSettings = function renderSettings(user) {
      addNotificationPolishStyles();
      const html = baseRenderSettings(user);
      const permission = "Notification" in window ? Notification.permission : "unsupported";
      const statusClass = permission === "granted" ? "" : permission === "denied" ? " is-blocked" : " is-disabled";
      const statusText = permission === "granted" ? "✓ Enabled" : permission === "denied" ? "Blocked" : "Not enabled";
      return html.replace(
        /<div class="list-title"><div><h2>Phone alerts<\/h2><p>([\s\S]*?)<\/p><\/div><span class="pill">[\s\S]*?<\/span><\/div>/,
        `<div class="list-title phone-alert-title"><div><h2>Phone alerts <span class="phone-status-pill${statusClass}">${escapeText(statusText)}</span></h2><p>$1</p></div></div>`
      );
    };
  }

  window.addEventListener("click", async (event) => {
    const test = event.target.closest?.("#testPhoneAlert");
    if (!test) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const status = document.getElementById("phoneAlertStatus");
    if (status) status.textContent = "Sending JP test alert...";
    try {
      await showPolishedPhoneNotification("JP Innovation", "Test alert sent. Tap to open your Hub notifications.", "notifications");
      if (status) status.textContent = "JP test alert sent to this device.";
      if (typeof showSuccessToast === "function") showSuccessToast("JP test alert sent.", "Tap the phone notification to open Hub notifications.");
    } catch (error) {
      console.error("JP test alert failed", error);
      if (status) status.textContent = error.message || "The test alert could not be sent.";
      if (typeof showErrorToast === "function") showErrorToast("JP test alert failed.", error.message || "Check notification permissions on this device.");
    }
  }, true);

  addNotificationPolishStyles();
  window.addEventListener("load", () => registerPolishedNotificationServiceWorker().catch(() => {}));
})();