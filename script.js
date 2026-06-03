const year = document.getElementById("year");
if (year) year.textContent = "© " + new Date().getFullYear() + " GATOCHENTE";

const pageLoader = document.getElementById("page-loader");

function hidePageLoader() {
  if (!pageLoader || pageLoader.classList.contains("is-hidden")) return;
  window.setTimeout(() => {
    pageLoader.classList.add("is-hidden");
    window.setTimeout(() => {
      pageLoader.remove();
    }, 650);
  }, 260);
}

window.setTimeout(hidePageLoader, 3200);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const currentScript = document.querySelector('script[src*="script.js"]');
    const scriptUrl = currentScript ? currentScript.src : new URL("script.js", window.location.href).href;
    const serviceWorkerUrl = new URL("service-worker.js", scriptUrl);

    navigator.serviceWorker
      .register(serviceWorkerUrl, { updateViaCache: "none" })
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
const navCenter = document.querySelector('.nav-center');
const searchToggle = document.getElementById('search-toggle');
const searchOverlay = document.getElementById('nav-search-overlay');
const searchClose = document.getElementById('search-close');
const searchInput = document.getElementById('search-input');
const settingsToggle = document.getElementById('settings-toggle');
const settingsPanel = document.getElementById('settings-panel');
const gameMenuToggle = document.getElementById('game-menu-toggle');
const gameNavPanel = document.getElementById('game-nav-panel');
const gameNavPlay = document.getElementById('game-nav-play');
const navGameBoard = document.getElementById('nav-game-board');
const navGamePlayer = document.getElementById('nav-game-player');
const navGameStart = document.getElementById('nav-game-start');
const navGameScore = document.getElementById('nav-game-score');
const navGameTime = document.getElementById('nav-game-time');
const navGameMessage = document.getElementById('nav-game-message');
const themeOptions = [...document.querySelectorAll('.theme-option')];
const themeMediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const themeStorageKey = 'gatochente_theme_preference';

function getStoredThemePreference() {
  try {
    return localStorage.getItem(themeStorageKey) || 'auto';
  } catch {
    return 'auto';
  }
}

function resolveTheme(preference) {
  if (preference === 'light' || preference === 'dark') return preference;
  return themeMediaQuery && themeMediaQuery.matches ? 'dark' : 'light';
}

