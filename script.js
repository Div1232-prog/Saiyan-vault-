/*
 * NEXUS Wallpapers — UI interactions
 *
 * Features:
 * - Live, multi-keyword wallpaper search
 * - Category filters with accessible pressed states
 * - Fullscreen wallpaper preview with keyboard and backdrop controls
 * - Non-blocking download feedback (native download links remain untouched)
 * - Image fallback handling and dynamic footer year
 *
 * This file matches the element IDs and classes in the companion index.html.
 */

(() => {
  "use strict";

  const SELECTORS = {
    searchInput: "#wallpaper-search",
    clearSearch: "#clear-search",
    categoryButtons: ".category-pill",
    grid: "#wallpaper-grid",
    cards: ".wallpaper-card",
    resultCount: "#result-count",
    emptyState: "#empty-state",
    year: "#year"
  };

  const STYLE_ID = "nexus-interaction-styles";
  const MODAL_ID = "wallpaper-lightbox";
  const TOAST_ID = "wallpaper-toast";

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .trim();
  }

  function injectInteractionStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .wallpaper-card[tabindex="0"] { cursor: zoom-in; }
      .wallpaper-card:focus-visible {
        outline: 2px solid rgba(103, 232, 249, 0.9);
        outline-offset: 4px;
      }

      #${MODAL_ID} {
        position: fixed;
        z-index: 1000;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 20px;
        opacity: 0;
        visibility: hidden;
        transition: opacity 180ms ease, visibility 180ms ease;
      }
      #${MODAL_ID}[hidden] { display: none !important; }
      #${MODAL_ID}.is-open {
        opacity: 1;
        visibility: visible;
      }
      #${MODAL_ID} .lightbox-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.88);
        -webkit-backdrop-filter: blur(12px);
        backdrop-filter: blur(12px);
      }
      #${MODAL_ID} .lightbox-panel {
        position: relative;
        z-index: 1;
        display: flex;
        width: min(100%, 620px);
        max-height: calc(100vh - 40px);
        flex-direction: column;
        overflow: hidden;
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 20px;
        background: rgba(8, 12, 22, 0.96);
        box-shadow: 0 24px 90px rgba(0, 0, 0, 0.62), 0 0 45px rgba(139, 92, 246, 0.10);
        transform: translateY(12px) scale(0.985);
        transition: transform 180ms ease;
      }
      #${MODAL_ID}.is-open .lightbox-panel { transform: translateY(0) scale(1); }
      #${MODAL_ID} .lightbox-close {
        position: absolute;
        z-index: 3;
        top: 12px;
        right: 12px;
        display: grid;
        width: 42px;
        height: 42px;
        place-items: center;
        border: 1px solid rgba(226, 232, 240, 0.22);
        border-radius: 50%;
        background: rgba(2, 6, 23, 0.76);
        color: #f1f5f9;
        cursor: pointer;
        font: inherit;
        font-size: 1.65rem;
        line-height: 1;
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
      }
      #${MODAL_ID} .lightbox-close:hover {
        border-color: rgba(196, 181, 253, 0.7);
        background: rgba(30, 27, 55, 0.92);
      }
      #${MODAL_ID} .lightbox-image-wrap {
        display: grid;
        min-height: 120px;
        max-height: calc(100vh - 116px);
        place-items: center;
        overflow: auto;
        background: #030407;
      }
      #${MODAL_ID} .lightbox-image {
        display: block;
        width: auto;
        max-width: 100%;
        height: auto;
        max-height: calc(100vh - 116px);
        object-fit: contain;
      }
      #${MODAL_ID} .lightbox-image[hidden] { display: none !important; }
      #${MODAL_ID} .lightbox-image-fallback {
        display: none;
        padding: 48px 24px;
        color: #aab2c1;
        text-align: center;
        font-size: 0.9rem;
      }
      #${MODAL_ID} .lightbox-image-fallback.is-visible { display: block; }
      #${MODAL_ID} .lightbox-caption {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 15px 18px;
        border-top: 1px solid rgba(148, 163, 184, 0.16);
      }
      #${MODAL_ID} .lightbox-category {
        margin: 0 0 4px;
        color: #b9a7ff;
        font-size: 0.66rem;
        font-weight: 750;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      #${MODAL_ID} .lightbox-title {
        margin: 0;
        color: #f1f1f5;
        font-size: 1rem;
        font-weight: 750;
      }
      #${MODAL_ID} .lightbox-download {
        flex: 0 0 auto;
        padding: 10px 13px;
        border: 1px solid rgba(167, 139, 250, 0.42);
        border-radius: 10px;
        background: rgba(124, 58, 237, 0.18);
        color: #f0edff;
        font-size: 0.76rem;
        font-weight: 750;
        text-decoration: none;
      }
      #${MODAL_ID} .lightbox-download:hover {
        border-color: rgba(196, 181, 253, 0.8);
        background: rgba(124, 58, 237, 0.3);
      }

      #${TOAST_ID} {
        position: fixed;
        z-index: 1100;
        right: max(18px, env(safe-area-inset-right));
        bottom: max(18px, env(safe-area-inset-bottom));
        max-width: min( calc(100vw - 36px), 360px );
        padding: 12px 16px;
        border: 1px solid rgba(167, 139, 250, 0.34);
        border-radius: 13px;
        background: rgba(15, 23, 42, 0.94);
        color: #e9e7f5;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.42);
        font-size: 0.82rem;
        line-height: 1.45;
        opacity: 0;
        pointer-events: none;
        transform: translateY(10px);
        transition: opacity 180ms ease, transform 180ms ease;
      }
      #${TOAST_ID}.is-visible {
        opacity: 1;
        transform: translateY(0);
      }

      @media (max-width: 520px) {
        #${MODAL_ID} { padding: 10px; }
        #${MODAL_ID} .lightbox-panel { max-height: calc(100vh - 20px); border-radius: 16px; }
        #${MODAL_ID} .lightbox-image-wrap { max-height: calc(100vh - 100px); }
        #${MODAL_ID} .lightbox-image { max-height: calc(100vh - 100px); }
        #${MODAL_ID} .lightbox-caption { padding: 12px; }
        #${MODAL_ID} .lightbox-download { padding: 9px 10px; }
      }
      @media (prefers-reduced-motion: reduce) {
        #${MODAL_ID}, #${MODAL_ID} .lightbox-panel, #${TOAST_ID} {
          transition-duration: 0.01ms;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createLightbox() {
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "lightbox-title");

    const backdrop = document.createElement("div");
    backdrop.className = "lightbox-backdrop";
    backdrop.setAttribute("aria-hidden", "true");

    const panel = document.createElement("div");
    panel.className = "lightbox-panel";

    const closeButton = document.createElement("button");
    closeButton.className = "lightbox-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close wallpaper preview");
    closeButton.textContent = "×";

    const imageWrap = document.createElement("div");
    imageWrap.className = "lightbox-image-wrap";

    const previewImage = document.createElement("img");
    previewImage.className = "lightbox-image";
    previewImage.alt = "";
    previewImage.decoding = "async";

    const fallback = document.createElement("p");
    fallback.className = "lightbox-image-fallback";
    fallback.textContent = "This wallpaper preview is unavailable. Add the image file to the wallpapers folder.";

    imageWrap.append(previewImage, fallback);

    const caption = document.createElement("div");
    caption.className = "lightbox-caption";

    const textGroup = document.createElement("div");
    const category = document.createElement("p");
    category.className = "lightbox-category";
    category.textContent = "Wallpaper";

    const title = document.createElement("h2");
    title.className = "lightbox-title";
    title.id = "lightbox-title";
    title.textContent = "Wallpaper preview";
    textGroup.append(category, title);

    const download = document.createElement("a");
    download.className = "lightbox-download";
    download.textContent = "Download 4K";
    download.setAttribute("aria-label", "Download this wallpaper in 4K");

    caption.append(textGroup, download);
    panel.append(closeButton, imageWrap, caption);
    modal.append(backdrop, panel);
    document.body.appendChild(modal);

    closeButton.addEventListener("click", closeLightbox);
    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target === backdrop) {
        closeLightbox();
        return;
      }

      const target = event.target;
      if (target instanceof Element && target.closest(".lightbox-download")) {
        const currentTitle = modal.querySelector(".lightbox-title")?.textContent.trim() || "Wallpaper";
        showToast(`Download requested: ${currentTitle}`);
      }
    });

    previewImage.addEventListener("error", () => {
      previewImage.hidden = true;
      fallback.classList.add("is-visible");
    });

    return modal;
  }

  function createToast() {
    let toast = document.getElementById(TOAST_ID);
    if (toast) return toast;

    toast = document.createElement("div");
    toast.id = TOAST_ID;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.setAttribute("aria-atomic", "true");
    toast.hidden = false;
    document.body.appendChild(toast);
    return toast;
  }

  let activeCard = null;
  let previousFocus = null;
  let previousBodyOverflow = "";
  let toastTimer = 0;

  function getLightboxElements() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return null;

    return {
      modal,
      closeButton: modal.querySelector(".lightbox-close"),
      image: modal.querySelector(".lightbox-image"),
      fallback: modal.querySelector(".lightbox-image-fallback"),
      category: modal.querySelector(".lightbox-category"),
      title: modal.querySelector(".lightbox-title"),
      download: modal.querySelector(".lightbox-download")
    };
  }

  function openLightbox(card) {
    const elements = getLightboxElements();
    if (!elements || !card) return;

    const sourceImage = card.querySelector(".wallpaper-media img");
    const sourceDownload = card.querySelector(".download-button");
    const title = card.querySelector(".card-title")?.textContent.trim() || "Wallpaper preview";
    const category = card.dataset.category || "Wallpaper";
    const imageSource = sourceDownload?.getAttribute("href") || sourceImage?.currentSrc || sourceImage?.getAttribute("src");

    elements.title.textContent = title;
    elements.category.textContent = category;
    elements.fallback.classList.remove("is-visible");
    elements.image.hidden = false;
    elements.image.alt = sourceImage?.alt || `${title} wallpaper preview`;

    if (imageSource) {
      elements.image.src = imageSource;
    } else {
      elements.image.hidden = true;
      elements.fallback.classList.add("is-visible");
    }

    if (sourceDownload) {
      elements.download.href = sourceDownload.href;
      const downloadName = sourceDownload.getAttribute("download");
      if (downloadName) {
        elements.download.setAttribute("download", downloadName);
      } else {
        elements.download.removeAttribute("download");
      }
      elements.download.hidden = false;
    } else {
      elements.download.hidden = true;
    }

    previousFocus = document.activeElement;
    activeCard = card;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    elements.modal.hidden = false;
    requestAnimationFrame(() => {
      elements.modal.classList.add("is-open");
      elements.closeButton.focus();
    });
  }

  function closeLightbox() {
    const elements = getLightboxElements();
    if (!elements || elements.modal.hidden) return;

    elements.modal.classList.remove("is-open");
    elements.modal.hidden = true;
    elements.image.removeAttribute("src");
    elements.image.hidden = false;
    elements.fallback.classList.remove("is-visible");
    document.body.style.overflow = previousBodyOverflow;

    const focusTarget = activeCard || previousFocus;
    if (focusTarget && typeof focusTarget.focus === "function") {
      focusTarget.focus({ preventScroll: true });
    }

    activeCard = null;
    previousFocus = null;
  }

  function showToast(message) {
    const toast = document.getElementById(TOAST_ID);
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 2400);
  }

  function initializeWallpaperInteractions() {
    const searchInput = document.querySelector(SELECTORS.searchInput);
    const clearButton = document.querySelector(SELECTORS.clearSearch);
    const categoryButtons = Array.from(document.querySelectorAll(SELECTORS.categoryButtons));
    const grid = document.querySelector(SELECTORS.grid);
    const cards = Array.from(document.querySelectorAll(SELECTORS.cards));
    const resultCount = document.querySelector(SELECTORS.resultCount);
    const emptyState = document.querySelector(SELECTORS.emptyState);
    const year = document.querySelector(SELECTORS.year);

    if (!grid || cards.length === 0) {
      console.warn("NEXUS Wallpapers: wallpaper grid or cards were not found.");
      return;
    }

    injectInteractionStyles();
    createLightbox();
    createToast();

    let activeCategory = "All";

    function updateWallpapers() {
      const query = normalizeText(searchInput?.value || "");
      const keywords = query ? query.split(/\s+/).filter(Boolean) : [];
      let visibleCount = 0;

      cards.forEach((card) => {
        const category = normalizeText(card.dataset.category || "");
        const searchableText = normalizeText(
          `${card.dataset.search || ""} ${card.textContent || ""} ${category}`
        );
        const categoryMatches = activeCategory === "All" || category === normalizeText(activeCategory);
        const searchMatches = keywords.every((keyword) => searchableText.includes(keyword));
        const isVisible = categoryMatches && searchMatches;

        card.hidden = !isVisible;
        if (isVisible) visibleCount += 1;
      });

      if (resultCount) {
        resultCount.textContent = `Showing ${visibleCount} ${visibleCount === 1 ? "wallpaper" : "wallpapers"}`;
      }
      if (emptyState) emptyState.classList.toggle("is-visible", visibleCount === 0);
      grid.hidden = visibleCount === 0;
      if (clearButton) clearButton.classList.toggle("is-visible", Boolean(searchInput?.value));
    }

    categoryButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeCategory = button.dataset.filter || "All";

        categoryButtons.forEach((categoryButton) => {
          categoryButton.setAttribute("aria-pressed", String(categoryButton === button));
        });

        updateWallpapers();
      });
    });

    searchInput?.addEventListener("input", updateWallpapers);

    clearButton?.addEventListener("click", () => {
      if (!searchInput) return;
      searchInput.value = "";
      updateWallpapers();
      searchInput.focus();
    });

    // Use event delegation so the grid also supports wallpapers added later.
    grid.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const downloadLink = target.closest(".download-button");
      if (downloadLink) {
        const card = downloadLink.closest(".wallpaper-card");
        const title = card?.querySelector(".card-title")?.textContent.trim() || "Wallpaper";
        showToast(`Download requested: ${title}`);
        return; // Preserve the browser's native direct download behavior.
      }

      const card = target.closest(".wallpaper-card");
      if (card && !card.hidden) {
        openLightbox(card);
      }
    });

    cards.forEach((card) => {
      if (!card.hasAttribute("tabindex")) card.tabIndex = 0;
      card.setAttribute("aria-haspopup", "dialog");
      const title = card.querySelector(".card-title")?.textContent.trim() || "wallpaper";
      card.setAttribute("aria-label", `Preview ${title}`);

      card.addEventListener("keydown", (event) => {
        if (event.target !== card) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (!card.hidden) openLightbox(card);
        }
      });
    });

    // Keep broken image assets from leaving a broken-image icon in the card.
    grid.querySelectorAll(".wallpaper-media img").forEach((image) => {
      image.addEventListener("error", () => {
        image.hidden = true;
        const placeholder = image.parentElement?.querySelector(".image-placeholder");
        if (placeholder) placeholder.hidden = false;
      }, { once: true });
    });

    document.addEventListener("keydown", (event) => {
      const elements = getLightboxElements();
      if (!elements || elements.modal.hidden) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
        return;
      }

      // Keep keyboard focus inside the open dialog.
      if (event.key === "Tab") {
        const focusable = Array.from(
          elements.modal.querySelectorAll('a[href]:not([hidden]), button:not([disabled]):not([hidden])')
        ).filter((element) => element.offsetParent !== null);

        if (focusable.length === 0) {
          event.preventDefault();
          elements.closeButton.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    if (year) year.textContent = String(new Date().getFullYear());
    updateWallpapers();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeWallpaperInteractions, { once: true });
  } else {
    initializeWallpaperInteractions();
  }
})();
