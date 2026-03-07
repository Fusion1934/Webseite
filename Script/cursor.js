/* cursor.js – animated gradient cursor matching Cursor.svg */
(function () {
  'use strict';

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
  var W = 46, H = Math.round(46 * 63 / 58);
  var TIP_X = Math.round(29 / 58 * W);
  var TIP_Y = Math.round(3.9 / 63 * H);
  var CX = 29, CY = 32;

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
    '#jc svg { display: block; overflow: visible; }',
    '@keyframes jc-wobble {',
    '  0%,100% { transform: scale(1, 1)         rotate(0deg); }',
    '  28%     { transform: scale(1.045, 0.955) rotate(0.6deg); }',
    '  58%     { transform: scale(0.96,  1.04)  rotate(-0.6deg); }',
    '  82%     { transform: scale(1.025, 0.975) rotate(0.3deg); }',
    '}',
    '#jc-wobble {',
    '  transform-box: fill-box;',
    '  transform-origin: center;',
    '  animation: jc-wobble 3.4s ease-in-out infinite;',
    '}',
    '@media (max-width: 800px) {',
    '  *, *::before, *::after { cursor: auto !important; }',
    '  .is-dragging, .is-dragging * { cursor: auto !important; }',
    '  #jc { display: none; }',
    '}'
  ].join('\n');
  document.head.appendChild(css);

  // ── Cursor element ─────────────────────────────────────────────────────
  var el = document.createElement('div');
  el.id = 'jc';

  el.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg"' +
    '     width="' + W + '" height="' + H + '" viewBox="0 0 58 63">' +
    '<defs>' +

    // Glow filter
    '<filter id="jc-blur" x="-60%" y="-60%" width="220%" height="220%">' +
    '  <feGaussianBlur stdDeviation="3" in="SourceGraphic"/>' +
    '</filter>' +

    // Directional gradient — tip (magenta) to tail (pearl white) in local
    // SVG space. CSS rotate() on #jc carries it automatically so it always
    // faces the cursor's movement direction with zero delay.
    '<linearGradient id="jc-grad" gradientUnits="userSpaceOnUse"' +
    '    x1="29" y1="-2" x2="29" y2="60">' +
    '  <stop offset="0%"   stop-color="#d946ef"/>' +
    '  <stop id="jc-grad-mid" offset="50%"  stop-color="#3b82f6"/>' +
    '  <stop offset="100%" stop-color="#f8fafc"/>' +
    '</linearGradient>' +

    '</defs>' +

    // Wrapper for CSS wobble
    '<g id="jc-wobble">' +

    // Speed-deformation group: stretches along local Y (tip→tail) when moving fast,
    // squishes when decelerating. Scaled around the shape center via SVG transform.
    '<g id="jc-deform">' +

    // Blurred glow layer (same gradient, soft edges)
    '<path d="' + D_INNER + '" fill="url(#jc-grad)"' +
    '      filter="url(#jc-blur)" opacity="0.65"/>' +

    // Click-scale group
    '<g id="jc-fill">' +

    // Sharp gradient body
    '<path d="' + D_INNER + '" fill="url(#jc-grad)"/>' +

    // Pearl white hover overlay — opacity driven by JS pulse animation.
    '<path id="jc-white" d="' + D_INNER + '" fill="#f8fafc" opacity="0"/>' +

    '</g>' + // #jc-fill

    // Subtle outline
    '<path d="' + D_OUTER + '" fill="none"' +
    '      stroke="rgba(255,255,255,0.45)" stroke-width="1.5"/>' +

    '</g>' + // #jc-deform
    '</g>' + // #jc-wobble
    '</svg>';

  document.body.appendChild(el);

  var fillGroup   = document.getElementById('jc-fill');
  var deformGroup = document.getElementById('jc-deform');
  var whitePath   = document.getElementById('jc-white');
  var gradMidStop = document.getElementById('jc-grad-mid');

  // ── State ──────────────────────────────────────────────────────────────
  var mx = -999, my = -999;
  var pmx = -999, pmy = -999;
  var vx = 0, vy = 0;

  var angle    = -90;
  var tgtAngle = -90;
  var angVel   = 0;

  // White overlay opacity: lerps toward tgtWhite, then pulse is added on top
  var whiteOpacity = 0;
  var tgtWhite     = 0;   // 0 = not hovered, 1 = hovered

  var fillScale    = 1;
  var tgtFillScale = 1;

  // Squash-and-stretch
  var stretchY    = 1;
  var stretchYVel = 0;
  var prevSpeed   = 0; // used to measure deceleration each frame

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
    tgtWhite = (target && target.closest(INTERACTIVE)) ? 1 : 0;
  }

  // ── Position tracking ──────────────────────────────────────────────────
  var lastTrackedX = null, lastTrackedY = null;

  function handleMove(clientX, clientY) {
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

  window.addEventListener('pointermove', function (e) {
    if (e.isPrimary) handleMove(e.clientX, e.clientY);
  });
  window.addEventListener('mousemove', function (e) {
    handleMove(e.clientX, e.clientY);
  });

  window.addEventListener('pointerleave', function (e) {
    if (e.isPrimary) active = false;
  });

  if (window.MutationObserver && document.body) {
    new MutationObserver(function () {
      if (document.body.classList.contains('has-expanded-card')) {
        active = false;
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  // ── Hover detection ────────────────────────────────────────────────────
  document.addEventListener('pointerover', function (e) {
    if (!e.isPrimary) return;
    tgtWhite = e.target.closest(INTERACTIVE) ? 1 : 0;
  });

  // ── Click animation ────────────────────────────────────────────────────
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) tgtFillScale = 1.22;
  });

  function onRelease(e) {
    if (!e.isPrimary) return;
    tgtFillScale = 1;
    checkHover(e.clientX, e.clientY);
  }

  document.addEventListener('pointerup',     onRelease);
  document.addEventListener('pointercancel', onRelease);

  // ── Render loop ────────────────────────────────────────────────────────
  function tick() {
    lastTrackedX = null;
    lastTrackedY = null;

    // Decay velocity toward zero each frame so stretch resets when mouse stops
    vx *= 0.87;
    vy *= 0.87;

    // Subtle gradient animation: midpoint oscillates slowly, creating a color breathe
    var gradPhase = Date.now() / 1800;
    var midOff = 50 + Math.sin(gradPhase) * 14;
    gradMidStop.setAttribute('offset', midOff.toFixed(1) + '%');

    // Spring rotation
    var delta = shortDelta(angle, tgtAngle);
    angVel  += delta * 0.055;
    angVel  *= 0.84;
    angle   += angVel;

    // White overlay: slow lerp toward tgtWhite (0 or 1).
    // This creates the "progressive replacement" feel on enter/exit.
    whiteOpacity += (tgtWhite - whiteOpacity) * 0.045;

    // Sinusoidal pulse layered on top, scaled by how much white is present.
    // Amplitude: ±0.18, period: ~900 ms — gentle breathing while hovering.
    var pulse = Math.sin(Date.now() / 450) * 0.18 * whiteOpacity;
    var finalOpacity = Math.min(1, Math.max(0, whiteOpacity + pulse));
    whitePath.setAttribute('opacity', finalOpacity.toFixed(3));

    // Squash-and-stretch deformation
    // Speed from the EMA velocity vector (already smoothed).
    var speed = Math.sqrt(vx * vx + vy * vy);
    // Target: elongate along Y (tip→tail) proportional to speed, capped at 40%.
    // The cursor is in local SVG space so Y = movement direction after CSS rotation.
    // Stretch target: above 1 when fast, explicitly below 1 when decelerating.
    // Deceleration = positive drop in speed this frame → drives target into squish zone
    // directly rather than relying on spring overshoot alone.
    var decel       = Math.max(0, prevSpeed - speed);
    var stretch     = Math.min(speed  * 0.07, 0.45);  // how much to elongate
    var squish      = Math.min(decel  * 0.40, 0.40);  // how much to compress
    var tgtStretchY = 1 + stretch - squish;
    prevSpeed = speed;

    var stretchDelta = tgtStretchY - stretchY;
    stretchYVel += stretchDelta * 0.28;
    stretchYVel *= 0.55;
    stretchY    += stretchYVel;
    // Area conservation: compress X as Y grows (and vice-versa on squish)
    var stretchX = 1 / Math.sqrt(Math.max(0.5, stretchY));
    deformGroup.setAttribute('transform',
      'translate(' + CX + ' ' + CY + ')' +
      ' scale(' + stretchX.toFixed(4) + ',' + stretchY.toFixed(4) + ')' +
      ' translate(' + (-CX) + ' ' + (-CY) + ')'
    );

    // Click scale
    fillScale += (tgtFillScale - fillScale) * 0.18;
    setFillTransform(fillScale);

    // Position
    var t = active && !mqSmall.matches
      ? 'translate(' + (mx - TIP_X) + 'px,' + (my - TIP_Y) + 'px)' +
        ' rotate(' + angle + 'deg)'
      : 'translate(-999px,-999px)';

    el.style.webkitTransform = t;
    el.style.transform       = t;

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

}());