function updateThemeControls(preference) {
  themeOptions.forEach((button) => {
    const isActive = button.dataset.themeChoice === preference;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

function applyThemePreference(preference) {
  const safePreference = ['auto', 'light', 'dark'].includes(preference) ? preference : 'auto';
  const resolvedTheme = resolveTheme(safePreference);
  document.documentElement.dataset.themePreference = safePreference;
  document.documentElement.dataset.theme = resolvedTheme;
  updateThemeControls(safePreference);
}

function setThemePreference(preference) {
  try {
    localStorage.setItem(themeStorageKey, preference);
  } catch { /* ignore */ }
  applyThemePreference(preference);
}

applyThemePreference(getStoredThemePreference());

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

function setActiveNavItem(activeItem) {
  if (!activeItem) return;
  navItems.forEach((item) => item.classList.remove('active'));
  activeItem.classList.add('active');
  moveSelector(activeItem);
}

function getNearestNavItem(clientX) {
  if (!navItems.length) return null;
  return navItems.reduce((closest, item) => {
    const rect = item.getBoundingClientRect();
    const distance = Math.abs(clientX - (rect.left + rect.width / 2));
    if (!closest || distance < closest.distance) {
      return { item, distance };
    }
    return closest;
  }, null).item;
}

function moveSelectorWithPointer(clientX) {
  if (!selector || !navCenter || !navItems.length) return;
  const navRect = navCenter.getBoundingClientRect();
  const activeItem = document.querySelector('.nav-item.active') || navItems[0];
  const selectorWidth = activeItem ? activeItem.offsetWidth : selector.offsetWidth;
  const minLeft = navItems[0].offsetLeft;
  const lastItem = navItems[navItems.length - 1];
  const maxLeft = lastItem.offsetLeft + lastItem.offsetWidth - selectorWidth;
  const nextLeft = clientX - navRect.left - selectorWidth / 2;
  selector.style.width = selectorWidth + 'px';
  selector.style.left = Math.max(minLeft, Math.min(maxLeft, nextLeft)) + 'px';
}

function navigateToNavItem(item) {
  if (!item) return;
  const href = item.getAttribute('href');
  if (!href) return;
  const url = new URL(href, window.location.origin);
  if (normalizePath(url.pathname) === getCurrentPage()) return;
  window.location.assign(url.href);
}

function refreshSelector() {
  if (navbar && (navbar.classList.contains('search-open') || navbar.classList.contains('game-menu-open'))) return;
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
  closeSettings();
  closeGameMenu();
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

function openSettings() {
  if (!navbar || !settingsPanel || !settingsToggle) return;
  closeSearch();
  closeGameMenu();
  navbar.classList.add('settings-open');
  settingsPanel.setAttribute('aria-hidden', 'false');
  settingsToggle.setAttribute('aria-expanded', 'true');
}

function closeSettings() {
  if (!navbar || !settingsPanel || !settingsToggle) return;
  navbar.classList.remove('settings-open');
  settingsPanel.setAttribute('aria-hidden', 'true');
  settingsToggle.setAttribute('aria-expanded', 'false');
}

function toggleSettings() {
  if (!navbar) return;
  if (navbar.classList.contains('settings-open')) {
    closeSettings();
  } else {
    openSettings();
  }
}

function openGameMenu() {
  if (!navbar || !gameNavPanel || !gameMenuToggle) return;
  closeSearch();
  closeSettings();
  navbar.classList.add('game-menu-open');
  gameNavPanel.setAttribute('aria-hidden', 'false');
  gameMenuToggle.setAttribute('aria-expanded', 'true');
}

function closeGameMenu() {
  if (!navbar || !gameNavPanel || !gameMenuToggle) return;
  navbar.classList.remove('game-menu-open');
  gameNavPanel.setAttribute('aria-hidden', 'true');
  gameMenuToggle.setAttribute('aria-expanded', 'false');
  window.dispatchEvent(new CustomEvent('navFishingCatClose'));
}

function toggleGameMenu() {
  if (!navbar) return;
  if (navbar.classList.contains('game-menu-open')) {
    closeGameMenu();
  } else {
    openGameMenu();
  }
}

function goToFishingCat() {
  const gameSection = document.getElementById('fishingcat');
  if (gameSection) {
    const scrollToGame = () => {
      const targetTop = gameSection.getBoundingClientRect().top + window.scrollY - 92;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    };
    window.location.hash = 'fishingcat';
    closeGameMenu();
    window.requestAnimationFrame(scrollToGame);
    window.setTimeout(scrollToGame, 180);
    return;
  }
  closeGameMenu();
  window.location.assign('/#fishingcat');
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

function initVerificationBadges() {
  const badges = document.querySelectorAll('.verification-badge');
  if (!badges.length) return;

  const modal = document.createElement('div');
  modal.className = 'verification-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'verification-title');
  modal.setAttribute('aria-hidden', 'true');
  const scriptElement = document.querySelector('script[src*="script.js"]');
  const assetBase = scriptElement ? scriptElement.src : window.location.href;
  const checkBadgeUrl = new URL('img/check.PNG', assetBase).href;
  modal.innerHTML = `
    <div class="verification-dialog">
      <div class="verification-hero">
        <div class="verification-mark" aria-hidden="true">
          <img src="${checkBadgeUrl}" alt="">
        </div>
        <div>
          <span class="verification-eyebrow">Insignia oficial</span>
          <h2 id="verification-title">Términos de la insignia de verificación</h2>
        </div>
      </div>
      <p class="verification-lead">
        La insignia de verificación identifica a un usuario reconocido dentro del portafolio GATOCHENTE. En este sitio, significa que la cuenta, autoría o colaboración mostrada fue agregada directamente por el creador del portafolio y pertenece a una identidad confirmada.
      </p>
      <div class="verification-terms">
        <div>
          <strong>Identidad confirmada</strong>
          <span>El usuario corresponde a la persona o colaborador que aparece en el proyecto.</span>
        </div>
        <div>
          <strong>Colaboración auténtica</strong>
          <span>La participación fue revisada antes de mostrarse públicamente en el sitio.</span>
        </div>
        <div>
          <strong>Uso limitado</strong>
          <span>La insignia solo tiene validez dentro de GATOCHENTE y no representa verificación externa.</span>
        </div>
      </div>
      <p class="verification-note">
        Si una cuenta cambia de nombre, deja de colaborar o se detecta información incorrecta, la insignia puede retirarse para mantener la confianza del portafolio.
      </p>
      <button type="button" class="verification-close">Entendido</button>
    </div>
  `;
  document.body.appendChild(modal);

  const closeButton = modal.querySelector('.verification-close');

  function openModal() {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    closeButton.focus();
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  badges.forEach((badge) => {
    badge.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openModal();
    });
  });

  closeButton.addEventListener('click', closeModal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });
}

function initProfileChips() {
  const chips = document.querySelectorAll('.user-chip[data-user="gatochente"]');
  if (!chips.length) return;

  const modal = document.createElement('div');
  modal.className = 'profile-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'profile-modal-title');
  modal.setAttribute('aria-hidden', 'true');

  const scriptElement = document.querySelector('script[src*="script.js"]');
  const assetBase = scriptElement ? scriptElement.src : window.location.href;
  const avatarUrl = new URL('img/gatochente.jpg', assetBase).href;
  const checkBadgeUrl = new URL('img/check.PNG', assetBase).href;
  const catSocialUrl = new URL('img/catsocial.PNG', assetBase).href;

  modal.innerHTML = `
    <div class="profile-dialog">
      <button type="button" class="profile-close" aria-label="Cerrar perfil">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12"></path>
          <path d="M18 6l-12 12"></path>
        </svg>
      </button>
      <div class="profile-cover" aria-hidden="true"></div>
      <div class="profile-header">
        <img class="profile-avatar" src="${avatarUrl}" alt="Foto de perfil de GATOCHENTE">
        <div class="profile-title-group">
          <span class="profile-eyebrow">Perfil completo</span>
          <h2 id="profile-modal-title">GATOCHENTE</h2>
          <div class="profile-handle-row">
            <span>@gatochente</span>
            <button type="button" class="verification-badge profile-verification-badge" data-tooltip="Verificado" aria-label="Verificado: ver términos de la insignia">
              <img src="${checkBadgeUrl}" alt="Verificado">
            </button>
          </div>
        </div>
      </div>
      <p class="profile-bio">
        Estudiante creador de proyectos con tecnologia, programacion, Arduino, Raspberry Pi y diseno web. Aqui se conectan mis prototipos, ideas escolares y futuras experiencias sociales.
      </p>
      <div class="profile-stats" aria-label="Resumen del perfil">
        <div>
          <strong>3</strong>
          <span>Proyectos</span>
        </div>
        <div>
          <strong>2026</strong>
          <span>Construyendo</span>
        </div>
        <div>
          <strong>CatSocial</strong>
          <span>Proximamente</span>
        </div>
      </div>
      <button type="button" class="catsocial-button" disabled aria-disabled="true">
        <img src="${catSocialUrl}" alt="">
        <span>Ver en CatSocial</span>
        <strong>Proximamente</strong>
      </button>
    </div>
  `;
  document.body.appendChild(modal);

  const closeButton = modal.querySelector('.profile-close');

  function openProfileModal() {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    closeButton.focus();
  }

  function closeProfileModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  chips.forEach((chip) => {
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('aria-label', 'Abrir perfil completo de GATOCHENTE');

    chip.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('.verification-badge')) return;
      openProfileModal();
    });

    chip.addEventListener('keydown', (event) => {
      if (event.target instanceof Element && event.target.closest('.verification-badge')) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openProfileModal();
    });
  });

  closeButton.addEventListener('click', closeProfileModal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeProfileModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeProfileModal();
    }
  });
}

