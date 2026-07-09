(function () {
  const supabaseUrl = "https://ueqdkiwouxhhdhdmjlsl.supabase.co";
  const supabasePublishableKey = "sb_publishable_nLAyyfVIBq_eM3TzZQHb-g_EV-knjl-";
  const storageKey = "jpInnovationVisitorId";

  function getClient() {
    if (!window.supabase?.createClient) return null;
    if (!window.jpAnalyticsClient) {
      window.jpAnalyticsClient = window.supabase.createClient(supabaseUrl, supabasePublishableKey);
    }
    return window.jpAnalyticsClient;
  }

  function visitorId() {
    try {
      let id = window.localStorage.getItem(storageKey);
      if (!id) {
        id = (window.crypto?.randomUUID && window.crypto.randomUUID()) || `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        window.localStorage.setItem(storageKey, id);
      }
      return id;
    } catch {
      return "visitor-storage-unavailable";
    }
  }

  function deviceType() {
    const width = window.innerWidth || 0;
    if (width <= 640) return "mobile";
    if (width <= 1024) return "tablet";
    return "desktop";
  }

  function normalisePath() {
    const path = window.location.pathname || "/";
    if (path.endsWith("/index.html")) return path.replace(/index\.html$/, "");
    return path;
  }

  async function trackPageView() {
    const client = getClient();
    if (!client) return;
    try {
      await client.from("page_views").insert({
        visitor_id: visitorId(),
        page_path: normalisePath(),
        page_title: document.title || "",
        referrer: document.referrer ? document.referrer.slice(0, 500) : "",
        device_type: deviceType(),
        viewport_width: window.innerWidth || null
      });
    } catch {
      // Analytics should never interrupt the website if the table/policies are not ready.
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", trackPageView, { once: true });
  } else {
    trackPageView();
  }
})();
