// script_start.js
// The main interactions for Start.html are handled by CSS (transforms and hovers).
// The custom cursor is static as requested in the plan.
// Iframes are scaled and disabled via CSS.

console.log("Start page loaded");

// Prevent drag on cards so they don't interfere with the link click if user clicks and drags
document.querySelectorAll('.preview-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
        e.preventDefault();
    });
});
