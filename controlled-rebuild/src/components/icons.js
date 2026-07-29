const icons = {
  bell: "●",
  chart: "▥",
  mail: "✉",
  settings: "⚙",
  shield: "✓",
  user: "○",
  menu: "☰",
  home: "⌂",
  close: "×"
};

export function icon(name) {
  return `<span class="ui-icon" aria-hidden="true">${icons[name] || "•"}</span>`;
}
