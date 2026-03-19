const year = document.getElementById("year");
if (year) year.textContent = "© " + new Date().getFullYear() + " GATOCHENTE";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js", { updateViaCache: "none" })
      .then((registration) => {
        registration.update();
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      })
      .catch((error) => {
        console.error("No se pudo registrar el Service Worker:", error);
      });
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (window.__swUpdatedOnce) return;
    window.__swUpdatedOnce = true;
    window.location.reload();
  });
}

const navItems = [...document.querySelectorAll('.nav-item')];
const selector = document.querySelector('.pill-selector');
const navbar = document.querySelector('.navbar');
const searchToggle = document.getElementById('search-toggle');
const searchOverlay = document.getElementById('nav-search-overlay');
const searchClose = document.getElementById('search-close');
const searchInput = document.getElementById('search-input');

function getCurrentPage() {
  return normalizePath(window.location.pathname);
}

function normalizePath(pathname) {
  if (!pathname) return '/';
  let normalized = pathname
    .replace(/index\.html$/i, '/')
    .replace(/\.html$/i, '')
    .replace(/\/+/g, '/');

  if (!normalized.startsWith('/')) normalized = '/' + normalized;
  if (normalized.length > 1) normalized = normalized.replace(/\/+$/, '');
  return normalized || '/';
}

function updateActiveNav() {
  const current = getCurrentPage();
  navItems.forEach((item) => {
    item.classList.remove('active');
    const href = item.getAttribute('href');
    if (!href) return;
    let target;
    try {
      target = new URL(href, window.location.origin).pathname;
    } catch (e) {
      target = href;
    }
    target = normalizePath(target);
    if (target === current) {
      item.classList.add('active');
    }
  });
}

function moveSelector(activeItem) {
  if (!selector || !activeItem) return;
  selector.style.width = activeItem.offsetWidth + 'px';
  selector.style.left = activeItem.offsetLeft + 'px';
}

function refreshSelector() {
  if (navbar && navbar.classList.contains('search-open')) return;
  let activeItem = document.querySelector('.nav-item.active');
  if (!activeItem && navItems.length) {
    activeItem = navItems[0];
    activeItem.classList.add('active');
  }
  if (activeItem) {
    moveSelector(activeItem);
  }
}

function clearHighlight() {
  const parentsToNormalize = new Set();
  document.querySelectorAll('.search-highlight').forEach((el) => {
    const parent = el.parentNode;
    const text = document.createTextNode(el.textContent);
    el.replaceWith(text);
    if (parent) parentsToNormalize.add(parent);
  });

  parentsToNormalize.forEach((parent) => {
    parent.normalize();
  });
}

