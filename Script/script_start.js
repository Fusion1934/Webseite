// script_start.js

console.log("Start page loaded");

// Prevent drag on cards so they don't interfere with the link click if user clicks and drags
document.querySelectorAll('.preview-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
        e.preventDefault();
    });

    card.addEventListener('click', (e) => {
        // Only trigger expansion on cards with actual links, or just all of them for now
        e.preventDefault(); // Prevent immediate navigation

        if (card.dataset.expanded === "true") return;

        // 1. First: Get current layout properties (the fanned out card)
        const rect = card.getBoundingClientRect();

        // 2. Last: Add expanded class to calculate full screen target
        card.classList.add('is-expanded');
        card.dataset.expanded = "true";

        // 3. Play: Animate from 'First' to 'Last'
        card.animate([
            {
                position: 'fixed',
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                margin: '0',
                transform: 'none',
                borderRadius: '4px',
                zIndex: 9999
            },
            {
                position: 'fixed',
                top: '0px',
                left: '0px',
                width: '100vw',
                height: '100vh',
                margin: '0',
                transform: 'none',
                borderRadius: '0px',
                zIndex: 9999
            }
        ], {
            duration: 500,
            easing: 'cubic-bezier(0.86, 0, 0.07, 1)'
        });

        // Allow pointer events on the iframe so the user can interact
        const overlay = card.querySelector('.iframe-overlay');
        if (overlay) overlay.style.display = 'none';

        const iframeWrapper = card.querySelector('.iframe-wrapper');
        if (iframeWrapper) {
            iframeWrapper.style.pointerEvents = 'auto';
            // We need the iframe to act like a normal page now
            iframeWrapper.classList.add('active-iframe');
        }

        // Hide tooltips
        document.querySelectorAll('.mouse-logo-tooltip').forEach(tt => tt.classList.remove('is-visible'));
    });
});

// We need a way to close the expanded card. Since the close button is IN the iframe,
// we can listen for a postMessage from the iframe, OR we can add a close button here.
// Since the prompt says "Each of the cards have an x-button to close", if that X is inside
// the Contact/Skills HTML, we must inject a script into those or use window.parent.postMessage.
// Let's listen for postMessages.
window.addEventListener('message', (event) => {
    if (event.data === 'close-iframe') {
        const expandedCard = document.querySelector('.preview-card.is-expanded');
        if (expandedCard) {
            expandedCard.dataset.expanded = "false";

            const overlay = expandedCard.querySelector('.iframe-overlay');
            if (overlay) overlay.style.display = 'block';

            const iframeWrapper = expandedCard.querySelector('.iframe-wrapper');
            if (iframeWrapper) {
                iframeWrapper.style.pointerEvents = 'none';
                iframeWrapper.classList.remove('active-iframe');
            }

            // Remove class to restore standard layout (fanned out position)
            expandedCard.classList.remove('is-expanded');

            // Get the destination bounds
            const destRect = expandedCard.getBoundingClientRect();

            // Animate from fullscreen to destination
            expandedCard.animate([
                {
                    position: 'fixed',
                    top: '0px',
                    left: '0px',
                    width: '100vw',
                    height: '100vh',
                    margin: '0',
                    transform: 'none',
                    borderRadius: '0px',
                    zIndex: 9999
                },
                {
                    position: 'fixed',
                    top: `${destRect.top}px`,
                    left: `${destRect.left}px`,
                    width: `${destRect.width}px`,
                    height: `${destRect.height}px`,
                    margin: '0',
                    transform: 'none',
                    borderRadius: '4px',
                    zIndex: 9999
                }
            ], {
                duration: 500,
                easing: 'cubic-bezier(0.86, 0, 0.07, 1)'
            });
        }
    }
});
