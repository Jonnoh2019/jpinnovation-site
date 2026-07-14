self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function notificationPayload(event) {
  if (!event.data) {
    return {
      title: "JP Innovation",
      options: {
        body: "You have a new Hub update.",
        url: "/hub-portal/index.html?entry=hub&view=notifications"
      }
    };
  }
  try {
    const payload = event.data.json();
    return {
      title: payload.title || "JP Innovation",
      options: {
        body: payload.body || payload.message || "You have a new Hub update.",
        icon: payload.icon || "/assets/jp-app-icon-192.png",
        badge: payload.badge || "/assets/jp-app-icon-180.png",
        tag: payload.tag || "jp-innovation-alert",
        renotify: true,
        data: { url: payload.url || "/hub-portal/index.html?entry=hub&view=notifications" }
      }
    };
  } catch {
    return {
      title: "JP Innovation",
      options: {
        body: event.data.text() || "You have a new Hub update.",
        icon: "/assets/jp-app-icon-192.png",
        badge: "/assets/jp-app-icon-180.png",
        tag: "jp-innovation-alert",
        data: { url: "/hub-portal/index.html?entry=hub&view=notifications" }
      }
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
