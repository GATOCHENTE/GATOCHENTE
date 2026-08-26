const year = document.getElementById("year");
if (year) year.textContent = "© " + new Date().getFullYear() + " GATOCHENTE";

if (year) year.textContent = "\u00A9 " + new Date().getFullYear() + " GATOCHENTE";

function initExpandableFooter() {
  const footers = document.querySelectorAll('.site-footer');
  if (!footers.length) return;

  footers.forEach((footer) => {
    function toggleFooter() {
      const isExpanded = footer.classList.toggle('is-expanded');
      footer.setAttribute('aria-expanded', String(isExpanded));
    }

    footer.addEventListener('click', toggleFooter);
    footer.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleFooter();
    });
  });
}

initExpandableFooter();

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
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const searchHistoryStorageKey = 'gatochente_search_history';
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
const browserThemeColors = {
  light: '#fff3e6',
  dark: '#151a22'
};

let gatochenteSupabaseClient = null;
const gatochenteAccount = {
  client: null,
  isAdmin: false,
  session: null,
  listeners: []
};

function getGatochenteSupabaseClient() {
  if (gatochenteSupabaseClient) return gatochenteSupabaseClient;

  const config = window.GATOCHENTE_SUPABASE || {};
  const hasConfig = Boolean(config.url && config.publishableKey && window.supabase?.createClient);
  if (!hasConfig) return null;

  gatochenteSupabaseClient = window.supabase.createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'gatochente-account-session',
      ...(config.enablePasskeys ? { experimental: { passkey: true } } : {})
    }
  });

  return gatochenteSupabaseClient;
}

