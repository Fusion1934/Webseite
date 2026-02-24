document.addEventListener("DOMContentLoaded", () => {
  const logoItems = document.querySelectorAll(".logo-item");
  if (!logoItems.length) return;

  const tooltip = document.createElement("div");
  tooltip.className = "mouse-logo-tooltip";
  document.body.appendChild(tooltip);

  const offsetX = 14;
  const offsetY = 20;

  const moveTooltip = (event) => {
    tooltip.style.transform = `translate3d(${event.clientX + offsetX}px, ${event.clientY + offsetY}px, 0)`;
  };

  logoItems.forEach((item) => {
    const labelNode = item.querySelector(".logo-label");
    const img = item.querySelector("img");
    const label = labelNode?.textContent?.trim() || img?.alt?.replace(/\s+logo$/i, "") || "Logo";

    item.addEventListener("mouseenter", (event) => {
      if (item.classList.contains("is-dragging")) return;
      tooltip.textContent = label;
      tooltip.classList.add("is-visible");
      moveTooltip(event);
    });

    item.addEventListener("mousemove", (event) => {
      if (item.classList.contains("is-dragging")) return;
      moveTooltip(event);
    });

    item.addEventListener("pointerdown", () => {
      tooltip.classList.remove("is-visible");
    });

    item.addEventListener("mouseleave", () => {
      tooltip.classList.remove("is-visible");
    });
  });
});