function highlightText(query) {
  clearHighlight();
  if (!query || query.trim() === '') return;
  const lower = query.toLowerCase();
  const textNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentNode && ['SCRIPT', 'STYLE', 'TEXTAREA'].includes(node.parentNode.nodeName)) continue;
    if (node.parentElement && node.parentElement.closest('.navbar')) continue;
    if (node.textContent.toLowerCase().includes(lower)) {
      textNodes.push(node);
    }
  }

  textNodes.forEach((node) => {
    const text = node.textContent;
    const regex = new RegExp(`(${lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    if (!regex.test(text)) return;
    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    text.replace(regex, (match, p1, offset) => {
      if (offset > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
      }
      const span = document.createElement('span');
      span.className = 'search-highlight';
      span.textContent = text.slice(offset, offset + match.length);
      frag.appendChild(span);
      lastIndex = offset + match.length;
      return match;
    });
    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    node.parentNode.replaceChild(frag, node);
  });
}

function openSearch() {
  if (!navbar || !searchInput || !searchOverlay) return;
  navbar.classList.add('search-open');
  searchOverlay.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    searchInput.focus();
  });
}

function closeSearch() {
  if (!navbar || !searchOverlay || !searchInput) return;
  navbar.classList.remove('search-open');
  searchOverlay.setAttribute('aria-hidden', 'true');
  searchInput.value = '';
  clearHighlight();
}

// --- Anti-spam: keyword blacklist ---
const SPAM_KEYWORDS = /\b(casino|poker|slot\s*machine|roulette|blackjack|sports?\s*bet|seo\s*service|seo\s*link|backlink|guest\s*post|link\s*build|link\s*insert|crypto|bitcoin|ethereum|nft\s*drop|forex|trading\s*signal|binary\s*option|payday\s*loan|credit\s*score|mortgage\s*rate|viagra|cialis|pharmacy|weight\s*loss|diet\s*pill|instagram\s*follower|youtube\s*view|tiktok\s*follower|whatsapp\s*hack|telegram\s*group\s*member|escort|adult\s*content|xxx)\b/i;

// --- Anti-spam: disposable / throwaway email domains ---
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com','guerrillamail.com','guerrillamail.net','guerrillamail.org',
  'guerrillamail.de','guerrillamail.info','guerrillamail.biz','guerrillaemail.com',
  'spam4.me','yopmail.com','yopmail.fr','cool.fr.nf','jetable.fr.nf',
  '10minutemail.com','10minutemail.net','10minutemail.org','10minutemail.de',
  '10minutemail.co.uk','10minutemail.ru','10minemail.com',
  'tempmail.com','tmpmail.net','tmpmail.org','temp-mail.org','temp-mail.ru',
  'throwaway.email','throwam.com','dispostable.com','mailnull.com',
  'trashmail.com','trashmail.me','trashmail.net','trashmail.at','trashmail.io',
  'discard.email','spamgourmet.com','sharklasers.com','grr.la','spam.la',
  'maildrop.cc','inboxbear.com','fakeinbox.com','safetymail.info',
  'getnada.com','filzmail.com','spamdecoy.net','spamhangover.com',
  'mail-temp.com','emailondeck.com','binkmail.com','tempinbox.com',
  'devnullmail.com','getairmail.com','wnmcharities.com','sofimail.com',
  'example.com','nowhere.com'
]);

function setFormStatus(statusElement, message, kind) {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.classList.remove('is-success', 'is-error');
  if (kind) statusElement.classList.add(kind);
}

function initContactForm() {
  const form = document.querySelector('.contact-form');
  if (!form) return;

  const statusElement = form.querySelector('.form-status');
  const submitButton = form.querySelector('button[type="submit"]');
  const nameInput = form.querySelector('input[name="name"]');
  const emailInput = form.querySelector('input[name="email"]');
  const subjectInput = form.querySelector('input[name="subject"]');
  const messageInput = form.querySelector('textarea[name="message"]');
  const startedAtInput = form.querySelector('input[name="startedAt"]');
  const honeypotInput = form.querySelector('input[name="website"]');
  const provider = form.dataset.provider || 'web3forms';
  const accessKey = form.dataset.accessKey || '';
  const antiSpamKey = 'gatochente_contact_last_submit_at';

  if (startedAtInput) {
    startedAtInput.value = String(Date.now());
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = (nameInput?.value || '').trim();
    const email = (emailInput?.value || '').trim();
    const subject = (subjectInput?.value || '').trim();
    const message = (messageInput?.value || '').trim();

    if (!name || !email || !subject || !message) {
      setFormStatus(statusElement, 'Completa todos los campos para enviar tu mensaje.', 'is-error');
      return;
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValid) {
      setFormStatus(statusElement, 'Escribe un email válido para continuar.', 'is-error');
      return;
    }

    const emailDomain = (email.split('@')[1] || '').toLowerCase();
    if (DISPOSABLE_EMAIL_DOMAINS.has(emailDomain)) {
      setFormStatus(statusElement, 'Los correos temporales no están permitidos. Usa tu correo real.', 'is-error');
      return;
    }

    if ((honeypotInput?.value || '').trim() !== '') {
      setFormStatus(statusElement, 'No se pudo enviar. Verificación anti-spam activada.', 'is-error');
      return;
    }

    const startedAt = Number(startedAtInput?.value || Date.now());
    if (Number.isFinite(startedAt) && Date.now() - startedAt < 4000) {
      setFormStatus(statusElement, 'Espera unos segundos antes de enviar el formulario.', 'is-error');
      return;
    }

    const lastSubmitAt = Number(localStorage.getItem(antiSpamKey) || 0);
    if (Date.now() - lastSubmitAt < 30000) {
      setFormStatus(statusElement, 'Espera 30 segundos antes de enviar otro mensaje.', 'is-error');
      return;
    }

    const linksInMessage = (message.match(/https?:\/\//gi) || []).length;
    if (linksInMessage > 2) {
      setFormStatus(statusElement, 'Demasiados enlaces en el mensaje. Reduce el contenido sospechoso.', 'is-error');
      return;
    }

    if (SPAM_KEYWORDS.test(message) || SPAM_KEYWORDS.test(subject)) {
      setFormStatus(statusElement, 'Mensaje bloqueado: contiene contenido no permitido.', 'is-error');
      return;
    }

    const spamDailyKey = 'gatochente_daily_count';
    const today = new Date().toISOString().slice(0, 10);
    let dailySubmissions = 0;
    try {
      const stored = JSON.parse(localStorage.getItem(spamDailyKey) || '{}');
      dailySubmissions = (stored.date === today) ? (Number(stored.count) || 0) : 0;
    } catch { dailySubmissions = 0; }
    if (dailySubmissions >= 3) {
      setFormStatus(statusElement, 'Límite diario alcanzado (3 mensajes). Inténtalo mañana.', 'is-error');
      return;
    }

    const turnstileToken = (form.querySelector('[name="cf-turnstile-response"]')?.value || '').trim();
    if (!turnstileToken) {
      setFormStatus(statusElement, 'Completa la verificación de seguridad antes de enviar.', 'is-error');
      return;
    }

    const recipient = form.dataset.email || 'contacto@gatochente.com';

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Enviando...';
    }

    setFormStatus(statusElement, 'Enviando tu mensaje...', 'is-success');

    try {
      let result;

      if (provider === 'web3forms') {
        if (!accessKey || accessKey === 'TU_CLAVE_WEB3FORMS') {
          throw new Error('Configura tu clave de Web3Forms en el formulario.');
        }
        const payload = {
          access_key: accessKey,
          name,
          email,
          subject,
          message,
          from_name: name,
          replyto: email
        };
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload)
        });
        result = await response.json();
        if (!result.success) {
          throw new Error(result.message || 'No se pudo enviar el mensaje');
        }
      } else if (provider === 'formsubmit') {
        const payload = new FormData();
        payload.append('name', name);
        payload.append('email', email);
        payload.append('subject', subject);
        payload.append('message', message);
        payload.append('_captcha', 'false');
        const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: payload
        });
        result = await response.json();
        const success = result && (result.success === true || result.success === 'true');
        if (!response.ok || !success) {
          const apiMessage = result && typeof result.message === 'string' ? result.message : '';
          throw new Error(apiMessage || 'No se pudo enviar el mensaje');
        }
      } else {
        throw new Error('Proveedor de formulario no soportado');
      }

      localStorage.setItem(antiSpamKey, String(Date.now()));
      try {
        const stored = JSON.parse(localStorage.getItem(spamDailyKey) || '{}');
        const currentCount = (stored.date === today) ? (Number(stored.count) || 0) : 0;
        localStorage.setItem(spamDailyKey, JSON.stringify({ date: today, count: currentCount + 1 }));
      } catch { /* ignore */ }
      setFormStatus(statusElement, '¡Mensaje enviado! Te responderé pronto.', 'is-success');
      form.reset();
      if (startedAtInput) startedAtInput.value = String(Date.now());
      if (window.turnstile) window.turnstile.reset();
    } catch (error) {
      const detail = error && typeof error.message === 'string' ? error.message : '';
      const normalizedDetail = detail.toLowerCase();

      if (normalizedDetail.includes('turnstile') || normalizedDetail.includes('captcha')) {
        setFormStatus(statusElement, 'Verificación de seguridad fallida. Recarga la página e inténtalo de nuevo.', 'is-error');
      } else if (normalizedDetail.includes('access key') || normalizedDetail.includes('not found') || normalizedDetail.includes('invalid key') || normalizedDetail.includes('clave')) {
        setFormStatus(statusElement, 'Error de configuración del formulario. Contacta con el administrador.', 'is-error');
      } else if (normalizedDetail.includes('web server')) {
        setFormStatus(statusElement, 'Abre el sitio desde Live Server (http://localhost o 127.0.0.1), no desde archivo local.', 'is-error');
      } else {
        setFormStatus(statusElement, 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.', 'is-error');
      }
      if (window.turnstile) window.turnstile.reset();
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Enviar mensaje';
      }
    }
  });
}

function initProtectedEmailButtons() {
  const emailButtons = document.querySelectorAll('.email-protected');
  if (!emailButtons.length) return;

  emailButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();

      const user = button.getAttribute('data-user') || '';
      const domain = button.getAttribute('data-domain') || '';
      const cooldown = Number(button.getAttribute('data-cooldown') || 12000);
      if (!user || !domain) return;

      const key = `gatochente_email_btn_${user}_${domain}`;
      const lastOpen = Number(localStorage.getItem(key) || 0);
      if (Date.now() - lastOpen < cooldown) {
        return;
      }

      localStorage.setItem(key, String(Date.now()));
      window.location.href = `mailto:${user}@${domain}`;
    });
  });
}

navItems.forEach((item) => {
  item.addEventListener('click', () => {
    navItems.forEach((el) => el.classList.remove('active'));
    item.classList.add('active');
    moveSelector(item);
  });
});

window.addEventListener('load', () => {
  updateActiveNav();
  refreshSelector();
});

window.addEventListener('resize', refreshSelector);

if (searchInput) {
  searchInput.addEventListener('input', () => {
    const value = searchInput.value.trim();
    if (!value) {
      clearHighlight();
      return;
    }
    highlightText(value);
  });

  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeSearch();
    }
  });
}

if (searchToggle) {
  searchToggle.addEventListener('click', () => {
    openSearch();
  });
}

if (searchClose) {
  searchClose.addEventListener('click', () => {
    closeSearch();
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && navbar && navbar.classList.contains('search-open')) {
    closeSearch();
  }
});

initContactForm();
initProtectedEmailButtons();