function initMiniGame() {
  const board = document.getElementById('game-board');
  const player = document.getElementById('game-player');
  const startButton = document.getElementById('game-start');
  const scoreElement = document.getElementById('game-score');
  const timeElement = document.getElementById('game-time');
  const messageElement = document.getElementById('game-message');
  const rotateMessage = document.getElementById('rotate-device-message');
  if (!board || !player || !startButton || !scoreElement || !timeElement || !messageElement) return;

  const state = {
    running: false,
    score: 0,
    timeLeft: 30,
    playerX: 0.5,
    items: [],
    lastFrame: 0,
    spawnAt: 0,
    timerId: null,
    animationId: null
  };

  function updateHud() {
    scoreElement.textContent = String(state.score);
    timeElement.textContent = String(state.timeLeft);
  }

  function setMessage(title, detail, visible = true) {
    messageElement.querySelector('strong').textContent = title;
    messageElement.querySelector('span').textContent = detail;
    messageElement.classList.toggle('hidden', !visible);
  }

  function needsLandscapeMode() {
    return window.matchMedia('(max-width: 800px) and (orientation: portrait)').matches;
  }

  function updateOrientationState() {
    const locked = needsLandscapeMode();
    board.setAttribute('aria-hidden', String(locked));
    if (rotateMessage) rotateMessage.setAttribute('aria-hidden', String(!locked));
    startButton.disabled = locked;
    if (locked && state.running) {
      finishGame(true);
    }
    if (!locked && !state.running && startButton.textContent !== 'Jugar de nuevo') {
      startButton.textContent = 'Jugar';
    }
  }

  function getBounds() {
    return board.getBoundingClientRect();
  }

  function setPlayerX(value) {
    state.playerX = Math.max(0.08, Math.min(0.92, value));
    player.style.left = `${state.playerX * 100}%`;
  }

  function moveFromClientX(clientX) {
    const bounds = getBounds();
    setPlayerX((clientX - bounds.left) / bounds.width);
  }

  function clearItems() {
    state.items.forEach((item) => item.element.remove());
    state.items = [];
  }

  function spawnItem() {
    const isBug = Math.random() < 0.24;
    const element = document.createElement('div');
    element.className = `falling-item ${isBug ? 'bug' : 'bit'}`;
    element.innerHTML = '<span class="fish-tail"></span><span class="fish-body"></span><span class="fish-eye"></span>';
    board.appendChild(element);

    const bounds = getBounds();
    const size = 44;
    const playerReach = Math.max(player.offsetWidth / 2, 42);
    const minX = playerReach - size / 2;
    const maxX = Math.max(minX, bounds.width - playerReach - size / 2);
    const x = minX + Math.random() * Math.max(1, maxX - minX);
    const speed = isBug ? 170 + Math.random() * 80 : 130 + Math.random() * 90;
    element.style.left = `${x}px`;
    element.style.top = '-48px';

    state.items.push({ element, x, y: -48, size, speed, isBug });
  }

  function stopTimers() {
    window.clearInterval(state.timerId);
    window.cancelAnimationFrame(state.animationId);
    state.timerId = null;
    state.animationId = null;
  }

  function finishGame(wasStopped = false) {
    state.running = false;
    startButton.textContent = 'Jugar de nuevo';
    stopTimers();
    setMessage(wasStopped ? 'Juego detenido' : 'Fin del juego', `Puntaje final: ${state.score}`, true);
  }

  function tick(timestamp) {
    if (!state.running) return;
    if (!state.lastFrame) state.lastFrame = timestamp;
    const delta = Math.min(32, timestamp - state.lastFrame) / 1000;
    state.lastFrame = timestamp;

    if (timestamp >= state.spawnAt) {
      spawnItem();
      state.spawnAt = timestamp + Math.max(420, 820 - state.score * 8);
    }

    const bounds = getBounds();
    const playerRect = player.getBoundingClientRect();

    state.items = state.items.filter((item) => {
      item.y += item.speed * delta;
      item.element.style.top = `${item.y}px`;

      const itemLeft = bounds.left + item.x;
      const itemRight = itemLeft + item.size;
      const itemTop = bounds.top + item.y;
      const itemBottom = itemTop + item.size;
      const caught = itemRight >= playerRect.left &&
        itemLeft <= playerRect.right &&
        itemBottom >= playerRect.top &&
        itemTop <= playerRect.bottom;

      if (caught) {
        state.score += item.isBug ? -3 : 1;
        if (state.score < 0) state.score = 0;
        updateHud();
        item.element.remove();
        return false;
      }

      if (item.y > bounds.height + 40) {
        item.element.remove();
        return false;
      }

      return true;
    });

    state.animationId = window.requestAnimationFrame(tick);
  }

  function startGame() {
    if (needsLandscapeMode()) {
      updateOrientationState();
      return;
    }

    clearItems();
    state.running = true;
    state.score = 0;
    state.timeLeft = 30;
    state.lastFrame = 0;
    state.spawnAt = 0;
    setPlayerX(0.5);
    updateHud();
    setMessage('', '', false);
    startButton.textContent = 'Detener';
    board.focus();

    stopTimers();
    state.timerId = window.setInterval(() => {
      state.timeLeft -= 1;
      updateHud();
      if (state.timeLeft <= 0) {
        finishGame();
      }
    }, 1000);

    state.animationId = window.requestAnimationFrame(tick);
  }

  board.addEventListener('pointermove', (event) => {
    if (!state.running) return;
    moveFromClientX(event.clientX);
  });

  board.addEventListener('pointerdown', (event) => {
    if (!state.running) return;
    board.setPointerCapture(event.pointerId);
    moveFromClientX(event.clientX);
  });

  board.addEventListener('keydown', (event) => {
    if (!state.running) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setPlayerX(state.playerX - 0.06);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setPlayerX(state.playerX + 0.06);
    }
  });

  startButton.addEventListener('click', () => {
    if (needsLandscapeMode()) {
      updateOrientationState();
      return;
    }
    if (state.running) {
      finishGame(true);
      return;
    }
    startGame();
  });

  window.addEventListener('resize', updateOrientationState);
  window.addEventListener('orientationchange', updateOrientationState);
  updateHud();
  setPlayerX(0.5);
  updateOrientationState();
}

