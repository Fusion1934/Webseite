const cards = Array.from(document.querySelectorAll(".preview-card"));
let activeCard = null;
let cleanupTransition = null;
const OPEN_DURATION_MS = 520;
const CLOSE_DURATION_MS = 420;
const EASING = "cubic-bezier(0.86, 0, 0.07, 1)";

function setIframeInteractive(card, interactive) {
  const overlay = card.querySelector(".iframe-overlay");
  const iframeWrapper = card.querySelector(".iframe-wrapper");
  const iframe = card.querySelector("iframe");

  if (overlay) overlay.style.display = interactive ? "none" : "block";
  if (iframeWrapper) iframeWrapper.style.pointerEvents = interactive ? "auto" : "none";
  if (iframe) iframe.setAttribute("scrolling", interactive ? "yes" : "no");
}

function stopActiveTransition() {
  if (typeof cleanupTransition === "function") {
    cleanupTransition();
    cleanupTransition = null;
  }
}

function clearInlineAnimationStyles(card) {
  card.style.transition = "";
  card.style.transformOrigin = "";
  card.style.transform = "";
  card.style.borderRadius = "";
}

function animateCardTransform(card, fromTransform, toTransform, fromRadius, toRadius, duration) {
  stopActiveTransition();

  card.style.transition = "none";
  card.style.transformOrigin = "top left";
  card.style.transform = fromTransform;
  card.style.borderRadius = fromRadius;
  card.getBoundingClientRect();

  const handleEnd = (event) => {
    if (event.target !== card || event.propertyName !== "transform") return;
    card.removeEventListener("transitionend", handleEnd);
    cleanupTransition = null;
    clearInlineAnimationStyles(card);
  };

  const fallbackTimer = window.setTimeout(() => {
    card.removeEventListener("transitionend", handleEnd);
    cleanupTransition = null;
    clearInlineAnimationStyles(card);
  }, duration + 80);

  cleanupTransition = () => {
    window.clearTimeout(fallbackTimer);
    card.removeEventListener("transitionend", handleEnd);
    clearInlineAnimationStyles(card);
  };

  card.addEventListener("transitionend", handleEnd);

  requestAnimationFrame(() => {
    card.style.transition = `transform ${duration}ms ${EASING}, border-radius ${duration}ms ${EASING}`;
    card.style.transform = toTransform;
    card.style.borderRadius = toRadius;
  });
}

function openCard(card) {
  if (activeCard || card.dataset.expanded === "true") return;

  const rect = card.getBoundingClientRect();
  const fromTransform = `translate(${rect.left}px, ${rect.top}px) scale(${rect.width / window.innerWidth}, ${rect.height / window.innerHeight})`;

  const iframeWrapper = card.querySelector(".iframe-wrapper");
  if (iframeWrapper) {
    iframeWrapper.style.transition = "none";
    iframeWrapper.style.transform = "scale(1)";
  }

  document.body.classList.add("has-expanded-card");
  card.classList.add("is-expanded");
  card.dataset.expanded = "true";
  setIframeInteractive(card, true);
  activeCard = card;

  animateCardTransform(card, fromTransform, "translate(0px, 0px) scale(1, 1)", "4px", "0px", OPEN_DURATION_MS);
  document.querySelectorAll(".mouse-logo-tooltip").forEach((tt) => tt.classList.remove("is-visible"));
}

function closeCard(card) {
  if (!card || card.dataset.expanded !== "true") return;

  stopActiveTransition();

  // Temporarily restore default layout to measure where the card should return.
  card.classList.remove("is-expanded");
  document.body.classList.remove("has-expanded-card");
  const targetRect = card.getBoundingClientRect();

  document.body.classList.add("has-expanded-card");
  card.classList.add("is-expanded");
  setIframeInteractive(card, false);

  const toTransform = `translate(${targetRect.left}px, ${targetRect.top}px) scale(${targetRect.width / window.innerWidth}, ${targetRect.height / window.innerHeight})`;

  card.style.transition = "none";
  card.style.transformOrigin = "top left";
  card.style.transform = "translate(0px, 0px) scale(1, 1)";
  card.style.borderRadius = "0px";
  card.getBoundingClientRect();

  // finish() removes is-expanded BEFORE clearing inline styles to avoid a snap.
  const finish = () => {
    cleanupTransition = null;
    card.classList.remove("is-expanded");
    card.dataset.expanded = "false";
    document.body.classList.remove("has-expanded-card");
    activeCard = null;
    card.style.transition = "";
    card.style.transformOrigin = "";
    card.style.transform = "";
    card.style.borderRadius = "";
    const iframeWrapper = card.querySelector(".iframe-wrapper");
    if (iframeWrapper) {
      iframeWrapper.style.transition = "";
      iframeWrapper.style.transform = "";
    }
  };

  const fallbackTimer = window.setTimeout(() => {
    card.removeEventListener("transitionend", handleEnd);
    finish();
  }, CLOSE_DURATION_MS + 80);

  const handleEnd = (event) => {
    if (event.target !== card || event.propertyName !== "transform") return;
    card.removeEventListener("transitionend", handleEnd);
    window.clearTimeout(fallbackTimer);
    finish();
  };

  cleanupTransition = () => {
    card.removeEventListener("transitionend", handleEnd);
    window.clearTimeout(fallbackTimer);
    clearInlineAnimationStyles(card);
    cleanupTransition = null;
  };

  card.addEventListener("transitionend", handleEnd);

  requestAnimationFrame(() => {
    card.style.transition = `transform ${CLOSE_DURATION_MS}ms ${EASING}, border-radius ${CLOSE_DURATION_MS}ms ${EASING}`;
    card.style.transform = toTransform;
    card.style.borderRadius = "4px";
  });
}

function updatePreviewScales() {
  const vw = window.innerWidth || 1;
  const vh = window.innerHeight || 1;
  const ratio = `${vw} / ${vh}`;

  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const scale = rect.width / vw;
    card.style.setProperty("--preview-ratio", ratio);
    card.style.setProperty("--preview-scale", `${scale}`);
  });
}

cards.forEach((card) => {
  card.addEventListener("dragstart", (event) => {
    event.preventDefault();
  });

  setIframeInteractive(card, false);

  card.addEventListener("click", (event) => {
    event.preventDefault();

    if (activeCard === card) {
      closeCard(card);
      return;
    }

    if (!activeCard) {
      openCard(card);
    }
  });
});

updatePreviewScales();
window.addEventListener("resize", updatePreviewScales);

window.addEventListener("message", (event) => {
  if (event.data === "close-iframe") {
    closeCard(activeCard);
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCard(activeCard);
  }
});