function withTimeout(promise, ms = 15000, message = 'La solicitud tardo demasiado.') {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function escapeHtmlValue(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function getPasskeySupport(client = getGatochenteSupabaseClient()) {
  const config = window.GATOCHENTE_SUPABASE || {};
  return {
    enabled: Boolean(config.enablePasskeys),
    canUse: Boolean(
      config.enablePasskeys &&
      client?.auth?.signInWithPasskey &&
      client?.auth?.registerPasskey &&
      window.PublicKeyCredential
    )
  };
}

function getPasskeyUnavailableMessage(client = getGatochenteSupabaseClient()) {
  const support = getPasskeySupport(client);
  if (!client) return 'Configura Supabase para activar el login.';
  if (!support.enabled) return 'Activa passkeys en la configuración de la web.';
  if (!window.PublicKeyCredential) return 'Este navegador no soporta passkeys en esta página.';
  return 'El SDK de Supabase cargado no tiene soporte de passkeys. Recarga la página.';
}

function getPasskeyErrorMessage(error, action = 'usar') {
  const code = error?.code || error?.status || '';
  const message = String(error?.message || '').toLowerCase();
  if (code === 'passkey_disabled' || (message.includes('passkey') && message.includes('disabled'))) {
    return 'Supabase aún dice que Passkeys está apagado para este proyecto.';
  }
  if (code === 'webauthn_credential_not_found') {
    return 'No existe una passkey registrada. Entra con contraseña y crea una primero.';
  }
  if (code === 'webauthn_credential_exists') {
    return 'Esta passkey ya esta registrada para tu cuenta.';
  }
  if (code === 'email_not_confirmed') {
    return 'Tu email debe estar confirmado antes de usar passkey.';
  }
  if (message.includes('origin') || message.includes('rp id') || message.includes('relying party')) {
    return 'El dominio WebAuthn no coincide. Revisa RP ID y origins en Supabase.';
  }
  if (message.includes('cancel') || message.includes('notallowed')) {
    return 'La passkey se cancelo o el navegador no permitio abrirla.';
  }
  return `No se pudo ${action} la passkey. Revisa Supabase Passkeys.`;
}

async function checkGatochenteAdminSession(session) {
  const client = getGatochenteSupabaseClient();
  if (!client || !session) return false;
  try {
    const { data, error } = await withTimeout(
      client.rpc('is_news_admin'),
      10000,
      'No se pudo confirmar permisos de admin.'
    );
    return !error && data === true;
  } catch (error) {
    console.error('Admin session check failed:', error);
    return false;
  }
}

function subscribeGatochenteAccount(listener) {
  gatochenteAccount.listeners.push(listener);
  listener({ ...gatochenteAccount });
}

function updateGatochenteAccount(nextState) {
  Object.assign(gatochenteAccount, nextState);
  gatochenteAccount.listeners.forEach((listener) => listener({ ...gatochenteAccount }));
}

function initGatochenteAccount() {
  const client = getGatochenteSupabaseClient();
  const navbarElement = document.querySelector('.navbar');
  const navLeft = document.querySelector('.nav-left');
  if (!client || !navLeft) return;

  const scriptElement = document.querySelector('script[src*="script.js"]');
  const assetBase = scriptElement ? scriptElement.src : window.location.href;
  const avatarUrl = new URL('img/gatochente.jpg', assetBase).href;

  const accountButton = document.createElement('button');
  accountButton.type = 'button';
  accountButton.className = 'account-nav-button';
  accountButton.setAttribute('aria-label', 'Iniciar sesión en GATOCHENTE Account');
  accountButton.setAttribute('aria-expanded', 'false');
  accountButton.innerHTML = '<span class="account-login-glyph" aria-hidden="true">\uE000</span>';

  const accountMenu = document.createElement('div');
  accountMenu.className = 'account-nav-menu';
  accountMenu.hidden = true;
  accountMenu.innerHTML = `
    <div class="account-nav-card">
      <img src="${avatarUrl}" alt="Foto de perfil de GATOCHENTE">
      <div>
        <span>GATOCHENTE\u2122 Account</span>
        <strong>@gatochente</strong>
        <p data-account-status>Inicia sesión para editar</p>
      </div>
    </div>
    <div class="account-nav-actions">
      <a href="/noticias" data-account-link>Ir a cuenta</a>
      <button type="button" data-account-passkey-login>Passkey</button>
      <button type="button" data-account-passkey-register hidden>Crear passkey</button>
      <button type="button" data-account-logout hidden>Salir</button>
    </div>
    <p class="account-nav-message" data-account-message></p>
    <form class="account-login-form" data-account-login-form>
      <label>Email<input type="email" data-account-email autocomplete="email" required></label>
      <label>Contraseña<input type="password" data-account-password autocomplete="current-password" required></label>
      <button type="submit">Entrar</button>
    </form>
  `;

  navLeft.appendChild(accountButton);
  navbarElement?.appendChild(accountMenu);

  function closeMenu() {
    accountMenu.hidden = true;
    accountButton.setAttribute('aria-expanded', 'false');
    navbarElement?.classList.remove('account-menu-open');
  }

  accountButton.addEventListener('click', () => {
    const isOpening = accountMenu.hidden;
    accountMenu.hidden = !isOpening;
    accountButton.setAttribute('aria-expanded', String(isOpening));
    navbarElement?.classList.toggle('account-menu-open', isOpening);
  });

  accountMenu.querySelector('[data-account-logout]')?.addEventListener('click', async () => {
    await client.auth.signOut();
    updateGatochenteAccount({ client, session: null, isAdmin: false });
    closeMenu();
  });

  accountMenu.querySelector('[data-account-passkey-login]')?.addEventListener('click', async () => {
    const message = accountMenu.querySelector('[data-account-message]');
    if (!getPasskeySupport(client).canUse) {
      if (message) message.textContent = getPasskeyUnavailableMessage(client);
      return;
    }

    if (message) message.textContent = 'Abriendo passkey...';
    const { error } = await client.auth.signInWithPasskey();
    if (error) {
      console.error('Account passkey login failed:', error);
      if (message) message.textContent = getPasskeyErrorMessage(error, 'entrar con');
      return;
    }

    const { data } = await withTimeout(client.auth.getSession(), 10000, 'No se pudo recuperar la sesión.');
    const isAdmin = await checkGatochenteAdminSession(data.session);
    if (!isAdmin) {
      await client.auth.signOut();
      updateGatochenteAccount({ client, session: null, isAdmin: false });
      if (message) message.textContent = 'Esta passkey no tiene permisos.';
      return;
    }

    if (message) message.textContent = 'Sesión iniciada con passkey.';
    updateGatochenteAccount({ client, session: data.session, isAdmin: true });
  });

  accountMenu.querySelector('[data-account-passkey-register]')?.addEventListener('click', async () => {
    const message = accountMenu.querySelector('[data-account-message]');
    if (!getPasskeySupport(client).canUse || !gatochenteAccount.isAdmin) {
      if (message) message.textContent = !gatochenteAccount.isAdmin ? 'Primero inicia sesión como admin.' : getPasskeyUnavailableMessage(client);
      return;
    }

    if (message) message.textContent = 'Creando passkey...';
    const { error } = await client.auth.registerPasskey();
    if (error) {
      console.error('Account passkey registration failed:', error);
      if (message) message.textContent = getPasskeyErrorMessage(error, 'crear');
      return;
    }
    if (message) message.textContent = 'Passkey creada para esta cuenta.';
  });

  accountMenu.querySelector('[data-account-login-form]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.querySelector('[data-account-email]');
    const password = form.querySelector('[data-account-password]');
    const message = accountMenu.querySelector('[data-account-message]');
    const submitButton = form.querySelector('button[type="submit"]');
    if (!email || !password) return;

    if (submitButton) submitButton.disabled = true;
    if (message) message.textContent = 'Entrando...';
    try {
      const { error } = await withTimeout(
        client.auth.signInWithPassword({
          email: email.value.trim(),
          password: password.value
        }),
        15000,
        'Supabase no respondió al iniciar sesión.'
      );

      if (error) {
        password.value = '';
        if (message) message.textContent = 'No se pudo iniciar sesión. Revisa email y contraseña.';
        return;
      }

      const { data } = await withTimeout(client.auth.getSession(), 10000, 'No se pudo recuperar la sesión.');
      const isAdmin = await checkGatochenteAdminSession(data.session);
      if (!isAdmin) {
        await client.auth.signOut();
        updateGatochenteAccount({ client, session: null, isAdmin: false });
        if (message) message.textContent = 'Esta cuenta no tiene permisos.';
        return;
      }

      password.value = '';
      if (message) message.textContent = 'Sesión iniciada.';
      updateGatochenteAccount({ client, session: data.session, isAdmin: true });
    } catch (error) {
      console.error('Account login failed:', error);
      if (message) message.textContent = error.message || 'No se pudo iniciar sesión.';
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest('.account-nav-button,.account-nav-menu')) return;
    closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  subscribeGatochenteAccount(({ isAdmin, session }) => {
    const hasSession = Boolean(session);
    accountButton.classList.toggle('is-logged-in', hasSession);
    accountButton.setAttribute('aria-label', hasSession ? 'Abrir GATOCHENTE Account' : 'Iniciar sesión en GATOCHENTE Account');
    accountButton.innerHTML = hasSession
      ? `<img src="${avatarUrl}" alt="">`
      : '<span class="account-login-glyph" aria-hidden="true">\uE000</span>';
    const status = accountMenu.querySelector('[data-account-status]');
    const logout = accountMenu.querySelector('[data-account-logout]');
    const link = accountMenu.querySelector('[data-account-link]');
    const loginForm = accountMenu.querySelector('[data-account-login-form]');
    const passkeyLogin = accountMenu.querySelector('[data-account-passkey-login]');
    const passkeyRegister = accountMenu.querySelector('[data-account-passkey-register]');
    if (status) status.textContent = isAdmin ? 'Sesión admin activa' : 'Entra para editar noticias';
    if (logout) logout.hidden = !hasSession;
    if (link) link.textContent = hasSession ? 'Ir a cuenta' : 'Iniciar sesión';
    if (loginForm) loginForm.hidden = hasSession;
    if (passkeyLogin) passkeyLogin.hidden = hasSession || !getPasskeySupport(client).canUse;
    if (passkeyRegister) passkeyRegister.hidden = !isAdmin || !getPasskeySupport(client).canUse;
  });

  client.auth.onAuthStateChange(async (_event, session) => {
    const isAdmin = await checkGatochenteAdminSession(session);
    updateGatochenteAccount({ client, session, isAdmin });
  });

  client.auth.getSession().then(async ({ data }) => {
    const isAdmin = await checkGatochenteAdminSession(data.session);
    updateGatochenteAccount({ client, session: data.session, isAdmin });
  });
}

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

function updateBrowserThemeColor(theme) {
  const color = browserThemeColors[theme] || browserThemeColors.light;
  let themeMeta = document.querySelector('meta[name="theme-color"]:not([media])');

  if (!themeMeta) {
    themeMeta = document.createElement('meta');
    themeMeta.setAttribute('name', 'theme-color');
    document.head.appendChild(themeMeta);
  }

  themeMeta.setAttribute('content', color);
  document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
}

function applyThemePreference(preference) {
  const safePreference = ['auto', 'light', 'dark'].includes(preference) ? preference : 'auto';
  const resolvedTheme = resolveTheme(safePreference);
  document.documentElement.dataset.themePreference = safePreference;
  document.documentElement.dataset.theme = resolvedTheme;
  updateBrowserThemeColor(resolvedTheme);
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

const routePages = {
  '/': 'Inicio',
  '/sobre-mi': 'Sobre',
  '/proyectos': 'Proyectos',
  '/catpack': 'CatPack',
  '/noticias': 'Noticias',
  '/contacto': 'Contacto'
};

const routeHashLabels = {
  fishingcat: 'FishingCat',
  catpack: 'CatPack',
  'bano-ecologico': 'Baño Ecológico',
  'paso-peatonal': 'Paso Peatonal',
  'detecta-y-protege': 'Detecta y Protege',
  'version-anterior': 'Versiones Anteriores'
};

let observedRouteHash = '';
let routeScrollFrame = null;

function titleCaseRoutePart(value) {
  return value
    .replace(/^#/, '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getHashRouteLabel(hash) {
  const id = hash.replace(/^#/, '');
  if (!id) return '';

  const target = document.getElementById(id);
  if (target) {
    const heading = target.matches('h1,h2,h3') ? target : target.querySelector('[data-route-title],h1,h2,h3');
    if (heading && heading.textContent.trim()) return heading.textContent.trim();
  }

  if (routeHashLabels[id]) return routeHashLabels[id];
  return titleCaseRoutePart(id);
}

function createRouteCrumb({ href, label, isHome = false, isCurrent = false }) {
  const link = document.createElement('a');
  link.href = href;
  if (isCurrent) link.setAttribute('aria-current', 'page');

  const span = document.createElement('span');
  span.className = isHome ? 'route-tab-glyph' : 'route-tab-label';
  span.textContent = isHome ? '\uE000' : label;
  link.appendChild(span);

  if (isHome) link.setAttribute('aria-label', 'Inicio');
  return link;
}

function renderRouteTab() {
  if (!navbar) return;

  let routeTab = document.querySelector('.route-tab');
  if (!routeTab) {
    routeTab = document.createElement('nav');
    routeTab.className = 'route-tab';
    routeTab.setAttribute('aria-label', 'Ruta de navegación');
    navbar.insertAdjacentElement('beforebegin', routeTab);
  }

  const currentPath = getCurrentPage();
  const currentHash = window.location.hash || observedRouteHash;
  const crumbs = [
    {
      href: '/',
      label: 'Inicio',
      isHome: true,
      isCurrent: currentPath === '/' && !currentHash
    }
  ];

  if (currentPath !== '/') {
    crumbs.push({
      href: currentPath,
      label: routePages[currentPath] || titleCaseRoutePart(currentPath),
      isCurrent: !currentHash
    });
  }

  if (currentHash) {
    crumbs.push({
      href: `${currentPath}${currentHash}`,
      label: getHashRouteLabel(currentHash),
      isCurrent: true
    });
  }

  const shouldShowRouteTab = crumbs.length >= 2;
  routeTab.classList.toggle('is-hidden', !shouldShowRouteTab);
  navbar.classList.toggle('route-tab-open', shouldShowRouteTab);
  routeTab.replaceChildren();
  if (!shouldShowRouteTab) return;

  crumbs.forEach((crumb, index) => {
    if (index > 0) {
      const separator = document.createElement('span');
      separator.className = 'route-tab-separator';
      separator.setAttribute('aria-hidden', 'true');
      routeTab.appendChild(separator);
    }
    routeTab.appendChild(createRouteCrumb(crumb));
  });
}

function getVisibleRouteHash() {
  const routeIds = Object.keys(routeHashLabels);
  const markerY = Math.min(window.innerHeight * 0.34, 220);
  let closest = null;

  routeIds.forEach((id) => {
    const target = document.getElementById(id);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    if (rect.bottom < 96 || rect.top > window.innerHeight * 0.72) return;

    const distance = Math.abs(rect.top - markerY);
    if (!closest || distance < closest.distance) {
      closest = { id, distance };
    }
  });

  return closest ? `#${closest.id}` : '';
}

function updateObservedRoute() {
  if (window.location.hash) {
    observedRouteHash = '';
    renderRouteTab();
    return;
  }

  const nextHash = getVisibleRouteHash();
  if (nextHash === observedRouteHash) return;
  observedRouteHash = nextHash;
  renderRouteTab();
}

function scheduleObservedRouteUpdate() {
  if (routeScrollFrame) return;
  routeScrollFrame = window.requestAnimationFrame(() => {
    routeScrollFrame = null;
    updateObservedRoute();
  });
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

function scrollNavItemIntoView(activeItem, behavior = 'smooth') {
  if (!navCenter || !activeItem) return;
  if (navCenter.scrollWidth <= navCenter.clientWidth + 1) return;

  const targetLeft = activeItem.offsetLeft - (navCenter.clientWidth - activeItem.offsetWidth) / 2;
  const maxLeft = navCenter.scrollWidth - navCenter.clientWidth;
  navCenter.scrollTo({
    left: Math.max(0, Math.min(maxLeft, targetLeft)),
    behavior
  });
}

function setActiveNavItem(activeItem) {
  if (!activeItem) return;
  navItems.forEach((item) => item.classList.remove('active'));
  activeItem.classList.add('active');
  moveSelector(activeItem);
  scrollNavItemIntoView(activeItem);
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
    scrollNavItemIntoView(activeItem, 'auto');
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

const globalSearchIndex = [
  {
    title: 'Inicio',
    eyebrow: 'Página',
    description: 'Portada del portafolio de GATOCHENTE.',
    url: '/',
    keywords: ['home', 'inicio', 'portafolio', 'gatochente', 'vicente']
  },
  {
    title: 'Habilidades en crecimiento',
    eyebrow: 'Inicio',
    description: 'HTML, CSS, JavaScript, Python, Arduino, Raspberry Pi, GitHub y Figma.',
    url: '/#skills-title',
    keywords: ['habilidades', 'skills', 'html', 'css', 'javascript', 'python', 'arduino', 'raspberry', 'github', 'figma']
  },
  {
    title: 'CatSocial',
    eyebrow: 'Proyecto actual',
    description: 'Red social estilo X/Twitter con límites sanos, temas agradables y comunidad propia.',
    url: '/#current-project-title',
    keywords: ['catsocial', 'cat social', 'red social', 'twitter', 'x', 'temas', 'límites', 'verificacion', 'beta']
  },
  {
    title: 'FishingCat',
    eyebrow: 'Juego',
    description: 'Mini juego del gatito pescador con puntos, peces y tiempo límite.',
    url: '/#fishingcat',
    keywords: ['fishingcat', 'juego', 'gatito', 'pescador', 'peces', 'fish']
  },
  {
    title: 'Proyectos',
    eyebrow: 'Página',
    description: 'Archivo de proyectos ordenados desde 2023 hasta 2025.',
    url: '/proyectos',
    keywords: ['proyectos', 'trabajos', 'archivo', '2023', '2024', '2025', 'maquetas', 'prototipos']
  },
  {
    title: 'CatPack',
    eyebrow: 'Aplicacion',
    description: 'Archivador moderno para comprimir, extraer, inspeccionar y verificar archivos .gcat en Windows.',
    url: '/catpack',
    keywords: ['catpack', 'cat pack', 'gcat', '.gcat', 'windows', 'archivador', 'compresor', 'zstd', 'sha-256', 'instalador']
  },
  {
    title: 'Noticias',
    eyebrow: 'Noticiero',
    description: 'Mini blog con novedades, cambios de la web, avances de proyectos y actualizaciones de GATOCHENTE.',
    url: '/noticias',
    keywords: ['noticias', 'noticiero', 'blog', 'novedades', 'actualizaciones', 'posts', 'publicaciones']
  },
  {
    title: 'Baño ecológico',
    eyebrow: 'Proyecto 2023',
    description: 'Maqueta con ahorro de agua, reciclaje de residuos, circuitos, bomba y pulsador.',
    url: '/proyectos#bano-ecologico',
    keywords: ['baño', 'bano', 'ecologico', 'agua', 'bomba', 'pulsador', 'circuitos', 'protoboard', '2023']
  },
  {
    title: 'Innovador paso peatonal',
    eyebrow: 'Proyecto 2024',
    description: 'Prototipo con Arduino, semáforo inteligente, barreras automáticas, LEDs y servomotores.',
    url: '/proyectos#paso-peatonal',
    keywords: ['paso peatonal', 'peatonal', 'semaforo', 'semáforo', 'arduino', 'barreras', 'servomotores', 'leds', '2024']
  },
  {
    title: 'Detecta y protege',
    eyebrow: 'Proyecto 2025',
    description: 'Sistema de alerta sísmica con sensores de vibración, Arduino y LEDs.',
    url: '/proyectos#detecta-y-protege',
    keywords: ['detecta', 'protege', 'sismo', 'sismica', 'sísmica', 'sensor', 'vibracion', 'vibración', 'arduino', 'leds', '2025']
  },
  {
    title: 'Sobre mí',
    eyebrow: 'Página',
    description: 'Información sobre GATOCHENTE, intereses, tecnología y creatividad.',
    url: '/sobre-mi',
    keywords: ['sobre mi', 'sobre mí', 'perfil', 'vicente', 'gatochente', 'bio']
  },
  {
    title: 'Contacto',
    eyebrow: 'Página',
    description: 'Formulario y redes para contactar a GATOCHENTE.',
    url: '/contacto',
    keywords: ['contacto', 'email', 'correo', 'github', 'youtube', 'mensaje']
  }
];

function replaceDynamicSearchItems(source, items) {
  for (let index = globalSearchIndex.length - 1; index >= 0; index -= 1) {
    if (globalSearchIndex[index].source === source) globalSearchIndex.splice(index, 1);
  }
  globalSearchIndex.push(...items.map((item) => ({ ...item, source })));
}

let searchResultsPanel = null;
let searchResultsList = null;
let searchHistoryList = null;
let searchEmptyState = null;
let searchClearHistoryButton = null;
let searchShowMoreButton = null;
let currentSearchResults = [];
let searchShowAllResults = false;
const searchCollapsedResultLimit = 3;
const homeGlyphSearchToken = '\uE000';

if (searchInput) {
  searchInput.placeholder = 'Buscar en toda la página...';
}

function normalizeSearchText(value) {
  return (value || '')
    .toString()
    .replaceAll(homeGlyphSearchToken, ' inicio ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getSearchHaystack(item) {
  return normalizeSearchText([
    item.title,
    item.eyebrow,
    item.description,
    ...(item.keywords || [])
  ].join(' '));
}

function scoreSearchItem(item, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const words = normalizedQuery.split(/\s+/).filter(Boolean);
  const title = normalizeSearchText(item.title);
  const haystack = getSearchHaystack(item);
  let score = 0;

  if (title === normalizedQuery) score += 120;
  if (title.startsWith(normalizedQuery)) score += 72;
  if (title.includes(normalizedQuery)) score += 48;
  if (haystack.includes(normalizedQuery)) score += 32;

  words.forEach((word) => {
    if (title.includes(word)) score += 24;
    if (haystack.includes(word)) score += 10;
    (item.keywords || []).forEach((keyword) => {
      const normalizedKeyword = normalizeSearchText(keyword);
      if (normalizedKeyword === word) score += 16;
      if (normalizedKeyword.includes(word)) score += 8;
    });
  });

  return score;
}

function getSearchResults(query) {
  return globalSearchIndex
    .map((item) => ({ ...item, score: scoreSearchItem(item, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 12);
}

function getSearchHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(searchHistoryStorageKey) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string').slice(0, 8) : [];
  } catch {
    return [];
  }
}

function setSearchHistory(history) {
  try {
    localStorage.setItem(searchHistoryStorageKey, JSON.stringify(history.slice(0, 8)));
  } catch { /* ignore */ }
}

function saveSearchHistory(query) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return;
  const normalizedQuery = normalizeSearchText(cleanQuery);
  const nextHistory = [
    cleanQuery,
    ...getSearchHistory().filter((item) => normalizeSearchText(item) !== normalizedQuery)
  ];
  setSearchHistory(nextHistory);
}

function removeSearchHistoryItem(query) {
  const normalizedQuery = normalizeSearchText(query);
  setSearchHistory(getSearchHistory().filter((item) => normalizeSearchText(item) !== normalizedQuery));
  renderSearchPanel(searchInput ? searchInput.value.trim() : '');
}

function clearSearchHistory() {
  setSearchHistory([]);
  renderSearchPanel(searchInput ? searchInput.value.trim() : '');
}

function ensureSearchPanel() {
  if (!searchOverlay || searchResultsPanel) return;

  searchResultsPanel = document.createElement('div');
  searchResultsPanel.className = 'search-results-panel';
  searchResultsPanel.innerHTML = `
    <div class="search-results-block" data-search-results-block>
      <div class="search-panel-header">
        <span>Resultados</span>
      </div>
      <div class="search-results-list" id="search-results-list"></div>
      <button type="button" class="search-show-more" id="search-show-more">Ver más...</button>
    </div>
    <div class="search-results-block" data-search-history-block>
      <div class="search-panel-header">
        <span>Recientes</span>
        <button type="button" class="search-history-clear" id="search-history-clear">Borrar todo</button>
      </div>
      <div class="search-history-list" id="search-history-list"></div>
    </div>
    <div class="search-empty-state" id="search-empty-state">Escribe para buscar en Inicio, Proyectos, Sobre mí y Contacto.</div>
  `;
  searchOverlay.appendChild(searchResultsPanel);
  searchResultsList = searchResultsPanel.querySelector('#search-results-list');
  searchHistoryList = searchResultsPanel.querySelector('#search-history-list');
  searchEmptyState = searchResultsPanel.querySelector('#search-empty-state');
  searchClearHistoryButton = searchResultsPanel.querySelector('#search-history-clear');
  searchShowMoreButton = searchResultsPanel.querySelector('#search-show-more');

  if (searchClearHistoryButton) {
    searchClearHistoryButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      clearSearchHistory();
      if (searchInput) searchInput.focus();
    });
  }
  if (searchShowMoreButton) {
    searchShowMoreButton.addEventListener('click', () => {
      searchShowAllResults = !searchShowAllResults;
      renderSearchPanel(searchInput ? searchInput.value.trim() : '');
    });
  }
}

function buildResultButton(item) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'search-result-item';
  button.innerHTML = `
    <span class="search-result-eyebrow"></span>
    <strong></strong>
    <small></small>
  `;
  button.querySelector('.search-result-eyebrow').textContent = item.eyebrow;
  button.querySelector('strong').textContent = item.title;
  button.querySelector('small').textContent = item.description;
  button.addEventListener('click', () => {
    const query = searchInput ? searchInput.value.trim() : item.title;
    saveSearchHistory(query || item.title);
    navigateToSearchResult(item.url);
  });
  return button;
}

function buildHistoryItem(query) {
  const row = document.createElement('div');
  row.className = 'search-history-item';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = query;
  button.addEventListener('click', () => {
    if (searchInput) {
      searchInput.value = query;
      searchInput.focus();
    }
    renderSearchPanel(query);
    highlightText(query);
  });

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'search-history-remove';
  removeButton.setAttribute('aria-label', `Borrar búsqueda ${query}`);
  removeButton.textContent = '×';
  removeButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    removeSearchHistoryItem(query);
    if (searchInput) searchInput.focus();
  });

  row.append(button, removeButton);
  return row;
}

function renderSearchPanel(query = '') {
  ensureSearchPanel();
  if (!searchResultsPanel || !searchResultsList || !searchHistoryList || !searchEmptyState) return;

  const cleanQuery = query.trim();
  if (searchClear) searchClear.hidden = !cleanQuery;
  if (navbar) {
    navbar.classList.toggle('tool-search-active', Boolean(cleanQuery) && navbar.classList.contains('game-menu-open'));
  }
  const history = getSearchHistory();
  currentSearchResults = cleanQuery ? getSearchResults(cleanQuery) : [];
  if (!cleanQuery) searchShowAllResults = false;

  const visibleResults = searchShowAllResults
    ? currentSearchResults
    : currentSearchResults.slice(0, searchCollapsedResultLimit);
  const hiddenResultsCount = Math.max(0, currentSearchResults.length - visibleResults.length);

  searchResultsList.replaceChildren(...visibleResults.map(buildResultButton));
  searchHistoryList.replaceChildren(...history.map(buildHistoryItem));

  const resultsBlock = searchResultsPanel.querySelector('[data-search-results-block]');
  const historyBlock = searchResultsPanel.querySelector('[data-search-history-block]');
  const hasResults = currentSearchResults.length > 0;
  const hasHistory = history.length > 0;

  if (resultsBlock) resultsBlock.hidden = !cleanQuery || !hasResults;
  if (resultsBlock) resultsBlock.style.gridColumn = hasHistory ? '' : '1 / -1';
  if (historyBlock) {
    historyBlock.hidden = !hasHistory;
    historyBlock.style.gridColumn = cleanQuery && hasResults ? '' : '1 / -1';
  }
  if (searchClearHistoryButton) searchClearHistoryButton.hidden = !hasHistory;
  if (searchShowMoreButton) {
    searchShowMoreButton.hidden = currentSearchResults.length <= searchCollapsedResultLimit;
    searchShowMoreButton.textContent = searchShowAllResults
      ? 'Ver menos'
      : `Ver más... (${Math.max(0, currentSearchResults.length - searchCollapsedResultLimit)})`;
  }

  if (searchResultsList) {
    searchResultsList.classList.toggle('is-scrollable', searchShowAllResults && currentSearchResults.length > 5);
  }

  updateSearchNavbarHeight({
    visibleResults: visibleResults.length,
    historyCount: hasHistory ? Math.min(history.length, 4) : 0,
    hasQuery: Boolean(cleanQuery),
    showAll: searchShowAllResults
  });

  searchEmptyState.hidden = Boolean((cleanQuery && hasResults) || hasHistory);
  if (cleanQuery && !hasResults) {
    searchEmptyState.textContent = 'No encontré coincidencias claras. Prueba con proyectos, CatSocial, Arduino o contacto.';
  } else {
    searchEmptyState.textContent = 'Escribe para buscar en Inicio, Proyectos, Sobre mí y Contacto.';
  }
}

function updateSearchNavbarHeight({ visibleResults = 0, historyCount = 0, hasQuery = false, showAll = false } = {}) {
  if (!navbar) return;
  const baseHeight = 232;
  const isCompactViewport = window.innerWidth <= 800;
  let targetHeight = baseHeight;

  if (showAll) {
    targetHeight = 520;
  } else if (hasQuery && visibleResults > 0) {
    targetHeight = isCompactViewport ? 430 : 318;
  } else if (!hasQuery && historyCount > 2) {
    targetHeight = isCompactViewport ? 360 : 300;
  }

  navbar.style.setProperty('--search-open-height', `${targetHeight}px`);
}

function navigateToSearchResult(url) {
  closeSearch(false);
  window.location.assign(url);
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
    if (node.parentElement && node.parentElement.closest('.route-tab')) continue;
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
  ensureSearchPanel();
  renderSearchPanel(searchInput.value.trim());
  navbar.classList.add('search-open');
  searchOverlay.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    searchInput.focus();
  });
}

function closeSearch(resetInput = true) {
  if (!navbar || !searchOverlay || !searchInput) return;
  navbar.classList.remove('search-open');
  searchOverlay.setAttribute('aria-hidden', 'true');
  if (resetInput) {
    searchInput.value = '';
    renderSearchPanel('');
  }
  clearHighlight();
}

function openSettings() {
  if (!navbar || !settingsPanel) return;
  closeSearch();
  closeGameMenu();
  navbar.classList.add('settings-open');
  settingsPanel.setAttribute('aria-hidden', 'false');
  if (settingsToggle) settingsToggle.setAttribute('aria-expanded', 'true');
}

function closeSettings() {
  if (!navbar || !settingsPanel) return;
  navbar.classList.remove('settings-open');
  settingsPanel.setAttribute('aria-hidden', 'true');
  if (settingsToggle) settingsToggle.setAttribute('aria-expanded', 'false');
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
  ensureSearchPanel();
  renderSearchPanel(searchInput ? searchInput.value.trim() : '');
  navbar.classList.add('game-menu-open');
  gameNavPanel.setAttribute('aria-hidden', 'false');
  if (searchOverlay) searchOverlay.setAttribute('aria-hidden', 'false');
  if (settingsPanel) settingsPanel.setAttribute('aria-hidden', 'false');
  gameMenuToggle.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => {
    if (searchInput) searchInput.focus();
  });
}

function closeGameMenu() {
  if (!navbar || !gameNavPanel || !gameMenuToggle) return;
  navbar.classList.remove('game-menu-open');
  navbar.classList.remove('tool-search-active');
  gameNavPanel.setAttribute('aria-hidden', 'true');
  if (searchOverlay) searchOverlay.setAttribute('aria-hidden', 'true');
  if (settingsPanel) settingsPanel.setAttribute('aria-hidden', 'true');
  gameMenuToggle.setAttribute('aria-expanded', 'false');
  if (searchInput) {
    searchInput.value = '';
    renderSearchPanel('');
  }
  clearHighlight();
  window.dispatchEvent(new CustomEvent('navFishingCatClose'));
}

function toggleGameMenu() {
  if (!navbar) return;
  if (navbar.classList.contains('game-menu-open') && navbar.classList.contains('tool-search-active')) {
    if (searchInput) searchInput.value = '';
    renderSearchPanel('');
    clearHighlight();
    if (searchInput) searchInput.focus();
    return;
  }
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

function initDonationModal() {
  const modal = document.getElementById('donation-modal');
  const openButtons = [...document.querySelectorAll('[data-paypal-modal]')];
  const closeButton = document.getElementById('donation-close');
  if (!modal || !openButtons.length) return;

  function openDonationModal() {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
  }

  function closeDonationModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
  }

  openButtons.forEach((button) => {
    button.addEventListener('click', openDonationModal);
  });

  if (closeButton) closeButton.addEventListener('click', closeDonationModal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeDonationModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeDonationModal();
    }
  });
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