function initNavFishingCat() {
  if (!navGameBoard || !navGamePlayer || !navGameStart || !navGameScore || !navGameTime || !navGameMessage) return;

  const state = {
    running: false,
    score: 0,
    timeLeft: 15,
    playerX: 0.5,
    items: [],
    lastFrame: 0,
    spawnAt: 0,
    timerId: null,
    animationId: null
  };

  function updateHud() {
    navGameScore.textContent = String(state.score);
    navGameTime.textContent = String(state.timeLeft);
  }

  function setMessage(message, visible = true) {
    navGameMessage.textContent = message;
    navGameMessage.classList.toggle('hidden', !visible);
  }

  function setPlayerX(value) {
    state.playerX = Math.max(0.08, Math.min(0.92, value));
    navGamePlayer.style.left = `${state.playerX * 100}%`;
  }

  function moveFromClientX(clientX) {
    const bounds = navGameBoard.getBoundingClientRect();
    setPlayerX((clientX - bounds.left) / bounds.width);
  }

  function clearItems() {
    state.items.forEach((item) => item.element.remove());
    state.items = [];
  }

  function stopTimers() {
    window.clearInterval(state.timerId);
    window.cancelAnimationFrame(state.animationId);
    state.timerId = null;
    state.animationId = null;
  }

  function finishGame(wasStopped = false) {
    if (!state.running && !wasStopped) return;
    state.running = false;
    stopTimers();
    navGameStart.textContent = 'Jugar';
    setMessage(wasStopped ? 'Pausado' : `Final: ${state.score}`, true);
  }

  function spawnItem() {
    const isBomb = Math.random() < 0.24;
    const element = document.createElement('div');
    element.className = `falling-item nav-fish-item ${isBomb ? 'bug' : 'bit'}`;
    element.innerHTML = '<span class="fish-tail"></span><span class="fish-body"></span><span class="fish-eye"></span>';
    navGameBoard.appendChild(element);

    const bounds = navGameBoard.getBoundingClientRect();
    const size = 34;
    const playerReach = Math.max(navGamePlayer.offsetWidth / 2, 30);
    const minX = playerReach - size / 2;
    const maxX = Math.max(minX, bounds.width - playerReach - size / 2);
    const x = minX + Math.random() * Math.max(1, maxX - minX);
    const speed = isBomb ? 120 + Math.random() * 60 : 95 + Math.random() * 70;
    element.style.left = `${x}px`;
    element.style.top = '-36px';
    state.items.push({ element, x, y: -36, size, speed, isBomb });
  }

  function tick(timestamp) {
    if (!state.running) return;
    if (!state.lastFrame) state.lastFrame = timestamp;
    const delta = Math.min(34, timestamp - state.lastFrame) / 1000;
    state.lastFrame = timestamp;

    if (timestamp >= state.spawnAt) {
      spawnItem();
      state.spawnAt = timestamp + Math.max(360, 740 - state.score * 12);
    }

    const bounds = navGameBoard.getBoundingClientRect();
    const playerRect = navGamePlayer.getBoundingClientRect();

    state.items = state.items.filter((item) => {
      item.y += item.speed * delta;
      item.element.style.top = `${item.y}px`;

      const itemLeft = bounds.left + item.x;
      const itemRight = itemLeft + item.size;
      const itemTop = bounds.top + item.y;
      const itemBottom = itemTop + item.size;
      const caught = itemRight >= playerRect.left &&
        itemLeft <= playerRect.right &&
        itemBottom >= playerRect.top &&
        itemTop <= playerRect.bottom;

      if (caught) {
        state.score += item.isBomb ? -2 : 1;
        if (state.score < 0) state.score = 0;
        updateHud();
        item.element.remove();
        return false;
      }

      if (item.y > bounds.height + 28) {
        item.element.remove();
        return false;
      }

      return true;
    });

    state.animationId = window.requestAnimationFrame(tick);
  }

  function startGame() {
    clearItems();
    state.running = true;
    state.score = 0;
    state.timeLeft = 15;
    state.lastFrame = 0;
    state.spawnAt = 0;
    setPlayerX(0.5);
    updateHud();
    setMessage('', false);
    navGameStart.textContent = 'Detener';
    navGameBoard.focus();

    stopTimers();
    state.timerId = window.setInterval(() => {
      state.timeLeft -= 1;
      updateHud();
      if (state.timeLeft <= 0) finishGame();
    }, 1000);
    state.animationId = window.requestAnimationFrame(tick);
  }

  navGameStart.addEventListener('click', (event) => {
    event.stopPropagation();
    if (state.running) {
      finishGame(true);
      return;
    }
    startGame();
  });

  navGameBoard.addEventListener('pointermove', (event) => {
    if (!state.running) return;
    moveFromClientX(event.clientX);
  });

  navGameBoard.addEventListener('pointerdown', (event) => {
    if (!state.running) return;
    navGameBoard.setPointerCapture(event.pointerId);
    moveFromClientX(event.clientX);
  });

  navGameBoard.addEventListener('keydown', (event) => {
    if (!state.running) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setPlayerX(state.playerX - 0.08);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setPlayerX(state.playerX + 0.08);
    }
  });

  window.addEventListener('navFishingCatClose', () => {
    if (state.running) finishGame(true);
  });

  updateHud();
  setPlayerX(0.5);
}

