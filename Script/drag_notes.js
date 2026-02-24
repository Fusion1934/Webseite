document.addEventListener("DOMContentLoaded", () => {
  const draggableItems = document.querySelectorAll(
    ".note, .note-card, .skills-page .polaroid, .skills-page .logo-item"
  );
  if (!draggableItems.length) return;
  const mobileQuery = window.matchMedia("(max-width: 700px)");

  let active = null;
  let zCounter = 200;

  const parseTranslate = (value) => {
    if (!value || value === "none") return { x: 0, y: 0 };
    const parts = value.trim().split(/\s+/);
    const x = Number.parseFloat(parts[0]) || 0;
    const y = Number.parseFloat(parts[1]) || 0;
    return { x, y };
  };

  const getBoundsContainer = (element) => {
    // Logos are intentionally positioned beyond the tool-icons box, so using that box
    // as the drag boundary causes snapping/jitter. Constrain them to the page instead.
    if (element.classList.contains("logo-item")) {
      return element.closest(".page") || document.body;
    }

    return element.closest(".tool-icons, .split, .page") || element.parentElement || document.body;
  };

  const onPointerMove = (event) => {
    if (!active) return;

    const dx = event.clientX - active.startPointerX;
    const dy = event.clientY - active.startPointerY;

    let nextX = active.startTranslateX + dx;
    let nextY = active.startTranslateY + dy;

    nextX = Math.min(active.maxX, Math.max(active.minX, nextX));
    nextY = Math.min(active.maxY, Math.max(active.minY, nextY));

    active.element.style.translate = `${nextX}px ${nextY}px`;
  };

  const endDrag = () => {
    if (!active) return;
    active.element.classList.remove("is-dragging");
    try {
      active.element.releasePointerCapture(active.pointerId);
    } catch {
      // Ignore when capture is already released.
    }
    active = null;
  };

  const resetDraggedPositions = () => {
    endDrag();
    draggableItems.forEach((element) => {
      element.style.translate = "";
      element.style.zIndex = "";
      element.classList.remove("is-dragging");
    });
  };

  draggableItems.forEach((element) => {
    element.addEventListener("dragstart", (event) => {
      event.preventDefault();
    });

    element.addEventListener("pointerdown", (event) => {
      if (mobileQuery.matches) return;
      if (event.button !== 0) return;

      const boundsElement = getBoundsContainer(element);
      const pageBoundsElement = element.closest(".page") || document.body;
      const currentTranslate = parseTranslate(getComputedStyle(element).translate);
      const elementRect = element.getBoundingClientRect();
      const boundsRect = boundsElement.getBoundingClientRect();
      const pageBoundsRect = pageBoundsElement.getBoundingClientRect();

      // If the local layout container is too tight on one axis (common for flex/grid rows),
      // fall back to page bounds for that axis so dragging still feels responsive.
      const xBoundsRect =
        boundsRect.width - elementRect.width > 24 ? boundsRect : pageBoundsRect;
      const yBoundsRect =
        boundsRect.height - elementRect.height > 24 ? boundsRect : pageBoundsRect;

      active = {
        element,
        pointerId: event.pointerId,
        startPointerX: event.clientX,
        startPointerY: event.clientY,
        startTranslateX: currentTranslate.x,
        startTranslateY: currentTranslate.y,
        minX: currentTranslate.x + (xBoundsRect.left - elementRect.left),
        maxX: currentTranslate.x + (xBoundsRect.right - elementRect.right),
        minY: currentTranslate.y + (yBoundsRect.top - elementRect.top),
        maxY: currentTranslate.y + (yBoundsRect.bottom - elementRect.bottom),
      };

      zCounter += 1;
      element.style.zIndex = String(zCounter);
      element.classList.add("is-dragging");
      element.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
  });

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);
  window.addEventListener("resize", resetDraggedPositions);
  window.addEventListener("orientationchange", resetDraggedPositions);
  mobileQuery.addEventListener("change", resetDraggedPositions);
});