function initProjectCards() {
  const projectsSection = document.querySelector('.projects');
  if (!projectsSection) return;

  function getProjectCards() {
    return [...projectsSection.querySelectorAll('.card[id]')];
  }

  const modal = document.createElement('div');
  modal.className = 'project-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'project-modal-title');
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="project-dialog">
      <button type="button" class="project-close" aria-label="Cerrar proyecto">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12"></path>
          <path d="M18 6l-12 12"></path>
        </svg>
      </button>
      <div class="project-modal-media">
        <img src="" alt="">
      </div>
      <div class="project-modal-content">
        <p class="project-modal-kicker"></p>
        <h2 id="project-modal-title"></h2>
        <p class="project-modal-description"></p>
        <div class="project-modal-notes"></div>
        <div class="project-modal-tags"></div>
        <div class="project-modal-collaborators"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const closeButton = modal.querySelector('.project-close');
  const mediaImage = modal.querySelector('.project-modal-media img');
  const kicker = modal.querySelector('.project-modal-kicker');
  const title = modal.querySelector('#project-modal-title');
  const description = modal.querySelector('.project-modal-description');
  const notes = modal.querySelector('.project-modal-notes');
  const tags = modal.querySelector('.project-modal-tags');
  const collaborators = modal.querySelector('.project-modal-collaborators');

  function getProjectData(card) {
    const img = card.querySelector(':scope > img');
    return {
      id: card.id,
      image: img ? img.getAttribute('src') : '',
      imageAlt: img ? img.getAttribute('alt') : '',
      kicker: card.querySelector('.card-kicker')?.textContent.trim() || '',
      title: card.querySelector('h3')?.textContent.trim() || '',
      description: card.querySelector(':scope > p:not(.card-kicker)')?.textContent.trim() || '',
      notes: [...card.querySelectorAll('.project-notes p')].map((item) => item.textContent.trim()),
      tags: [...card.querySelectorAll('.card-tags span')].map((item) => item.textContent.trim()),
      collaborators: card.querySelector('.project-collaborators')?.cloneNode(true) || null
    };
  }

  function openProject(card, updateHash = true) {
    const data = getProjectData(card);
    if (!data.title) return;

    mediaImage.src = data.image;
    mediaImage.alt = data.imageAlt || data.title;
    kicker.textContent = data.kicker;
    title.textContent = data.title;
    description.textContent = data.description;

    notes.replaceChildren(...data.notes.map((noteText) => {
      const item = document.createElement('p');
      item.textContent = noteText;
      return item;
    }));

    tags.replaceChildren(...data.tags.map((tagText) => {
      const item = document.createElement('span');
      item.textContent = tagText;
      return item;
    }));

    if (data.collaborators) {
      data.collaborators.querySelectorAll('.user-chip').forEach((chip) => {
        chip.setAttribute('role', 'button');
        chip.setAttribute('tabindex', '0');
        chip.setAttribute('aria-label', `Abrir perfil completo de ${chip.textContent.trim()}`);
      });
      collaborators.replaceChildren(data.collaborators);
    } else {
      collaborators.replaceChildren();
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    if (updateHash && data.id) {
      history.replaceState(null, '', `#${data.id}`);
    }
  }

  function closeProject() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function prepareProjectCard(card) {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Ver proyecto ${card.querySelector('h3')?.textContent.trim() || ''}`);
  }

  getProjectCards().forEach(prepareProjectCard);

  projectsSection.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('button,a,.user-chip')) return;
    const card = event.target instanceof Element ? event.target.closest('.card[id]') : null;
    if (!card || !projectsSection.contains(card)) return;
    prepareProjectCard(card);
    openProject(card);
  });

  projectsSection.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target instanceof Element ? event.target.closest('.card[id]') : null;
    if (!card || !projectsSection.contains(card)) return;
    event.preventDefault();
    prepareProjectCard(card);
    openProject(card);
  });

  closeButton.addEventListener('click', closeProject);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeProject();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      if (document.querySelector('.profile-modal.is-open, .verification-modal.is-open')) return;
      closeProject();
    }
  });

  function openProjectFromHash() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const targetCard = getProjectCards().find((card) => card.id === hash);
    if (targetCard) {
      window.setTimeout(() => openProject(targetCard, false), 180);
    }
  }

  openProjectFromHash();
  window.addEventListener('hashchange', openProjectFromHash);
  document.addEventListener('gatochente:projects-rendered', () => {
    getProjectCards().forEach(prepareProjectCard);
  });
}

function initProjectPosts() {
  const projectsSection = document.querySelector('.projects');
  const featuredGrid = document.querySelector('.featured-grid');
  if (!projectsSection && !featuredGrid) return;

  const client = getGatochenteSupabaseClient();
  const scriptElement = document.querySelector('script[src*="script.js"]');
  const assetBase = scriptElement ? scriptElement.src : window.location.href;
  const avatarUrl = new URL('img/gatochente.jpg', assetBase).href;
  const checkBadgeUrl = new URL('img/check.PNG', assetBase).href;
  const fallbackImage = new URL('img/proyecto2.jpg', assetBase).href;
  let projectItems = [];
  let isAdmin = false;
  let selectedProjectImage = null;
  let adminPanel = null;
  let editorForm = null;
  let statusText = null;

  function slugify(value) {
    return String(value || 'proyecto')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'proyecto';
  }

  function normalizeProject(post) {
    return {
      id: post.id,
      slug: `proyecto-${slugify(post.title)}-${String(post.id || '').slice(0, 8)}`,
      title: post.title || 'Proyecto sin titulo',
      category: post.category || 'Proyecto',
      summary: post.summary || '',
      body: post.body || post.summary || '',
      imageUrl: post.image_url || '',
      projectYear: post.project_year || 'En desarrollo',
      tags: Array.isArray(post.tags) ? post.tags : []
    };
  }

  function collaboratorMarkup() {
    return `
      <div class="project-collaborators" aria-label="Colaboradores del proyecto">
        <span class="collaborators-label">Colaborador</span>
        <div class="user-chip" data-user="gatochente">
          <img class="user-avatar" src="${avatarUrl}" alt="Foto de perfil de GATOCHENTE">
          <span class="user-handle">@gatochente</span>
          <button type="button" class="verification-badge" data-tooltip="Verificado" aria-label="Verificado: ver términos de la insignia">
            <img src="${checkBadgeUrl}" alt="Verificado">
          </button>
        </div>
      </div>
    `;
  }

  function createProjectCard(item, index) {
    const article = document.createElement('article');
    article.className = index === 0 ? 'card project-featured project-dynamic-card' : 'card project-dynamic-card';
    article.id = item.slug;
    article.dataset.projectId = item.id;
    article.innerHTML = `
      ${index === 0 ? '<span class="project-recent-label">Proyecto reciente</span>' : ''}
      <button type="button" class="project-edit-button" data-project-edit="${escapeHtmlValue(item.id)}" aria-label="Editar proyecto">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
      </button>
      <img src="${escapeHtmlValue(item.imageUrl || fallbackImage)}" alt="">
      <p class="card-kicker">${escapeHtmlValue(item.category)} · ${escapeHtmlValue(item.projectYear)}</p>
      <h3>${escapeHtmlValue(item.title)}</h3>
      <p>${escapeHtmlValue(item.summary)}</p>
      <div class="project-notes"><p>${escapeHtmlValue(item.body)}</p></div>
      <div class="card-tags">
        ${(item.tags.length ? item.tags : [item.category]).map((tag) => `<span>${escapeHtmlValue(tag)}</span>`).join('')}
      </div>
      ${collaboratorMarkup()}
    `;
    return article;
  }

  function createFeaturedProject(item) {
    const article = document.createElement('article');
    article.className = 'featured-card featured-dynamic-card';
    article.innerHTML = `
      <img src="${escapeHtmlValue(item.imageUrl || fallbackImage)}" alt="">
      <div>
        <p class="project-year">${escapeHtmlValue(item.projectYear)}</p>
        <h3>${escapeHtmlValue(item.title)}</h3>
        <p>${escapeHtmlValue(item.summary)}</p>
        <div class="featured-collaborators" aria-label="Colaboradores del proyecto">
          <span class="collaborators-label">Colaborador</span>
          <div class="user-chip" data-user="gatochente">
            <img class="user-avatar" src="${avatarUrl}" alt="Foto de perfil de GATOCHENTE">
            <span class="user-handle">@gatochente</span>
            <button type="button" class="verification-badge" data-tooltip="Verificado" aria-label="Verificado: ver términos de la insignia">
              <img src="${checkBadgeUrl}" alt="Verificado">
            </button>
          </div>
        </div>
        <a href="/proyectos#${escapeHtmlValue(item.slug)}">Ver detalles</a>
      </div>
    `;
    return article;
  }

  function renderProjects() {
    replaceDynamicSearchItems('projects', projectItems.map((item) => ({
      title: item.title,
      eyebrow: item.category,
      description: item.summary,
      url: `/proyectos#${item.slug}`,
      keywords: [item.projectYear, item.category, ...item.tags]
    })));

    if (projectsSection) {
      projectsSection.querySelectorAll('.project-dynamic-card').forEach((card) => card.remove());
      const anchor = adminPanel?.nextElementSibling || projectsSection.querySelector('.projects-heading')?.nextElementSibling || null;
      projectItems.forEach((item, index) => {
        projectsSection.insertBefore(createProjectCard(item, index), anchor);
      });
      document.dispatchEvent(new CustomEvent('gatochente:projects-rendered'));
    }

    if (featuredGrid) {
      featuredGrid.querySelectorAll('.featured-dynamic-card').forEach((card) => card.remove());
      [...projectItems].slice(0, 2).reverse().forEach((item) => {
        featuredGrid.prepend(createFeaturedProject(item));
      });
    }

    document.body.classList.toggle('projects-admin-active', isAdmin);
  }

  async function loadProjects() {
    if (!client) {
      renderProjects();
      return;
    }
    const { data, error } = await client
      .from('project_posts')
      .select('id,title,category,summary,body,image_url,project_year,tags,created_at')
      .order('created_at', { ascending: false });

    if (error) {
      if (statusText) statusText.textContent = 'No se pudo cargar project_posts. Ejecuta supabase/projects-and-media.sql.';
      renderProjects();
      return;
    }

    projectItems = (data || []).map(normalizeProject);
    renderProjects();
  }

  async function uploadProjectImage(file) {
    if (!file || !client) return '';
    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const filePath = `projects/${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
    const { error } = await client.storage.from('gatochente-media').upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });
    if (error) throw error;
    const { data } = client.storage.from('gatochente-media').getPublicUrl(filePath);
    return data.publicUrl;
  }

  function resetProjectEditor() {
    if (!editorForm) return;
    editorForm.reset();
    selectedProjectImage = null;
    editorForm.querySelector('[data-project-id]').value = '';
    editorForm.hidden = true;
  }

  function openProjectEditor(item = null) {
    if (!editorForm || !isAdmin) return;
    editorForm.hidden = false;
    editorForm.querySelector('[data-project-id]').value = item?.id || '';
    editorForm.querySelector('[data-project-title]').value = item?.title || '';
    editorForm.querySelector('[data-project-category]').value = item?.category || '';
    editorForm.querySelector('[data-project-year]').value = item?.projectYear || '';
    editorForm.querySelector('[data-project-summary]').value = item?.summary || '';
    editorForm.querySelector('[data-project-body]').value = item?.body || '';
    editorForm.querySelector('[data-project-tags]').value = item?.tags?.join(', ') || '';
    editorForm.querySelector('[data-project-delete]').hidden = !item;
    editorForm.querySelector('[data-project-title]').focus();
  }

  function buildAdminPanel() {
    if (!projectsSection || adminPanel) return;
    adminPanel = document.createElement('div');
    adminPanel.className = 'project-admin-panel';
    adminPanel.hidden = true;
    adminPanel.innerHTML = `
      <div class="project-admin-head">
        <div>
          <span>GATOCHENTE Account</span>
          <strong>Editor de proyectos</strong>
        </div>
        <button type="button" class="news-submit" data-project-compose>Agregar proyecto</button>
      </div>
      <p class="project-admin-status" data-project-status></p>
      <form class="project-editor-form" data-project-form hidden>
        <input type="hidden" data-project-id>
        <label>Título<input type="text" data-project-title maxlength="90" required></label>
        <label>Categoría<input type="text" data-project-category maxlength="32" required></label>
        <label>Año / estado<input type="text" data-project-year maxlength="32" placeholder="2026 o En desarrollo"></label>
        <label class="wide">Resumen<input type="text" data-project-summary maxlength="220" required></label>
        <label class="wide">Detalle<textarea data-project-body maxlength="1200" required></textarea></label>
        <label class="wide">Tags<input type="text" data-project-tags placeholder="Windows, Arduino, Web"></label>
        <label class="wide news-file-label">Imagen<input type="file" data-project-image accept="image/png,image/jpeg,image/webp,image/gif"></label>
        <div class="news-editor-actions">
          <button type="button" class="news-delete" data-project-delete hidden>Eliminar</button>
          <button type="button" class="news-cancel" data-project-cancel>Cancelar</button>
          <button type="submit" class="news-submit">Guardar proyecto</button>
        </div>
      </form>
    `;
    projectsSection.insertBefore(adminPanel, projectsSection.querySelector('.projects-heading')?.nextElementSibling || null);
    statusText = adminPanel.querySelector('[data-project-status]');
    editorForm = adminPanel.querySelector('[data-project-form]');

    adminPanel.querySelector('[data-project-compose]')?.addEventListener('click', () => openProjectEditor());
    adminPanel.querySelector('[data-project-cancel]')?.addEventListener('click', resetProjectEditor);
    adminPanel.querySelector('[data-project-image]')?.addEventListener('change', (event) => {
      selectedProjectImage = event.currentTarget.files?.[0] || null;
    });
    adminPanel.querySelector('[data-project-delete]')?.addEventListener('click', async () => {
      const id = editorForm?.querySelector('[data-project-id]').value;
      if (!id || !client || !isAdmin) return;
      const { error } = await client.from('project_posts').delete().eq('id', id);
      if (error) {
        statusText.textContent = 'No se pudo eliminar el proyecto.';
        return;
      }
      statusText.textContent = 'Proyecto eliminado.';
      resetProjectEditor();
      await loadProjects();
    });

    editorForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!client || !isAdmin) return;
      const id = editorForm.querySelector('[data-project-id]').value;
      const existing = projectItems.find((item) => item.id === id);
      let imageUrl = existing?.imageUrl || '';
      try {
        if (selectedProjectImage) {
          statusText.textContent = 'Subiendo imagen...';
          imageUrl = await uploadProjectImage(selectedProjectImage);
        }
      } catch {
        statusText.textContent = 'No se pudo subir la imagen.';
        return;
      }

      const tags = editorForm.querySelector('[data-project-tags]').value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 8);
      const payload = {
        title: editorForm.querySelector('[data-project-title]').value.trim(),
        category: editorForm.querySelector('[data-project-category]').value.trim(),
        project_year: editorForm.querySelector('[data-project-year]').value.trim() || 'En desarrollo',
        summary: editorForm.querySelector('[data-project-summary]').value.trim(),
        body: editorForm.querySelector('[data-project-body]').value.trim(),
        image_url: imageUrl || null,
        tags
      };
      const request = id
        ? client.from('project_posts').update(payload).eq('id', id)
        : client.from('project_posts').insert(payload);
      const { error } = await request;
      if (error) {
        statusText.textContent = 'Supabase rechazó el proyecto. Revisa RLS o la tabla project_posts.';
        return;
      }
      statusText.textContent = 'Proyecto guardado.';
      resetProjectEditor();
      await loadProjects();
    });
  }

  buildAdminPanel();

  projectsSection?.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-project-edit]') : null;
    if (!button || !isAdmin) return;
    event.preventDefault();
    event.stopPropagation();
    openProjectEditor(projectItems.find((item) => item.id === button.dataset.projectEdit));
  });

  subscribeGatochenteAccount(({ isAdmin: nextIsAdmin }) => {
    isAdmin = Boolean(nextIsAdmin);
    if (adminPanel) adminPanel.hidden = !isAdmin;
    document.body.classList.toggle('projects-admin-active', isAdmin);
  });

  loadProjects();
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

  document.addEventListener('click', (event) => {
    const badge = event.target instanceof Element ? event.target.closest('.verification-badge') : null;
    if (!badge) return;

    event.preventDefault();
    event.stopPropagation();
    openModal();
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

function initNews() {
  const homeGrid = document.getElementById('home-news-grid');
  const newsGrid = document.getElementById('news-grid');
  const adminToggle = document.getElementById('news-admin-toggle');
  const adminPanel = document.getElementById('news-admin-panel');
  const loginForm = document.getElementById('news-login-form');
  const editorForm = document.getElementById('news-editor-form');
  const emailInput = document.getElementById('news-email-input');
  const passwordInput = document.getElementById('news-password-input');
  const authStatus = document.getElementById('news-auth-status');
  const idInput = document.getElementById('news-id');
  const titleInput = document.getElementById('news-title-input');
  const categoryInput = document.getElementById('news-category-input');
  const summaryInput = document.getElementById('news-summary-input');
  const bodyInput = document.getElementById('news-body-input');
  const imageInput = document.getElementById('news-image-input');
  const imagePreview = document.getElementById('news-image-preview');
  const imageDropzone = document.getElementById('news-dropzone');
  const cancelButton = document.getElementById('news-cancel-button');
  const deleteButton = document.getElementById('news-delete-button');
  const logoutButton = document.getElementById('news-logout-button');
  const passkeyLoginButton = document.getElementById('news-passkey-login-button');
  const registerPasskeyButton = document.getElementById('news-register-passkey-button');
  const accountPanel = document.getElementById('news-account-panel');
  const composeButton = document.getElementById('news-compose-button');
  const openAccountButton = document.getElementById('news-open-account-button');

  if (!homeGrid && !newsGrid) return;

  const defaultNews = [
    {
      id: 'catpack-beta',
      title: 'CatPack Beta ya tiene página propia',
      category: 'CatPack',
      imageUrl: '',
      summary: 'El proyecto CatPack suma una presentación más clara, versiones y una experiencia visual conectada con el portafolio.',
      body: 'CatPack sigue creciendo como archivador moderno para Windows. La página ahora muestra mejor el estado del proyecto, las versiones y lo que viene después.',
      publishedAt: '2026-08-23T12:00:00Z'
    },
    {
      id: 'web-limpia',
      title: 'La web estrena noticiero',
      category: 'Web',
      imageUrl: '',
      summary: 'GATOCHENTE ahora tiene un espacio para publicar novedades, cambios importantes y mini entradas tipo blog.',
      body: 'Este noticiero nace para ordenar las actualizaciones del sitio, mostrar avances y dejar registro de las ideas nuevas.',
      publishedAt: '2026-08-23T11:00:00Z'
    },
    {
      id: 'fishingcat-navbar',
      title: 'FishingCat vive dentro del logo',
      category: 'Juego',
      imageUrl: '',
      summary: 'El botón del logo une buscador, temas y una demostración compacta de FishingCat en la navbar.',
      body: 'El panel del logo mantiene la identidad del sitio y deja jugar una versión pequeña de FishingCat sin salir de la página.',
      publishedAt: '2026-08-22T16:00:00Z'
    }
  ];

  const scriptElement = document.querySelector('script[src*="script.js"]');
  const assetBase = scriptElement ? scriptElement.src : window.location.href;
  const avatarUrl = new URL('img/gatochente.jpg', assetBase).href;
  const checkBadgeUrl = new URL('img/check.PNG', assetBase).href;
  const config = window.GATOCHENTE_SUPABASE || {};
  const supabaseClient = getGatochenteSupabaseClient();
  const hasSupabaseConfig = Boolean(supabaseClient);
  const passkeysEnabled = Boolean(config.enablePasskeys);
  const canUsePasskeys = Boolean(
    passkeysEnabled &&
    supabaseClient?.auth?.signInWithPasskey &&
    supabaseClient?.auth?.registerPasskey &&
    window.PublicKeyCredential
  );

  let newsItems = [...defaultNews];
  let adminUnlocked = false;
  let hasWelcomedSession = false;

  function setStatus(message) {
    if (authStatus) authStatus.textContent = message || '';
  }

  function getPasskeyUnavailableMessage() {
    if (!supabaseClient) return 'Configura supabase-config.js para activar Supabase.';
    if (!passkeysEnabled) return 'Activa enablePasskeys en supabase-config.js.';
    if (!window.PublicKeyCredential) return 'Este navegador no soporta passkeys/WebAuthn en esta página.';
    return 'El SDK de Supabase cargado no tiene soporte de passkeys. Revisa cache y versión del CDN.';
  }

  function getPasskeyErrorMessage(error, action = 'usar') {
    const code = error?.code || error?.status || '';
    const message = String(error?.message || '').toLowerCase();
    if (code === 'passkey_disabled' || (message.includes('passkey') && message.includes('disabled'))) {
      return 'Supabase aún dice que Passkeys está apagado para este proyecto.';
    }
    if (code === 'webauthn_credential_not_found') {
      return 'No existe una passkey registrada para esta cuenta. Entra con contraseña y crea una primero.';
    }
    if (code === 'webauthn_credential_exists') {
      return 'Esta passkey ya esta registrada para tu cuenta.';
    }
    if (code === 'email_not_confirmed') {
      return 'Tu email debe estar confirmado antes de usar passkey.';
    }
    if (message.includes('origin') || message.includes('rp id') || message.includes('relying party')) {
      return 'El dominio WebAuthn no coincide. Revisa RP ID gatochente.com y origins https://www.gatochente.com, https://gatochente.com.';
    }
    if (message.includes('cancel') || message.includes('notallowed')) {
      return 'La passkey se cancelo o el navegador no permitio abrirla.';
    }
    return `No se pudo ${action} la passkey. Revisa Supabase Passkeys y el dominio de la web.`;
  }

  function normalizePost(post) {
    const publishedAt = post.published_at || post.publishedAt || post.date || new Date().toISOString();
    return {
      id: post.id,
      title: post.title,
      category: post.category,
      summary: post.summary,
      body: post.body,
      imageUrl: post.image_url || post.imageUrl || '',
      publishedAt,
      date: publishedAt.slice(0, 10)
    };
  }

  function setAdminUnlocked(value, options = {}) {
    adminUnlocked = value;
    document.body.classList.toggle('news-admin-active', value);
    if (editorForm) editorForm.hidden = true;
    if (loginForm) loginForm.hidden = value;
    if (accountPanel) accountPanel.hidden = !value;
    if (accountPanel) accountPanel.classList.toggle('is-welcoming', Boolean(value && options.welcome));
    if (registerPasskeyButton) registerPasskeyButton.hidden = !value || !canUsePasskeys;
    if (!value && authStatus) authStatus.textContent = 'Usa el botón de cuenta del navbar para iniciar sesión.';
    renderNews();
  }

  function getNewsTimestamp(item) {
    const time = Date.parse(item.publishedAt || item.date || '');
    return Number.isNaN(time) ? 0 : time;
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function escapeHtml(value) {
    return (value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  function getSortedNews() {
    const seen = new Set();
    return [...newsItems]
      .filter((item) => {
        const signature = [item.title, item.category, item.summary, item.body, item.imageUrl].join('|').toLowerCase();
        if (seen.has(signature)) return false;
        seen.add(signature);
        return true;
      })
      .sort((a, b) => getNewsTimestamp(b) - getNewsTimestamp(a));
  }

  function createNewsCard(item, compact = false, isNewest = false) {
    const article = document.createElement('article');
    article.className = isNewest ? 'news-card news-card-newest' : 'news-card';
    article.innerHTML = `
      ${isNewest ? '<span class="news-newest-label">Nuevo</span>' : ''}
      <div class="news-card-head">
        <span class="news-category">${escapeHtml(item.category)}</span>
        <time class="news-date" datetime="${escapeHtml(item.publishedAt || item.date)}">${escapeHtml(formatDateTime(item.publishedAt || item.date))}</time>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      ${item.imageUrl ? `<img class="news-card-image" src="${escapeHtml(item.imageUrl)}" alt="">` : ''}
      <p>${escapeHtml(compact ? item.summary : item.body || item.summary)}</p>
      <div class="news-author-row">
        <div class="user-chip user-chip-compact" data-user="gatochente">
          <img class="user-avatar" src="${avatarUrl}" alt="Foto de perfil de GATOCHENTE">
          <span class="user-handle">@gatochente</span>
          <button type="button" class="verification-badge" data-tooltip="Verificado" aria-label="Verificado: ver términos de la insignia">
            <img src="${checkBadgeUrl}" alt="Verificado">
          </button>
        </div>
        <button type="button" class="news-edit-button" data-news-edit="${escapeHtml(item.id)}" aria-label="Editar noticia">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
          </svg>
        </button>
      </div>
    `;
    return article;
  }

  function renderInto(container, items, compact = false) {
    if (!container) return;
    container.innerHTML = '';
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'news-empty';
      empty.textContent = 'Todavía no hay noticias publicadas.';
      container.appendChild(empty);
      return;
    }
    items.forEach((item, index) => container.appendChild(createNewsCard(item, compact, index === 0)));
  }

  function renderNews() {
    const sorted = getSortedNews();
    replaceDynamicSearchItems('news', sorted.map((item) => ({
      title: item.title,
      eyebrow: item.category,
      description: item.summary,
      url: '/noticias',
      keywords: [item.category, item.body, item.date]
    })));
    renderInto(homeGrid, sorted.slice(0, 3), true);
    renderInto(newsGrid, sorted, false);
    document.body.classList.toggle('news-admin-active', adminUnlocked);
  }

  async function loadNews() {
    if (!supabaseClient) {
      newsItems = [...defaultNews];
      renderNews();
      return;
    }

    const { data, error } = await supabaseClient
      .from('news_posts')
      .select('id,title,category,summary,body,image_url,published_at')
      .order('published_at', { ascending: false });

    if (error) {
      newsItems = [...defaultNews];
      setStatus('No se pudo cargar Supabase. Mostrando noticias locales.');
      renderNews();
      return;
    }

    newsItems = (data || []).map(normalizePost);
    renderNews();
  }

  async function refreshSession() {
    if (!supabaseClient) {
      setAdminUnlocked(false);
      return;
    }
    const { data } = await supabaseClient.auth.getSession();
    setAdminUnlocked(await checkGatochenteAdminSession(data.session));
  }

  function resetEditor() {
    if (!editorForm) return;
    idInput.value = '';
    titleInput.value = '';
    categoryInput.value = '';
    summaryInput.value = '';
    bodyInput.value = '';
    if (imageInput) imageInput.value = '';
    if (imagePreview) {
      imagePreview.hidden = true;
      imagePreview.innerHTML = '';
    }
    if (deleteButton) deleteButton.hidden = true;
    editorForm.hidden = true;
  }

  function openComposer() {
    if (!editorForm || !adminUnlocked) return;
    editorForm.hidden = false;
    if (!idInput.value && deleteButton) deleteButton.hidden = true;
    titleInput.focus();
  }

  function editNews(id) {
    const item = newsItems.find((news) => news.id === id);
    if (!item || !editorForm) return;
    idInput.value = item.id;
    titleInput.value = item.title;
    categoryInput.value = item.category;
    summaryInput.value = item.summary;
    bodyInput.value = item.body || item.summary;
    if (imageInput) imageInput.value = '';
    if (imagePreview) {
      imagePreview.hidden = !item.imageUrl;
      imagePreview.innerHTML = item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt=""><span>Imagen actual</span>` : '';
    }
    if (deleteButton) deleteButton.hidden = false;
    adminPanel?.classList.add('is-open');
    adminPanel?.setAttribute('aria-hidden', 'false');
    adminToggle?.setAttribute('aria-expanded', 'true');
    openComposer();
  }

  adminToggle?.addEventListener('click', () => {
    const isOpen = adminPanel.classList.toggle('is-open');
    adminPanel.setAttribute('aria-hidden', String(!isOpen));
    adminToggle.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) (adminUnlocked ? titleInput : openAccountButton)?.focus();
  });

  if (passkeyLoginButton) {
    passkeyLoginButton.hidden = !canUsePasskeys;
  }

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!emailInput || !passwordInput) return;
    const globalClient = gatochenteAccount.client || supabaseClient;
    if (globalClient) {
      setStatus('También puedes entrar desde el botón de cuenta del navbar.');
    }
    if (!supabaseClient) {
      setStatus('Configura supabase-config.js para activar el login seguro.');
      return;
    }

    const submitButton = loginForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    setStatus('Entrando...');
    try {
      const { error } = await withTimeout(
        supabaseClient.auth.signInWithPassword({
          email: emailInput.value.trim(),
          password: passwordInput.value
        }),
        15000,
        'Supabase no respondió al iniciar sesión.'
      );

      if (error) {
        passwordInput.value = '';
        passwordInput.focus();
        setStatus('No se pudo iniciar sesión. Revisa email y contraseña.');
        return;
      }

      const { data } = await withTimeout(supabaseClient.auth.getSession(), 10000, 'No se pudo recuperar la sesión.');
      if (!(await checkGatochenteAdminSession(data.session))) {
        await supabaseClient.auth.signOut();
        setStatus('Esta cuenta no tiene permisos para editar noticias.');
        setAdminUnlocked(false);
        return;
      }

      passwordInput.value = '';
      setStatus('Sesión iniciada.');
      hasWelcomedSession = true;
      updateGatochenteAccount({ client: supabaseClient, session: data.session, isAdmin: true });
      setAdminUnlocked(true, { welcome: true });
      resetEditor();
    } catch (error) {
      console.error('News login failed:', error);
      setStatus(error.message || 'No se pudo iniciar sesión.');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  openAccountButton?.addEventListener('click', () => {
    document.querySelector('.account-nav-button')?.click();
  });

  passkeyLoginButton?.addEventListener('click', async () => {
    if (!supabaseClient || !canUsePasskeys) {
      setStatus(getPasskeyUnavailableMessage());
      return;
    }

    setStatus('Abriendo passkey...');
    const { error } = await supabaseClient.auth.signInWithPasskey();
    if (error) {
      console.error('Passkey sign-in error:', error);
      setStatus(getPasskeyErrorMessage(error, 'entrar con'));
      return;
    }

    const { data } = await supabaseClient.auth.getSession();
    if (!(await checkGatochenteAdminSession(data.session))) {
      await supabaseClient.auth.signOut();
      setStatus('Esta passkey no pertenece al admin.');
      setAdminUnlocked(false);
      return;
    }

    setStatus('Sesión iniciada con passkey.');
    hasWelcomedSession = true;
    updateGatochenteAccount({ client: supabaseClient, session: data.session, isAdmin: true });
    setAdminUnlocked(true, { welcome: true });
    resetEditor();
  });

  registerPasskeyButton?.addEventListener('click', async () => {
    if (!supabaseClient || !canUsePasskeys || !adminUnlocked) {
      setStatus(!adminUnlocked ? 'Primero entra con tu cuenta admin.' : getPasskeyUnavailableMessage());
      return;
    }

    setStatus('Creando passkey...');
    const { error } = await supabaseClient.auth.registerPasskey();
    if (error) {
      console.error('Passkey registration error:', error);
      setStatus(getPasskeyErrorMessage(error, 'crear'));
      return;
    }
    setStatus('Passkey creada para esta cuenta.');
  });

  async function uploadNewsImage(file) {
    if (!file || !supabaseClient) return '';
    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const filePath = `news/${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
    const { error } = await supabaseClient.storage
      .from('gatochente-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    if (error) throw error;
    const { data } = supabaseClient.storage.from('gatochente-media').getPublicUrl(filePath);
    return data.publicUrl;
  }

  imageInput?.addEventListener('change', () => {
    const file = imageInput.files?.[0];
    if (!imagePreview) return;
    if (!file) {
      imagePreview.hidden = true;
      imagePreview.innerHTML = '';
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    imagePreview.hidden = false;
    imagePreview.innerHTML = `<img src="${previewUrl}" alt=""><span>${escapeHtml(file.name)}</span>`;
  });

  function setImageFile(file) {
    if (!imageInput || !file) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    imageInput.files = transfer.files;
    imageInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  imageDropzone?.addEventListener('click', () => imageInput?.click());

  imageDropzone?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    imageInput?.click();
  });

  imageDropzone?.addEventListener('dragover', (event) => {
    event.preventDefault();
    imageDropzone.classList.add('is-dragging');
  });

  imageDropzone?.addEventListener('dragleave', () => {
    imageDropzone.classList.remove('is-dragging');
  });

  imageDropzone?.addEventListener('drop', (event) => {
    event.preventDefault();
    imageDropzone.classList.remove('is-dragging');
    const file = event.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      setStatus('Solo puedes adjuntar imágenes.');
      return;
    }
    setImageFile(file);
  });

  editorForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!supabaseClient || !adminUnlocked) return;

    let imageUrl = idInput.value
      ? newsItems.find((item) => item.id === idInput.value)?.imageUrl || ''
      : '';

    try {
      const selectedImage = imageInput?.files?.[0];
      if (selectedImage) {
        setStatus('Subiendo imagen...');
        imageUrl = await uploadNewsImage(selectedImage);
      }
    } catch {
      setStatus('No se pudo subir la imagen.');
      return;
    }

    const payload = {
      title: titleInput.value.trim(),
      category: categoryInput.value.trim(),
      summary: summaryInput.value.trim(),
      body: bodyInput.value.trim(),
      image_url: imageUrl || null,
      published_at: idInput.value
        ? newsItems.find((item) => item.id === idInput.value)?.publishedAt || new Date().toISOString()
        : new Date().toISOString()
    };

    const request = idInput.value
      ? supabaseClient.from('news_posts').update(payload).eq('id', idInput.value)
      : supabaseClient.from('news_posts').insert(payload);

    const { error } = await request;
    if (error) {
      setStatus('Supabase rechazó el cambio. Revisa que tu email sea el admin en RLS.');
      return;
    }

    setStatus('Noticia guardada.');
    resetEditor();
    await loadNews();
  });

  cancelButton?.addEventListener('click', resetEditor);

  composeButton?.addEventListener('click', () => {
    idInput.value = '';
    titleInput.value = '';
    categoryInput.value = '';
    summaryInput.value = '';
    bodyInput.value = '';
    if (imageInput) imageInput.value = '';
    if (imagePreview) {
      imagePreview.hidden = true;
      imagePreview.innerHTML = '';
    }
    if (deleteButton) deleteButton.hidden = true;
    openComposer();
  });

  logoutButton?.addEventListener('click', async () => {
    if (supabaseClient) await supabaseClient.auth.signOut();
    setStatus('Sesión cerrada.');
    updateGatochenteAccount({ client: supabaseClient, session: null, isAdmin: false });
    setAdminUnlocked(false);
    resetEditor();
  });

  deleteButton?.addEventListener('click', async () => {
    if (!idInput.value || !supabaseClient || !adminUnlocked) return;
    const { error } = await supabaseClient.from('news_posts').delete().eq('id', idInput.value);
    if (error) {
      setStatus('No se pudo eliminar la noticia.');
      return;
    }
    setStatus('Noticia eliminada.');
    resetEditor();
    await loadNews();
  });

  newsGrid?.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-news-edit]') : null;
    if (!button || !adminUnlocked) return;
    editNews(button.dataset.newsEdit);
  });

  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      const isAdmin = await checkGatochenteAdminSession(session);
      updateGatochenteAccount({ client: supabaseClient, session, isAdmin });
      const shouldWelcome = isAdmin && event === 'SIGNED_IN' && !hasWelcomedSession;
      setAdminUnlocked(isAdmin, { welcome: shouldWelcome });
      if (shouldWelcome) hasWelcomedSession = true;
    });
  } else {
    setStatus('Backend pendiente: completa supabase-config.js.');
  }

  renderNews();
  loadNews();
  refreshSession();
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
  const bannerUrl = new URL('img/banner.jpg', assetBase).href;
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
      <div class="profile-cover" aria-hidden="true">
        <img src="${bannerUrl}" alt="">
      </div>
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
        Estudiante creador de proyectos con tecnología, programación, Arduino, Raspberry Pi y diseño web. Aquí se conectan mis prototipos, ideas escolares y futuras experiencias sociales.
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

  function prepareChip(chip) {
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('aria-label', 'Abrir perfil completo de GATOCHENTE');
  }

  chips.forEach(prepareChip);

  document.addEventListener('click', (event) => {
    const chip = event.target instanceof Element ? event.target.closest('.user-chip[data-user="gatochente"]') : null;
    if (!chip || (event.target instanceof Element && event.target.closest('.verification-badge'))) return;

    prepareChip(chip);
    openProfileModal();
  });

  document.addEventListener('keydown', (event) => {
    const chip = event.target instanceof Element ? event.target.closest('.user-chip[data-user="gatochente"]') : null;
    if (!chip || (event.target instanceof Element && event.target.closest('.verification-badge'))) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    prepareChip(chip);
    openProfileModal();
  });

  closeButton.addEventListener('click', closeProfileModal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeProfileModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      if (document.querySelector('.verification-modal.is-open')) return;
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
    if (navCenter.scrollWidth > navCenter.clientWidth + 1) return;

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
  renderRouteTab();
  updateObservedRoute();
  refreshSelector();
  hidePageLoader();
});

window.addEventListener('hashchange', () => {
  observedRouteHash = '';
  renderRouteTab();
});

window.addEventListener('scroll', scheduleObservedRouteUpdate, { passive: true });

window.addEventListener('resize', () => {
  scheduleObservedRouteUpdate();
  refreshSelector();
  if (navbar && navbar.classList.contains('search-open')) {
    renderSearchPanel(searchInput ? searchInput.value.trim() : '');
  }
});

if (searchInput) {
  searchInput.addEventListener('input', () => {
    const value = searchInput.value.trim();
    searchShowAllResults = false;
    renderSearchPanel(value);
    if (!value) {
      clearHighlight();
      return;
    }
    highlightText(value);
  });

  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (navbar && navbar.classList.contains('game-menu-open') && searchInput.value.trim()) {
        searchInput.value = '';
        renderSearchPanel('');
        clearHighlight();
        event.preventDefault();
        return;
      }
      closeSearch();
      return;
    }
    if (event.key === 'Enter') {
      const value = searchInput.value.trim();
      if (!value) return;
      saveSearchHistory(value);
      const firstResult = currentSearchResults[0] || getSearchResults(value)[0];
      if (firstResult) {
        event.preventDefault();
        navigateToSearchResult(firstResult.url);
      }
    }
  });
}

if (searchClear && searchInput) {
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchShowAllResults = false;
    renderSearchPanel('');
    clearHighlight();
    searchInput.focus();
  });
}

if (searchToggle) {
  searchToggle.addEventListener('click', () => {
    openSearch();
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

function initAsciiNegativeHero() {
  const canvas = document.getElementById('hero-ascii-canvas');
  if (!canvas) return;

  const rawLogoPattern = [
    "              @$@$$$                              @@@@$@",
    "             $$$$$$$$@@                        @$$$$$$$@@",
    "             $@$$$$$$$$$@B @$@@@$@$@$$@@$$B $@@@@$$$$$$@@",
    "             $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$@$$$",
    "             $$$$$$$$$$$$$$$$$@$$$$$$$$$$$$$$$$$$$$$$$$$@",
    "              $$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$@",
    "              @$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$@",
    "              $@$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$@",
    "             @@$$$$$$$@$   $$$$$$$$$$$$$$@@   $$$$$$$$$$$",
    "            $@$$$$$$$$       $$$$$$$$$$$$       $$$$$$$$$$",
    "            @$$$$$$$$@       $$$$$$$$$$$$       $$$$$$$$$$",
    "            @$$$$$$$$$@    $@$$$$$$$$$$$$@@    @$$$$$$$$$$",
    "            @@$$$$$$$$$$$$$$$@$@      @$$$$$$$$$$$$$$$$$$$",
    "            $$@$$$$$$$$$$$$$$$$@      $$$$$$$$$$$$$$$$$$$$",
    "             @@$$$$$$$$$$$$$$$$$@$  @$$$$$$$$$$$$$$$$$$@$",
    "              @$$$$$$$$$$$$$$$$@$@  $$@$$$$$$$$$$$$$$$$@",
    "               $@$$$$$$$$$$$@$    @@    @$$$$$$$$$$$$$$",
    "                 @@$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$@",
    "                   $@$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$",
    "                     d@$$$$$$$$$$$$$$$$$$$$$$$$@$",
    "                         @@@$$$$$$$$$$$$$$$$$"
  ];
  const logoIndent = Math.min(
    ...rawLogoPattern
      .filter((line) => line.trim())
      .map((line) => line.match(/^\s*/)[0].length)
  );
  const logoPattern = rawLogoPattern.map((line) => line.slice(logoIndent).trimEnd());

  const waveChars = ['#', '|', '/', '-', '\\'];
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let metrics = null;
  let frame = 0;
  let timer = null;

  function getMetrics() {
    const styles = window.getComputedStyle(canvas);
    const fontSize = parseFloat(styles.fontSize) || 12;
    const charWidth = fontSize * 0.62;
    const charHeight = fontSize;
    const cols = Math.ceil(window.innerWidth / charWidth) + 2;
    const rows = Math.ceil(window.innerHeight / charHeight) + 2;
    const logoWidth = Math.max(...logoPattern.map((line) => line.length));
    const logoHeight = logoPattern.length;
    const scale = Math.max(1, Math.floor(Math.min(cols * 0.68 / logoWidth, rows * 0.58 / logoHeight)));
    const logoHorizontalOffset = Math.max(0, Math.round(cols * 0.012));
    const mobileLogoOffset = window.innerWidth <= 600 ? 0.5 : 0;
    const startCol = Math.floor((cols - logoWidth * scale) / 2) + logoHorizontalOffset - 1 + mobileLogoOffset;
    const logoCenterRow = rows * 0.4;
    const startRow = Math.floor(logoCenterRow - (logoHeight * scale) / 2);

    return { cols, rows, logoWidth, logoHeight, scale, startCol, startRow };
  }

  function isLogoCell(col, row) {
    const localCol = Math.floor((col - metrics.startCol) / metrics.scale);
    const localRow = Math.floor((row - metrics.startRow) / metrics.scale);
    if (localRow < 0 || localRow >= metrics.logoHeight || localCol < 0 || localCol >= metrics.logoWidth) return false;
    return (logoPattern[localRow][localCol] || ' ') !== ' ';
  }

  function getWaveChar(col, row) {
    const wave = Math.sin((col * 0.23) + (row * 0.42) + (frame * 0.48));
    const ripple = Math.cos((col * 0.08) - (row * 0.18) + (frame * 0.34));
    const index = Math.abs(Math.floor(((wave + ripple + 2) / 4) * waveChars.length + frame + row)) % waveChars.length;
    return waveChars[index];
  }

  function render() {
    if (!metrics) metrics = getMetrics();
    const rows = [];

    for (let row = 0; row < metrics.rows; row += 1) {
      let line = '';
      for (let col = 0; col < metrics.cols; col += 1) {
        line += isLogoCell(col, row) ? ' ' : getWaveChar(col, row);
      }
      rows.push(line);
    }

    canvas.textContent = rows.join('\n');
    frame += 1;
  }

  function restart() {
    metrics = getMetrics();
    render();
  }

  restart();
  window.addEventListener('resize', restart);

  if (!reducedMotion) {
    timer = window.setInterval(render, 95);
    window.addEventListener('beforeunload', () => window.clearInterval(timer));
  }
}

initAsciiNegativeHero();
initContactForm();
initProtectedEmailButtons();
initDonationModal();
initProjectCards();
initGatochenteAccount();
initProjectPosts();
initNews();
initProfileChips();
initVerificationBadges();
initNavFishingCat();
initMiniGame();
