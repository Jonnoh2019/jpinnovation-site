export class OverlayManager {
  #active = null;
  #previousOverflow = "";

  open({ name, element, opener }) {
    this.close();
    this.#active = { name, element, opener };
    this.#previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.classList.add("overlay-open");
    element.dataset.overlayOpen = "true";
  }

  close({ restoreFocus = true } = {}) {
    if (!this.#active) return;
    const { element, opener } = this.#active;
    element.remove();
    document.body.style.overflow = this.#previousOverflow;
    document.documentElement.classList.remove("overlay-open");
    this.#active = null;
    if (restoreFocus && opener?.isConnected) opener.focus();
  }

  get activeName() {
    return this.#active?.name || null;
  }
}
