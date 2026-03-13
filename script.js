const year = document.getElementById("year");
if (year) year.textContent = "© " + new Date().getFullYear() + " GATOCHENTE";

const navItems = [...document.querySelectorAll('.nav-item')];
const selector = document.querySelector('.pill-selector');
const search = document.getElementById('search');

function getCurrentPage() {
  const p = window.location.pathname.split('/').pop();
  if (!p || p === 'index.html') return 'index.html';
  if (!p.includes('.html')) return p + '.html';
  return p;
}

function updateActiveNav() {
  const current = getCurrentPage();
  navItems.forEach((item) => {
    item.classList.remove('active');
    const href = item.getAttribute('href');
    if (!href) return;
    let target;
    try {
      target = new URL(href, window.location.href).pathname.split('/').pop();
    } catch (e) {
      target = href.split('/').pop();
    }
    if (!target || target === '') target = 'index.html';
    if (!target.includes('.html')) target += '.html';
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
  document.querySelectorAll('.search-highlight').forEach((el) => {
    const text = document.createTextNode(el.textContent);
    el.replaceWith(text);
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

if (search) {
  search.addEventListener('input', () => {
    const value = search.value.trim();
    if (!value) {
      clearHighlight();
      return;
    }
    highlightText(value);
  });

  search.addEventListener('blur', () => {
    clearHighlight();
    search.value = '';
  });
}
