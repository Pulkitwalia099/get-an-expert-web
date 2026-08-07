/* Makes the intake forms on the designed service pages real.
 *
 * These pages were built as a static preview, so every form was markup: the
 * fields looked right and the button went nowhere. Worse, none of them asked
 * for an email address, so even a working submit would have captured a brief
 * with no way to answer it.
 *
 * This adds the missing address field and posts to /api/signup, the same route
 * the site's own contact panel uses. That keeps every piece of personal data in
 * `leads`, which is what the privacy policy says and what its deletion path
 * depends on. One file, all six pages, no per-page markup edits.
 */
(function () {
  'use strict';

  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var CONTACT = 'midsesh.social@gmail.com';

  function labelFor(el) {
    var wrap = el.closest('.field');
    var lab = wrap && wrap.querySelector('label');
    if (lab) return lab.textContent.replace(/\s+/g, ' ').trim();
    return el.getAttribute('placeholder') || el.name || 'Field';
  }

  /* Everything the visitor typed, as one readable block. The route stores a
     single message, and a brief that arrives as five labelled lines is worth
     more than five columns that are null on every other lead kind. */
  function collect(form) {
    var lines = [];
    form.querySelectorAll('input, textarea, select').forEach(function (el) {
      if (el.type === 'email' && el.dataset.injected === '1') return;
      if (el.type === 'radio') {
        if (el.checked) {
          var on = el.closest('.obj');
          var name = on && on.querySelector('.on');
          if (name) lines.push('Objective: ' + name.textContent.trim());
        }
        return;
      }
      var v = (el.value || '').trim();
      if (v) lines.push(labelFor(el) + ': ' + v);
    });
    return lines.join('\n');
  }

  function addEmailField(form) {
    if (form.querySelector('input[type="email"]')) return form.querySelector('input[type="email"]');
    var field = document.createElement('div');
    field.className = 'field';
    var id = 'intake-email';
    field.innerHTML =
      '<label for="' + id + '">Your email <small>so we can send it back</small></label>' +
      '<input id="' + id + '" type="email" inputmode="email" autocomplete="email" ' +
      'data-injected="1" placeholder="you@company.com">';
    var row = form.querySelector('.btnrow');
    if (row) form.insertBefore(field, row);
    else form.appendChild(field);
    return field.querySelector('input');
  }

  function wire(form) {
    var emailEl = form.dataset.notify === '1'
      ? form.querySelector('input[type="email"]')
      : addEmailField(form);
    if (!emailEl) return;
    var btn = form.querySelector('.btnrow .btn, .btnrow a, button[type="submit"]');
    if (!btn) return;

    var note = form.querySelector('.formnote');
    function fail(msg) {
      if (!note) return;
      note.dataset.orig = note.dataset.orig || note.innerHTML;
      note.innerHTML = msg;
      note.style.color = '#9E3F24';
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (btn.dataset.sending === '1') return;

      var email = (emailEl.value || '').trim();
      if (!EMAIL.test(email)) {
        fail('Add an email address so we can send this back to you.');
        emailEl.focus();
        return;
      }
      /* A notify form has one field and nothing to brief. Sending the address
         back as "Your email: x" would be the only line in the message, which
         tells whoever reads it nothing about what they asked for. */
      var notify = form.dataset.notify === '1';
      var message = notify
        ? 'Notify me when ' + document.title.replace(/^Hi-fi · /, '') + ' opens.'
        : collect(form);
      if (!message) {
        fail('Fill in at least one field so we know what you need.');
        return;
      }

      btn.dataset.sending = '1';
      var label = btn.textContent;
      btn.textContent = 'Sending';

      fetch('/api/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'contact',
          name: '',
          email: email,
          purpose: document.title.replace(/^Hi-fi · /, ''),
          message: message,
        }),
      })
        .then(function (r) {
          if (!r.ok) throw new Error(String(r.status));
          return r.json().catch(function () { return {}; });
        })
        .then(function (data) {
          var ok = document.createElement('div');
          ok.className = 'form';
          ok.style.textAlign = 'center';
          ok.innerHTML =
            '<div style="font-size:17px;font-weight:700;">Got it.</div>' +
            '<p style="margin-top:8px;font-size:14px;color:#5F594E;line-height:1.5;">' +
            (data && data.notified === false
              ? 'Your brief is saved, but our own alert did not send. If you hear nothing, email ' +
                '<a href="mailto:' + CONTACT + '">' + CONTACT + '</a>.'
              : (form.dataset.notify === '1'
                ? 'You are on the list. One email when it opens, nothing else.'
                : 'We have your brief and we answer by email, usually the same day.')) +
            '</p>';
          form.replaceWith(ok);
        })
        .catch(function () {
          btn.dataset.sending = '0';
          btn.textContent = label;
          fail('That did not send. Try again, or email <a href="mailto:' + CONTACT + '">' + CONTACT + '</a>.');
        });
    });
  }

  function ready() {
    document.querySelectorAll('.form').forEach(wire);

    /* Dead placeholder CTAs from the preview. Anything that cannot do its job
       yet points at the address that can, rather than at "#", which looks
       broken and teaches people the buttons do nothing. */
    document.querySelectorAll('a[href="#"]').forEach(function (a) {
      var t = (a.textContent || '').toLowerCase();
      if (document.getElementById('start') && /get|start|send|first ad/.test(t)) {
        a.setAttribute('href', '#start');
        return;
      }
      a.setAttribute('href', 'mailto:' + CONTACT + '?subject=' + encodeURIComponent(a.textContent.trim()));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
