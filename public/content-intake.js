/* The /content forms share the existing, same-origin signup API. */
(function (global) {
  'use strict';
  const CONTACT = 'midsesh.social@gmail.com';
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function normaliseProductLink(value) {
    const raw = String(value || '').trim();
    if (!raw || raw.length > 1000) throw new Error('Add a valid product link.');
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : 'https://' + raw);
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) {
      throw new Error('Add a public http or https product link.');
    }
    return url.href;
  }

  function orderPayload(product, email, notes) {
    if (!emailPattern.test(email.trim())) throw new Error('Add a valid email address.');
    return {
      type: 'contact', name: '', email: email.trim(), purpose: 'Short-form video',
      serviceSlug: 'short-form-video', orderKind: 'order',
      message: 'Product link: ' + normaliseProductLink(product) + '\nOffer: one video, $39' +
        (notes.trim() ? '\nBrief: ' + notes.trim().slice(0, 800) : ''),
    };
  }

  function waitlistPayload(email) {
    if (!emailPattern.test(email.trim())) throw new Error('Add a valid email address.');
    return {
      type: 'contact', name: '', email: email.trim(), purpose: 'Loop Agent waitlist',
      serviceSlug: 'loop-agent', orderKind: 'notify',
      message: 'Notify me by email when the Loop Agent launches.',
    };
  }

  async function submitSignup(payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await global.fetch('/api/signup', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload), signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok !== true) {
        throw new Error(response.status === 429 ? 'Too many attempts. Please try again later or email ' + CONTACT + '.' : 'That did not send. Try again or email ' + CONTACT + '.');
      }
      if (data.notified !== true) {
        throw new Error('We could not confirm delivery to our team. Please email ' + CONTACT + ' before submitting again.');
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  // Exposed for contract tests as well as the page; never contains credentials.
  global.MidseshContentIntake = { normaliseProductLink, orderPayload, waitlistPayload, submitSignup };
  if (!global.document) return;
  const root = document.getElementById('content-revamp');
  if (!root) return;
  const form = root.querySelector('#cr-intake');
  const product = root.querySelector('#cr-product');
  const email = root.querySelector('#order-email');
  const notes = root.querySelector('#order-notes');
  const details = root.querySelector('#order-details');
  const status = root.querySelector('#order-status');
  const button = form.querySelector('button[type="submit"]');
  let sending = false;
  function report(target, message, error) {
    target.hidden = false;
    target.dataset.error = String(!!error);
    target.textContent = message;
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || form.dataset.state === 'success') return;
    try {
      product.value = normaliseProductLink(product.value);
    } catch (_) {
      report(status, 'Add a valid public product link, such as your-product.com.', true);
      product.focus();
      return;
    }
    if (details.hidden) {
      details.hidden = false;
      email.disabled = false;
      button.textContent = 'Send my brief ↗';
      report(status, 'One last thing: where should we follow up?', false);
      email.focus();
      return;
    }
    if (!emailPattern.test(email.value.trim())) {
      report(status, 'Add a valid email so we can follow up.', true);
      email.focus();
      return;
    }
    sending = true;
    button.disabled = true;
    button.textContent = 'Sending…';
    try {
      await submitSignup(orderPayload(product.value, email.value, notes.value));
      form.dataset.state = 'success';
      report(status, 'Your brief is with our team. We’ll email you to confirm the next steps. No payment has been taken.', false);
    } catch (error) {
      report(status, error.name === 'AbortError' ? 'The request timed out. Please email ' + CONTACT + ' so we can check it.' : error.message || 'That did not send. Please try again.', true);
    } finally {
      sending = false;
      button.disabled = false;
      button.textContent = 'Send my brief ↗';
    }
  });

  const waitlist = root.querySelector('#loop-waitlist');
  const waitlistStatus = root.querySelector('#loop-note');
  const waitlistEmail = root.querySelector('#loop-email');
  const waitlistButton = waitlist.querySelector('button[type="submit"]');
  waitlist.addEventListener('submit', async event => {
    event.preventDefault();
    if (waitlistButton.disabled) return;
    waitlistButton.disabled = true;
    waitlistButton.textContent = 'Joining…';
    try {
      await submitSignup(waitlistPayload(waitlistEmail.value));
      waitlistEmail.disabled = true;
      waitlistButton.textContent = 'Joined';
      report(waitlistStatus, 'You’re on the list. We’ll email you when Loop Agent launches.', false);
    } catch (error) {
      waitlistButton.disabled = false;
      waitlistButton.textContent = 'Notify me';
      report(waitlistStatus, error.name === 'AbortError' ? 'The request timed out. Please email ' + CONTACT + '.' : error.message || 'That did not send. Please try again.', true);
    }
  });
})(globalThis);