navItems.forEach((item) => {
  item.addEventListener('click', () => {
    closeGameMenu();
    setActiveNavItem(item);
  });
});

initDraggableNavSelector();

function initDraggableNavSelector() {
  if (!navCenter || !selector || !navItems.length || !window.PointerEvent) return;

  const dragState = {
    pointerId: null,
    startX: 0,
    dragging: false,
    suppressNextClick: false,
    hasPointerCapture: false
  };

  const resetDrag = () => {
    if (dragState.hasPointerCapture && dragState.pointerId !== null) {
      try {
        navCenter.releasePointerCapture(dragState.pointerId);
      } catch { /* ignore */ }
    }
    dragState.pointerId = null;
    dragState.startX = 0;
    dragState.dragging = false;
    dragState.hasPointerCapture = false;
    selector.classList.remove('is-dragging');
  };

  navCenter.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button > 0) return;
    if (navbar && (navbar.classList.contains('search-open') || navbar.classList.contains('settings-open') || navbar.classList.contains('game-menu-open'))) return;

    dragState.pointerId = event.pointerId;
    dragState.startX = event.clientX;
    dragState.dragging = false;
    dragState.hasPointerCapture = false;
  });

  navCenter.addEventListener('pointermove', (event) => {
    if (dragState.pointerId !== event.pointerId) return;

    const distance = Math.abs(event.clientX - dragState.startX);
    if (!dragState.dragging && distance < 7) return;

    dragState.dragging = true;
    dragState.suppressNextClick = true;
    if (!dragState.hasPointerCapture) {
      try {
        navCenter.setPointerCapture(event.pointerId);
        dragState.hasPointerCapture = true;
      } catch { /* ignore */ }
    }
    selector.classList.add('is-dragging');
    moveSelectorWithPointer(event.clientX);
  });

  navCenter.addEventListener('pointerup', (event) => {
    if (dragState.pointerId !== event.pointerId) return;

    const wasDragging = dragState.dragging;
    const nearestItem = wasDragging ? getNearestNavItem(event.clientX) : null;
    resetDrag();

    if (!wasDragging || !nearestItem) return;

    setActiveNavItem(nearestItem);
    window.setTimeout(() => {
      navigateToNavItem(nearestItem);
    }, 0);
    window.setTimeout(() => {
      dragState.suppressNextClick = false;
    }, 250);
  });

  navCenter.addEventListener('pointercancel', resetDrag);

  navCenter.addEventListener('click', (event) => {
    if (!dragState.suppressNextClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    dragState.suppressNextClick = false;
  }, true);
}

