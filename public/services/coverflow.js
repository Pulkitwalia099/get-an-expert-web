/* Coverflow carousel behaviour. Pairs with coverflow.css.
 *
 * Markup it upgrades:
 *
 *   <div class="cf" data-coverflow data-label="Sample ads">
 *     <div class="cf-frame">
 *       <div class="cf-stage">
 *         <div class="cf-card">…</div>   (or <a class="cf-card" href="…">)
 *       </div>
 *     </div>
 *   </div>
 *
 * Arrows and dots are built here rather than written into each page, so the
 * two pages that use this cannot drift apart on controls.
 *
 * The whole loop is one fractional index, `pos`, painted straight onto the
 * cards. Nothing here reads layout during a drag except the card width, which
 * is measured once per resize, so a throw stays on one frame's work.
 *
 * Emits `cf:select` on the root with { index } whenever the centre card
 * changes. That is how a page attaches behaviour to the centre card without
 * this file knowing what is inside one.
 */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function chevron(dir) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', dir < 0 ? 'M15 4 L7 12 L15 20' : 'M9 4 L17 12 L9 20');
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '2.2');
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(p);
    return svg;
  }

  function init(root) {
    var frame = root.querySelector('.cf-frame');
    var stage = root.querySelector('.cf-stage');
    if (!frame || !stage) return;

    var cards = Array.prototype.slice.call(stage.querySelectorAll('.cf-card'));
    var count = cards.length;
    if (count < 2) return;

    var loop = root.dataset.loop !== 'off';
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var isMobile = window.matchMedia('(max-width: 720px)');

    /* Fractional card index at the centre. The single source of truth. */
    var pos = 0;
    /* Where the current settle is headed. Stepping off `pos` instead would
       swallow a keypress that lands mid-flight, before the round-off moves. */
    var target = 0;
    var width = 0;
    var raf = null;
    var selected = -1;
    var drag = null;
    var dots = [];
    var tune = { rotate: 44, depth: 0.6, falloff: 0.56, fade: 0.1, gap: 0.05 };

    function readTune() {
      var s = getComputedStyle(root);
      ['rotate', 'depth', 'falloff', 'fade', 'gap'].forEach(function (k) {
        var v = parseFloat(s.getPropertyValue('--cf-' + k));
        if (!isNaN(v)) tune[k] = v;
      });
    }

    /* Nearest whole card, folded back into 0..count-1. */
    function indexAt(p) { return ((Math.round(p) % count) + count) % count; }

    function paint() {
      if (!width) return;
      var pitch = width * (1 + tune.gap);

      for (var i = 0; i < count; i++) {
        var card = cards[i];

        /* Fold the distance into the shorter way round the ring. This is the
           whole looping mechanism: no cloned nodes, no shuffling the DOM. */
        var offset = i - pos;
        if (loop) {
          offset = ((offset % count) + count) % count;
          if (offset > count / 2) offset -= count;
        }

        var distance = Math.abs(offset);
        /* Both the tilt and the recession ease off as cards travel out, so
           doubling the distance adds only about half again as much of each. A
           linear ramp folds the second card shut; this keeps it readable. */
        var ramp = Math.pow(distance, tune.falloff);
        /* Capped short of edge-on so a far card never turns its back. */
        var tilt = Math.min(tune.rotate * ramp, 82) * Math.sign(offset);

        card.style.transform =
          'translateX(calc(-50% + ' + (offset * pitch).toFixed(2) + 'px)) ' +
          'translateZ(' + (-tune.depth * width * ramp).toFixed(2) + 'px) ' +
          'rotateY(' + (-tilt).toFixed(2) + 'deg)';

        /* A card is teleported across the ring at exactly half a turn out, so
           it has to be gone by then or the jump is visible. */
        var edge = loop ? Math.min(1, Math.max(0, count / 2 - distance)) : 1;
        card.style.opacity = String(Math.max(0, 1 - tune.fade * distance) * edge);
        card.style.zIndex = String(100 - Math.round(distance));
      }
    }

    function select(index) {
      if (index === selected) return;
      selected = index;
      for (var i = 0; i < count; i++) cards[i].classList.toggle('is-on', i === index);
      dots.forEach(function (d, i) { d.setAttribute('aria-current', String(i === index)); });
      root.dispatchEvent(new CustomEvent('cf:select', { detail: { index: index } }));
    }

    function clamp(p) { return loop ? p : Math.max(0, Math.min(count - 1, p)); }

    function settle(to) {
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
      target = to;
      select(indexAt(to));

      if (reduce.matches) { pos = to; paint(); return; }

      function step() {
        var remaining = target - pos;
        if (Math.abs(remaining) < 0.0004) {
          pos = target;
          paint();
          raf = null;
          return;
        }
        /* Exponential ease-out, not a spring. A spring would overshoot, and a
           card that slides past centre and comes back reads as a bug here. */
        pos += remaining * 0.16;
        paint();
        raf = requestAnimationFrame(step);
      }
      raf = requestAnimationFrame(step);
    }

    function goTo(index) {
      /* Take the shorter way round rather than unwinding the whole ring. */
      var to = loop ? index + Math.round((target - index) / count) * count : index;
      settle(clamp(to));
    }

    function nudge(by) { settle(clamp(Math.round(target) + by)); }

    /* Drag */
    frame.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      stop();
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
      /* Capture keeps the throw alive when the finger leaves the frame. It is
         not worth losing the drag over, so a browser that refuses it still
         gets to drag, it just ends the gesture at the edge. */
      try { frame.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      target = pos;
      drag = { id: e.pointerId, x: e.clientX, pos: pos, v: 0, t: performance.now(), moved: false };
    });

    frame.addEventListener('pointermove', function (e) {
      if (!drag || drag.id !== e.pointerId) return;
      var pitch = width * (1 + tune.gap);
      if (!pitch) return;

      var dx = e.clientX - drag.x;
      if (Math.abs(dx) > 5) drag.moved = true;

      var now = performance.now();
      var previous = pos;
      pos = clamp(drag.pos - dx / pitch);
      /* Cards per second, for the throw. */
      drag.v = ((pos - previous) / Math.max(now - drag.t, 1)) * 1000;
      drag.t = now;

      select(indexAt(pos));
      paint();
    });

    function endDrag(e) {
      if (!drag || drag.id !== e.pointerId) return;
      /* Let a flick carry, but never more than two cards. */
      var carried = Math.max(-2, Math.min(2, drag.v * 0.18));
      var landed = clamp(Math.round(pos + carried));
      /* The click that follows a drag has to see `moved`, so the drag is not
         cleared until the next tick. */
      var finished = drag;
      setTimeout(function () { if (drag === finished) drag = null; }, 0);
      settle(landed);
    }
    frame.addEventListener('pointerup', endDrag);
    frame.addEventListener('pointercancel', endDrag);

    /* A card is a link on some pages. A drag must never navigate, and a tap on
       a card that is not the centre one means "bring this here", not "open it". */
    stage.addEventListener('click', function (e) {
      var card = e.target.closest ? e.target.closest('.cf-card') : null;
      if (!card) return;
      if (drag && drag.moved) { e.preventDefault(); return; }
      var index = cards.indexOf(card);
      if (index !== -1 && index !== selected) {
        e.preventDefault();
        goTo(index);
      }
    });

    frame.tabIndex = 0;
    frame.setAttribute('role', 'region');
    frame.setAttribute('aria-roledescription', 'carousel');
    if (root.dataset.label) frame.setAttribute('aria-label', root.dataset.label);
    cards.forEach(function (card, i) {
      card.setAttribute('role', 'group');
      card.setAttribute('aria-roledescription', 'slide');
      card.setAttribute('aria-label', (i + 1) + ' of ' + count);
    });

    frame.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      stop();
      nudge(e.key === 'ArrowLeft' ? -1 : 1);
    });

    /* Controls */
    [-1, 1].forEach(function (dir) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cf-nav ' + (dir < 0 ? 'cf-prev' : 'cf-next');
      b.setAttribute('aria-label', dir < 0 ? 'Previous sample' : 'Next sample');
      b.appendChild(chevron(dir));
      b.addEventListener('click', function () { stop(); nudge(dir); });
      root.appendChild(b);
    });

    var dotwrap = document.createElement('div');
    dotwrap.className = 'cf-dots';
    cards.forEach(function (_, i) {
      var d = document.createElement('button');
      d.type = 'button';
      d.className = 'cf-dot';
      d.setAttribute('aria-label', 'Go to sample ' + (i + 1));
      d.setAttribute('aria-current', 'false');
      d.addEventListener('click', function () { stop(); goTo(i); });
      dotwrap.appendChild(d);
      dots.push(d);
    });
    root.appendChild(dotwrap);

    /* Card width drives pitch, depth and perspective, so it is the only thing
       worth measuring, and only when the box actually changes. */
    function measure() {
      readTune();
      width = cards[0].offsetWidth;
      paint();
    }

    root.classList.add('cf-ready');
    measure();
    select(0);
    paint();

    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(frame);
    else window.addEventListener('resize', measure);
    /* A breakpoint change fires neither scroll nor resize on its own, and the
       rake numbers live in media queries. */
    if (isMobile.addEventListener) isMobile.addEventListener('change', measure);

    /* A slow drift, to say the thing moves and that there is more behind the
       centre card. It runs one lap and stops, and it stops early the moment
       anybody touches the carousel. An indefinite loop is a thing sliding
       under someone who is trying to read it. */
    var timer = null;
    var laps = count;
    function stop() {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    }
    if (!reduce.matches) {
      timer = setInterval(function () {
        if (document.hidden) return;
        if (--laps <= 0) { stop(); return; }
        nudge(1);
      }, 4600);
      frame.addEventListener('wheel', stop, { passive: true });
      frame.addEventListener('mouseenter', stop);
    }
  }

  function ready() {
    document.querySelectorAll('[data-coverflow]').forEach(init);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
