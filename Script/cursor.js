/* cursor.js – directional cursor matching Cursor.svg */
(function () {
  'use strict';

  // Skip on touch/mobile devices (no hover capability)
  if (window.matchMedia('(hover: none)').matches) return;

  // ── Cursor paths (verbatim from Cursor.svg, viewBox 0 0 58 63) ────────
  var D_OUTER =
    'M21.751 8.57321C24.6031 2.37715 33.4043 2.36346 36.2754 8.55075' +
    'L52.6416 43.8242C56.1116 51.3026 47.3697 58.5062 40.6924 53.6709' +
    'L30.208 46.0781C29.5014 45.5665 28.5445 45.5723 27.8437 46.0918' +
    'L17.4697 53.7832C10.819 58.7134 1.97664 51.5312 5.43846 44.0107Z';

  var D_INNER =
    'M8.16348 45.2655L24.4762 9.82761C26.2588 5.95505 31.7593 5.9467' +
    ' 33.5536 9.81384L49.9204 45.0872C52.0892 49.7612 46.6257 54.2634' +
    ' 42.4524 51.2414L31.9673 43.6487C30.2008 42.3696 27.809 42.383' +
    ' 26.057 43.6819L15.6832 51.3728C11.5265 54.4545 5.99982 49.9659' +
    ' 8.16348 45.2655Z';

  // ── Geometry ───────────────────────────────────────────────────────────
  var W = 46, H = Math.round(46 * 63 / 58); // 46 × 50 CSS px

  // Tip: topmost point of outer arc ≈ viewBox (29, 3.9)
  var TIP_X = Math.round(29 / 58 * W);  // ≈ 23
  var TIP_Y = Math.round(3.9 / 63 * H); // ≈ 3

  var CLIP_FULL = 60; // viewBox units for full hover reveal
  var CX = 29, CY = 32; // shape center for click-scale transform

  // ── CSS ────────────────────────────────────────────────────────────────
  var css = document.createElement('style');
  css.textContent = [
    '*, *::before, *::after { cursor: none !important; }',
    '.is-dragging, .is-dragging * { cursor: none !important; }',
    '#jc {',
    '  position: fixed; top: 0; left: 0;',
    '  pointer-events: none;',
    '  z-index: 2147483647;',
    '  will-change: transform;',
    '  -webkit-transform-origin: ' + TIP_X + 'px ' + TIP_Y + 'px;',
    '  transform-origin: '         + TIP_X + 'px ' + TIP_Y + 'px;',
    '}',
    '#jc svg { display: block; overflow: visible; }'
  ].join('\n');
  document.head.appendChild(css);

  // ── Cursor element ─────────────────────────────────────────────────────
  var el = document.createElement('div');
  el.id = 'jc';
  el.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg"' +
    '     width="' + W + '" height="' + H + '" viewBox="0 0 58 63">' +
    '  <defs>' +
    '    <clipPath id="jc-clip" clipPathUnits="userSpaceOnUse">' +
    '      <rect id="jc-rect" x="-2" y="-2" width="62" height="0"/>' +
    '    </clipPath>' +
    '  </defs>' +
    '  <path d="' + D_OUTER + '"' +
    '        fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="2"/>' +
    '  <g id="jc-fill">' +
    '    <path d="' + D_INNER + '" fill="#6C7FEF"/>' +
    '    <path d="' + D_INNER + '" fill="#ffffff" clip-path="url(#jc-clip)"/>' +
    '  </g>' +
    '</svg>';
  document.body.appendChild(el);

  var clipRect  = document.getElementById('jc-rect');
  var fillGroup = document.getElementById('jc-fill');

  // ── State ──────────────────────────────────────────────────────────────
  var mx = -999, my = -999;
  var pmx = -999, pmy = -999;
  var vx = 0, vy = 0;

  var angle    = -90;
  var tgtAngle = -90;
  var angVel   = 0;

  var clipH    = 0;
  var tgtClipH = 0;

  var fillScale    = 1;
  var tgtFillScale = 1;

  var active = false;

  // ── Helpers ────────────────────────────────────────────────────────────
  function shortDelta(from, to) {
    return ((to - from + 540) % 360) - 180;
  }

  function setFillTransform(s) {
    if (Math.abs(s - 1) < 0.001) {
      fillGroup.removeAttribute('transform');
      return;
    }
    fillGroup.setAttribute('transform',
      'translate(' + CX + ' ' + CY + ')' +
      ' scale(' + s.toFixed(4) + ')' +
      ' translate(' + (-CX) + ' ' + (-CY) + ')'
    );
  }

  var INTERACTIVE =
    'a, button, [role="button"], input, select, textarea, label, ' +
    '.preview-card, .close-button, .logo-item';

  function checkHover(x, y) {
    var target = document.elementFromPoint(x, y);
    tgtClipH = (target && target.closest(INTERACTIVE)) ? CLIP_FULL : 0;
  }

  // ── Position tracking ──────────────────────────────────────────────────
  // Uses both pointermove and mousemove so the cursor keeps following even
  // when setPointerCapture routes pointer events away from the document in
  // some browsers. Deduplication prevents double velocity updates.
  var lastTrackedX = null, lastTrackedY = null;

  function handleMove(clientX, clientY) {
    // Deduplicate: skip if this exact position was already handled this frame
    if (clientX === lastTrackedX && clientY === lastTrackedY) return;
    lastTrackedX = clientX;
    lastTrackedY = clientY;

    var dx = clientX - pmx;
    var dy = clientY - pmy;

    vx += (dx - vx) * 0.15;
    vy += (dy - vy) * 0.15;

    var speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > 0.3) {
      tgtAngle = Math.atan2(vy, vx) * (180 / Math.PI) + 90;
    }

    pmx = mx;  pmy = my;
    mx = clientX;  my = clientY;

    if (!active) {
      active   = true;
      angle    = tgtAngle;
      angVel   = 0;
    }
  }

  // pointermove: works during setPointerCapture (events retargeted but still bubble)
  window.addEventListener('pointermove', function (e) {
    if (e.isPrimary) handleMove(e.clientX, e.clientY);
  });

  // mousemove: fallback for browsers that drop pointermove during capture
  window.addEventListener('mousemove', function (e) {
    handleMove(e.clientX, e.clientY);
  });

  window.addEventListener('pointerleave', function (e) {
    if (e.isPrimary) active = false;
  });

  // ── Hover detection ────────────────────────────────────────────────────
  document.addEventListener('pointerover', function (e) {
    if (!e.isPrimary) return;
    tgtClipH = e.target.closest(INTERACTIVE) ? CLIP_FULL : 0;
  });

  // ── Click animation ────────────────────────────────────────────────────
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) tgtFillScale = 1.22;
  });

  function onRelease(e) {
    if (!e.isPrimary) return;
    tgtFillScale = 1;
    // Re-evaluate hover: pointerover won't re-fire after capture ends
    checkHover(e.clientX, e.clientY);
  }

  document.addEventListener('pointerup',     onRelease);
  document.addEventListener('pointercancel', onRelease);

  // ── Render loop ────────────────────────────────────────────────────────
  function tick() {
    // Reset deduplication flag each frame so new events are accepted
    lastTrackedX = null;
    lastTrackedY = null;

    // Spring for rotation — low stiffness + high damping = flowing glide
    var delta = shortDelta(angle, tgtAngle);
    angVel  += delta * 0.055;
    angVel  *= 0.84;
    angle   += angVel;

    // Slow lerp for hover clip reveal (tip-to-tail wipe)
    clipH += (tgtClipH - clipH) * 0.06;
    clipRect.setAttribute('height', clipH < 0.1 ? 0 : clipH);

    // Lerp for click scale
    fillScale += (tgtFillScale - fillScale) * 0.18;
    setFillTransform(fillScale);

    // Position: tip pinned to pointer, rotated around tip
    var t = active
      ? 'translate(' + (mx - TIP_X) + 'px,' + (my - TIP_Y) + 'px)' +
        ' rotate(' + angle + 'deg)'
      : 'translate(-999px,-999px)';

    el.style.webkitTransform = t;
    el.style.transform       = t;

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

}());