window.addEventListener('load', () => {
  updateActiveNav();
  refreshSelector();
  hidePageLoader();
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

if (settingsToggle) {
  settingsToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleSettings();
  });
}

if (gameMenuToggle) {
  gameMenuToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleGameMenu();
  });
}

if (gameNavPlay) {
  gameNavPlay.addEventListener('click', goToFishingCat);
}

themeOptions.forEach((button) => {
  button.addEventListener('click', () => {
    const preference = button.dataset.themeChoice || 'auto';
    setThemePreference(preference);
    closeSettings();
  });
});

if (themeMediaQuery) {
  const handleSystemThemeChange = () => {
    if (getStoredThemePreference() === 'auto') {
      applyThemePreference('auto');
    }
  };
  if (themeMediaQuery.addEventListener) {
    themeMediaQuery.addEventListener('change', handleSystemThemeChange);
  } else if (themeMediaQuery.addListener) {
    themeMediaQuery.addListener(handleSystemThemeChange);
  }
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && navbar && navbar.classList.contains('search-open')) {
    closeSearch();
  }
  if (event.key === 'Escape' && navbar && navbar.classList.contains('settings-open')) {
    closeSettings();
  }
  if (event.key === 'Escape' && navbar && navbar.classList.contains('game-menu-open')) {
    closeGameMenu();
  }
});

document.addEventListener('click', (event) => {
  if (!navbar) return;
  if (event.target instanceof Node && navbar.contains(event.target)) return;
  if (navbar.classList.contains('settings-open')) closeSettings();
  if (navbar.classList.contains('game-menu-open')) closeGameMenu();
});

initContactForm();
initProtectedEmailButtons();
initProfileChips();
initVerificationBadges();
initNavFishingCat();
initMiniGame();
