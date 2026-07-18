/* JP Innovation production core override: upgrade requests, admin access actions and notification reliability. */
(function () {
  const esc = (value) => typeof escapeHtml === "function" ? escapeHtml(value) : String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
  const clean = (value) => typeof cleanEmailValue === "function" ? cleanEmailValue(value || "") : String(value || "").trim().toLowerCase();
  const safeArr = (value) => Array.isArray(value) ? value : [];
  const jpIcon = "/assets/jp-app-icon-192.png?v=jp-notification-20260718";
  const jpBadge = "/assets/jp-notification-badge.svg?v=jp-notification-20260718";

  function toast(title, detail, isError) {
    const fn = isError ? window.showErrorToast : window.showSuccessToast;
    if (typeof fn === "function") fn(title, detail);
    else {
      const node = document.createElement("div");
      node.className = "app-toast show " + (isError ? "error" : "success");
      node.innerHTML = "<strong>" + esc(title) + "</strong>" + (detail ? "<small>" + esc(detail) + "</small>" : "");
      document.body.appendChild(node);
      window.setTimeout(() => node.remove(), 4200);
    }
  }

  function addProductionStyles() {
    if (document.getElementById("productionCoreStyles")) return;
    const style = document.createElement("style");
    style.id = "productionCoreStyles";
    style.textContent = `
      .client-upgrade-request-card { border-left-color:rgba(47,141,255,.9)!important; }
      .client-upgrade-request-card textarea { width:100%; min-height:74px; resize:vertical; margin:8px 0; padding:10px 11px; border-radius:13px; border:1px solid rgba(255,255,255,.11); background:rgba(2,8,14,.48); color:#fff; font:inherit; font-size:13px; }
      .client-upgrade-request-card .button-row { display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; }
      .production-status-note { margin-top:8px; color:var(--silver,#aeb8c6); font-size:11px; line-height:1.35; }
      .phone-diagnostic-card { margin-top:10px; padding:11px; border-radius:14px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.035); }
      .phone-diagnostic-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; margin-top:8px; }
      .phone-diagnostic-grid span { padding:8px; border-radius:11px; background:rgba(2,8,14,.34); color:var(--silver,#aeb8c6); font-size:10px; }
      .phone-diagnostic-grid strong { display:block; color:#fff; font-size:11px; }
      @media(max-width:760px){.client-upgrade-request-card .button-row{grid-template-columns:1fr}.phone-diagnostic-grid{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  async function rpcFallback(name, payload, fallback) {
    if (!portalBackend) throw new Error("Secure backend is unavailable.");
    const result = await portalBackend.rpc(name, payload || {});
    if (!result.error) return result.data;
    if (fallback && /function .* not find|Could not find the function|schema cache|PGRST202/i.test(result.error.message || "")) return fallback(result.error);
    throw result.error;
  }

  async function requestHubUpgrade(message) {
    const user = typeof currentUser === "function" ? currentUser() : null;
    if (!user?.id) throw new Error("Please sign in to request Hub access.");
    return rpcFallback("request_hub_access", { p_message: message || "" }, async () => {
      const retry = await portalBackend.rpc("request_hub_access");
      if (retry.error) throw retry.error;
      return retry.data;
    });
  }

  function upgradeCard(user) {
    const pending = String(user?.membershipStatus || user?.membership_status || "").toLowerCase() === "pending";
    return `
      <article class="card client-upgrade-request-card">
        <span class="badge">${pending ? "Request pending" : "Optional upgrade"}</span>
        <h3>Innovation Hub access</h3>
        <p>${pending ? "Your paid Hub upgrade request is waiting for JP Innovation approval." : "Request paid Hub access using this same login. Your Client Portal quotes, projects and messages stay with you."}</p>
        ${pending ? '<p class="production-status-note">No duplicate request is needed. You will be notified once it is approved or rejected.</p>' : '<textarea id="clientUpgradeMessage" placeholder="Optional message, e.g. what you want Hub access for"></textarea><div class="button-row"><button id="clientUpgradeRequestButton" class="primary-button" type="button">Request Hub upgrade</button><small class="production-status-note">Creates a real admin approval task.</small></div>'}
      </article>`;
  }

  const baseRenderClientDashboard = typeof renderClientDashboard === "function" ? renderClientDashboard : null;
  if (baseRenderClientDashboard) {
    renderClientDashboard = function renderClientDashboard(user) {
      addProductionStyles();
      let html = baseRenderClientDashboard(user);
      const oldCard = /<article class="card"><span class="badge">Optional upgrade<\/span>[\s\S]*?<\/article>/;
      if (oldCard.test(html)) return html.replace(oldCard, upgradeCard(user));
      return html.replace("</div>\n    </section>", upgradeCard(user) + "</div>\n    </section>");
    };
  }

  const originalUpdateSecureProfileAccess = typeof updateSecureProfileAccess === "function" ? updateSecureProfileAccess : null;
  if (originalUpdateSecureProfileAccess) {
    updateSecureProfileAccess = async function updateSecureProfileAccess(userId, changes) {
      if (!portalBackend || !userId) return originalUpdateSecureProfileAccess(userId, changes);
      try {
        const data = await rpcFallback("admin_set_account_access", {
          p_user_id: userId,
          p_account_type: changes.account_type || null,
          p_membership_status: changes.membership_status || null,
          p_profile_status: changes.status || null,
          p_reason: changes.removal_reason || ""
        }, async () => originalUpdateSecureProfileAccess(userId, changes));
        if (data && typeof secureAdminProfiles !== "undefined") {
          const row = Array.isArray(data) ? data[0] : data;
          const profile = safeArr(secureAdminProfiles).find((item) => item.user_id === userId);
          if (profile && row && typeof row === "object") Object.assign(profile, row);
        }
        return data;
      } catch (error) {
        console.error("Admin account access update failed", error);
        throw error;
      }
    };
  }

  async function showUniquePhoneNotification(title, body, view) {
    if (typeof pushSupported === "function" && !pushSupported()) throw new Error("This browser does not support website notifications.");
    if (!("Notification" in window)) throw new Error("This browser does not support website notifications.");
    if (Notification.permission !== "granted") throw new Error("Press Enable phone alerts first.");
    const registration = typeof registerNotificationServiceWorker === "function" ? await registerNotificationServiceWorker() : await navigator.serviceWorker.ready;
    const url = "/hub-portal/index.html?entry=hub&view=" + encodeURIComponent(view || "notifications") + "&t=" + Date.now();
    await registration.showNotification(title || "JP Innovation", {
      body: body || "Open JP Innovation to view the update.",
      icon: jpIcon,
      badge: jpBadge,
      tag: "jp-" + (view || "notification") + "-" + Date.now(),
      renotify: true,
      requireInteraction: false,
      vibrate: [140, 80, 140],
      timestamp: Date.now(),
      data: { url }
    });
  }

  if (typeof maybeShowLocalPhoneNotification === "function") {
    maybeShowLocalPhoneNotification = async function maybeShowLocalPhoneNotification(items = []) {
      const user = typeof currentUser === "function" ? currentUser() : null;
      if (!items.length || !user?.email) return;
      const item = items.find((entry) => entry.isNew) || items[0];
      try {
        await showUniquePhoneNotification("JP Innovation", `${item.title || "Update"}\n${item.detail || "Open JP Innovation to view it."}`, item.view || "notifications");
      } catch (error) {
        console.debug("Local JP notification skipped", error);
      }
    };
  }

  const baseRenderSettings = typeof renderSettings === "function" ? renderSettings : null;
  if (baseRenderSettings) {
    renderSettings = function renderSettings(user) {
      addProductionStyles();
      const html = baseRenderSettings(user);
      const standalone = typeof isStandaloneApp === "function" ? isStandaloneApp() : false;
      const supported = "Notification" in window && "serviceWorker" in navigator;
      const permission = "Notification" in window ? Notification.permission : "unsupported";
      const diag = `<section class="section-card phone-diagnostic-card"><div class="list-title"><div><h2>Phone alert diagnostics</h2><p>Use this when testing JP mobile notifications on this device.</p></div></div><div class="phone-diagnostic-grid"><span><strong>Browser support</strong>${supported ? "Available" : "Not supported"}</span><span><strong>Permission</strong>${esc(permission)}</span><span><strong>Installed app</strong>${standalone ? "Yes" : "No / browser tab"}</span><span><strong>Push sender</strong>${window.JP_INNOVATION_PUSH_PUBLIC_KEY ? "Configured" : "Server key needed"}</span></div></section>`;
      return html + diag;
    };
  }

  document.addEventListener("click", async (event) => {
    const upgrade = event.target.closest?.("#clientUpgradeRequestButton");
    if (upgrade) {
      event.preventDefault();
      upgrade.disabled = true;
      const original = upgrade.textContent;
      upgrade.textContent = "Sending request...";
      try {
        const message = document.getElementById("clientUpgradeMessage")?.value || "";
        await requestHubUpgrade(message);
        toast("Upgrade request sent.", "JP Innovation has been notified and will review your Hub access.", false);
        if (typeof syncSecureSession === "function") await syncSecureSession();
        if (typeof loadSecureUserData === "function") await loadSecureUserData();
        if (typeof renderView === "function") renderView("dashboard");
      } catch (error) {
        console.error("Hub upgrade request failed", error);
        const duplicate = /duplicate|already|pending/i.test(error.message || "");
        toast(duplicate ? "Upgrade request pending." : "Upgrade request could not be sent.", duplicate ? "A request already exists for this account." : "Please try again.", !duplicate);
        if (duplicate && typeof renderView === "function") renderView("dashboard");
      } finally {
        upgrade.disabled = false;
        upgrade.textContent = original;
      }
    }

    const test = event.target.closest?.("#testPhoneAlert");
    if (test) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const status = document.getElementById("phoneAlertStatus");
      if (status) status.textContent = "Sending JP test alert...";
      try {
        await showUniquePhoneNotification("JP Innovation", "Test alert sent. Tap to open your Hub notifications.", "notifications");
        if (status) status.textContent = "JP test alert sent to this device.";
        toast("JP test alert sent.", "If notifications are allowed, it should appear in your phone notification tray.", false);
      } catch (error) {
        console.error("JP test alert failed", error);
        if (status) status.textContent = error.message || "The test alert could not be sent.";
        toast("JP test alert failed.", error.message || "Check notification permissions on this device.", true);
      }
    }
  }, true);

  window.addEventListener("load", addProductionStyles);
})();