const JP_SW_VERSION = "jp-sw-20260722-compact-menu-popouts-1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    if (self.caches) {
      const keys = await self.caches.keys();
      await Promise.all(keys.map((key) => self.caches.delete(key)));
    }
    await self.clients.claim();
  })());
});

function notificationPayload(event) {
  const jpIcon = "/assets/jp-app-icon-512.png?v=" + JP_SW_VERSION;
  const jpBadge = "/assets/jp-notification-badge.svg?v=" + JP_SW_VERSION;
  const defaultUrl = "/hub-portal/index.html?entry=hub&view=notifications";
  const buildOptions = (payload = {}) => {
    const view = payload.view || "notifications";
    const url = payload.url || `/hub-portal/index.html?entry=hub&view=${encodeURIComponent(view)}`;
    const body = payload.body || payload.message || "You have a new Hub update.";
    return {
      body,
      icon: payload.icon || jpIcon,
      image: payload.image || jpIcon,
      badge: payload.badge || jpBadge,
      tag: payload.tag || `jp-admin-${view}-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      silent: false,
      timestamp: Date.now(),
      vibrate: [220, 90, 220, 90, 260],
      actions: [
        { action: "open", title: "Open JP Hub" }
      ],
      data: { url },
      priority: payload.priority || "max",
      urgency: payload.urgency || "high",
      importance: payload.importance || "max",
      channelId: payload.channelId || "jp-admin-alerts",
      visibility: "public"
    };
  };
  if (!event.data) {
    return {
      title: "JP Innovation",
      options: buildOptions({ url: defaultUrl })
    };
  }
  try {
    const payload = event.data.json();
    return {
      title: payload.title || "JP Innovation",
      options: buildOptions(payload)
    };
  } catch {
    return {
      title: "JP Innovation",
      options: buildOptions({ body: event.data.text(), url: defaultUrl })
    };
  }
}

self.addEventListener("push", (event) => {
  const payload = notificationPayload(event);
  event.waitUntil(self.registration.showNotification(payload.title, payload.options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/hub-portal/index.html?entry=hub&view=notifications", self.location.origin).href;
  event.waitUntil((async () => {
    const openClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of openClients) {
      if ("focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(targetUrl);
        return;
      }
    }
    await self.clients.openWindow(targetUrl);
  })());
});
