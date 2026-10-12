/**
 * VELOCITY MOTORS - Public site interactions and dynamic content.
 */

const publicState = { settings: null, services: [], serviceBySlug: new Map(), reviews: [] };

document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  initModals();
  initSearch();
  initContactForm();
  initDynamicContent();
  if (window.BookingWizard) window.BookingWizard.init();
  if (window.ServiceTracker) window.ServiceTracker.init();
  if (window.ServiceCalculator) window.ServiceCalculator.init();
});

async function initDynamicContent() {
  try {
    const content = await RideCareApi.getPublicContent();
    publicState.settings = content.settings;
    publicState.services = content.services;
    publicState.serviceBySlug = new Map(content.services.map(service => [service.slug, service]));
    publicState.reviews = content.reviews;
    renderSettings(content.settings);
    renderServices(content.services);
    renderReviews(content.reviews);
    renderPublicStats(content.settings?.publicStats);
    document.dispatchEvent(new CustomEvent('ridecare:content-ready', { detail: content }));
  } catch (error) {
    console.warn('Unable to load live site content:', error.message);
    showToast('Live workshop content is temporarily unavailable. Please refresh shortly.', 'error');
  }
}

function initNavbar() {
  const header = document.querySelector('.site-header');
  const mobileToggle = document.getElementById('mobileNavToggle');
  const navMenu = document.getElementById('navMenu');
  const hamburgerSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
  const closeSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  mobileToggle?.addEventListener('click', () => {
    navMenu?.classList.toggle('open');
    mobileToggle.innerHTML = navMenu?.classList.contains('open') ? closeSvg : hamburgerSvg;
  });
  document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => {
    navMenu?.classList.remove('open');
    if (mobileToggle) mobileToggle.innerHTML = hamburgerSvg;
  }));
}

function initModals() {
  document.querySelectorAll('[data-open-modal]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    openModal(button.dataset.openModal);
  }));
  document.querySelectorAll('.modal-close-btn, [data-close-modal]').forEach(button => button.addEventListener('click', closeAllModals));
  document.querySelectorAll('.modal-backdrop').forEach(modal => modal.addEventListener('click', event => {
    if (event.target === modal) closeAllModals();
  }));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeAllModals(); });
}

function openModal(id) {
  closeAllModals();
  const navMenu = document.getElementById('navMenu');
  const mobileToggle = document.getElementById('mobileNavToggle');
  const hamburgerSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
  navMenu?.classList.remove('open');
  if (mobileToggle) mobileToggle.innerHTML = hamburgerSvg;
  const modal = document.getElementById(id);
  if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
function closeAllModals() { document.querySelectorAll('.modal-backdrop').forEach(modal => modal.classList.remove('active')); document.body.style.overflow = ''; }
window.openModal = openModal;
window.closeAllModals = closeAllModals;

function renderSettings(settings) {
  if (!settings) return;
  document.querySelectorAll('[data-setting="businessName"]').forEach(element => { element.textContent = settings.businessName; });
  document.querySelectorAll('[data-setting="heroLead"]').forEach(element => { element.textContent = settings.heroLead; });
  document.querySelectorAll('[data-setting="phone"]').forEach(element => { element.textContent = settings.phone; });
  document.querySelectorAll('[data-setting="email"]').forEach(element => { element.textContent = settings.email; });
  document.querySelectorAll('[data-setting="address"]').forEach(element => { element.textContent = settings.address; });
  document.querySelectorAll('[data-setting="weekdayHours"]').forEach(element => { element.textContent = settings.weekdayHours; });
  document.querySelectorAll('[data-setting="weekendHours"]').forEach(element => { element.textContent = settings.weekendHours; });
  document.querySelectorAll('[data-setting="emergencyHours"]').forEach(element => { element.textContent = settings.emergencyHours; });
  document.querySelectorAll('[data-setting-link="mapUrl"]').forEach(element => { element.href = settings.mapUrl || '#'; });
}

function getServiceSvgIcon(service) {
  const slug = (service.slug || '').toLowerCase();
  const icon = service.icon || '';
  if (slug === 'general' || icon.includes('🛠') || icon.includes('🔧')) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>';
  }
  if (slug === 'engine' || icon.includes('⚙')) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
  }
  if (slug === 'brake' || icon.includes('🛑')) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>';
  }
  if (slug === 'oil' || icon.includes('🛢')) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>';
  }
  if (slug === 'tyre' || icon.includes('🛞')) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="2" x2="12" y2="7"></line><line x1="12" y1="17" x2="12" y2="22"></line><line x1="2" y1="12" x2="7" y2="12"></line><line x1="17" y1="12" x2="22" y2="12"></line></svg>';
  }
  if (slug === 'battery' || icon.includes('🔋')) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="18" height="12" rx="2" ry="2"></rect><line x1="23" y1="10" x2="23" y2="14"></line><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="13" y1="12" x2="15" y2="12"></line></svg>';
  }
  if (slug === 'electrical' || icon.includes('⚡')) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>';
  }
  if (slug === 'custom' || icon.includes('✨')) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
  }
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>';
}

function renderServices(services) {
  const grid = document.getElementById('servicesGrid');
  const footerList = document.getElementById('footerServicesList');
  if (grid) {
    grid.replaceChildren();
    services.forEach(service => {
      const card = RideCareApi.createElement('article', 'service-card');
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      const open = () => window.openServiceModal(service.slug);
      card.addEventListener('click', open);
      card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
      const imageWrap = RideCareApi.createElement('div', 'service-card-image-wrap');
      const image = document.createElement('img'); image.src = service.imageUrl; image.alt = service.altText; image.className = 'service-card-bg-image'; image.loading = 'lazy';
      imageWrap.append(image, RideCareApi.createElement('div', 'service-card-overlay'));
      const badge = RideCareApi.createElement('div', 'service-card-badge');
      badge.innerHTML = getServiceSvgIcon(service);
      imageWrap.append(badge);
      const body = RideCareApi.createElement('div', 'service-card-content');
      body.append(RideCareApi.createElement('h3', 'service-card-title', service.title), RideCareApi.createElement('p', 'service-card-desc', service.shortDescription));
      const footer = RideCareApi.createElement('div', 'service-card-footer');
      footer.append(RideCareApi.createElement('span', 'service-price-tag', `From \u20b9${Number(service.basePrice).toLocaleString('en-IN')}`), RideCareApi.createElement('span', 'service-action-link', 'Explore \u2192'));
      body.append(footer); card.append(imageWrap, body); grid.append(card);
    });
  }
  if (footerList) {
    footerList.replaceChildren();
    services.forEach(service => {
      const item = document.createElement('li'); const link = document.createElement('a'); link.href = '#services'; link.textContent = service.title;
      link.addEventListener('click', event => { event.preventDefault(); window.openServiceModal(service.slug); }); item.append(link); footerList.append(item);
    });
  }
}

window.openServiceModal = function openServiceModal(slug) {
  const service = publicState.serviceBySlug.get(slug);
  const title = document.getElementById('serviceModalTitle');
  const body = document.getElementById('serviceModalBody');
  if (!service || !title || !body) return;
  title.textContent = service.detailTitle;
  body.replaceChildren();
  const details = RideCareApi.createElement('div', 'service-detail-meta');
  [['Price Estimate', `Starting at \u20b9${Number(service.basePrice).toLocaleString('en-IN')}`], ['Est. Time', service.duration], ['Frequency', service.intervalText]].forEach(([label, value]) => {
    const cell = document.createElement('div'); cell.append(RideCareApi.createElement('span', 'service-meta-label', label), RideCareApi.createElement('div', 'service-meta-value', value)); details.append(cell);
  });
  const heading = RideCareApi.createElement('h4', 'service-inclusion-title', 'What is included in this package');
  const list = RideCareApi.createElement('ul', 'service-inclusion-list');
  service.inclusions.forEach(inclusion => { const item = document.createElement('li'); item.append(RideCareApi.createElement('span', 'service-check', '\u2713'), document.createTextNode(inclusion)); list.append(item); });
  const actions = RideCareApi.createElement('div', 'service-modal-actions');
  const close = RideCareApi.createElement('button', 'btn btn-outline-light', 'Close'); close.type = 'button'; close.addEventListener('click', closeAllModals);
  const book = RideCareApi.createElement('button', 'btn btn-primary', 'Book This Service \u2192'); book.type = 'button'; book.addEventListener('click', () => window.BookingWizard?.openWithService(slug));
  actions.append(close, book); body.append(details, heading, list, actions); openModal('serviceDetailModal');
};

function renderReviews(reviews) {
  const grid = document.getElementById('testimonialsGrid');
  if (!grid) return;
  grid.replaceChildren();
  if (!reviews.length) { grid.append(RideCareApi.createElement('p', 'empty-state', 'Customer reviews will appear here soon.')); return; }
  const shown = reviews.slice(0, 6);
  shown.forEach(review => {
    const card = RideCareApi.createElement('article', 'testimonial-card');
    const header = RideCareApi.createElement('div', 'testimonial-header');
    const avatar = document.createElement('img');
    avatar.className = 'reviewer-avatar';
    avatar.src = review.avatar || 'assets/images/avatar_rahul.jpg';
    avatar.alt = review.name;
    avatar.loading = 'lazy';
    const meta = RideCareApi.createElement('div', 'reviewer-meta');
    meta.append(
      RideCareApi.createElement('h4', '', review.name),
      RideCareApi.createElement('div', 'reviewer-stars', '\u2605'.repeat(Math.max(1, Math.min(5, Number(review.rating) || 5))))
    );
    header.append(avatar, meta);
    card.append(header, RideCareApi.createElement('p', 'testimonial-quote', `\u201c${review.quote}\u201d`));
    grid.append(card);
  });
  // Update the review count badge dynamically
  const countBadge = document.getElementById('reviewsCountBadge');
  if (countBadge) countBadge.textContent = shown.length;
}

function renderPublicStats(stats) {
  if (!stats) return;
  const mapping = { yearsExperience: 'yearsExperience', bikesServiced: 'bikesServiced', satisfaction: 'satisfaction' };
  Object.entries(mapping).forEach(([key, value]) => document.querySelectorAll(`[data-stat="${key}"]`).forEach(element => { element.textContent = stats[value] ?? ''; }));
}

function initSearch() {
  const input = document.getElementById('searchModalInput'); const results = document.getElementById('searchResultsContainer');
  input?.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase(); results.replaceChildren();
    if (!query) { results.append(RideCareApi.createElement('p', 'search-empty', 'Type a service or part name to search.')); return; }
    const matches = publicState.services.filter(service => [service.title, service.shortDescription, ...service.inclusions].join(' ').toLowerCase().includes(query));
    if (!matches.length) { results.append(RideCareApi.createElement('p', 'search-empty', 'No matching services found.')); return; }
    matches.forEach(service => { const result = RideCareApi.createElement('button', 'search-result-item'); result.type = 'button'; result.append(RideCareApi.createElement('strong', '', service.title), RideCareApi.createElement('p', '', service.shortDescription)); result.addEventListener('click', () => window.openServiceModal(service.slug)); results.append(result); });
  });
}

function initContactForm() {
  const form = document.getElementById('contactForm');
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]'); button.disabled = true;
    try {
      await RideCareApi.createInquiry({ name: document.getElementById('contactName')?.value, phone: document.getElementById('contactPhone')?.value, bike: document.getElementById('contactBike')?.value, message: document.getElementById('contactMsg')?.value, website_url: document.getElementById('contactHoneypot')?.value });
      form.reset(); showToast('Thank you. Your inquiry has been sent to our workshop team.', 'success');
    } catch (error) { showToast(error.message, 'error'); } finally { button.disabled = false; }
  });
}

function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) { container = RideCareApi.createElement('div', 'toast-container'); document.body.append(container); }
  const toast = RideCareApi.createElement('div', `toast-message ${type === 'success' ? 'success' : type === 'error' ? 'error' : ''}`);
  toast.append(RideCareApi.createElement('span', '', type === 'success' ? '\u2713' : type === 'error' ? '\u26a0' : '\u2139'), document.createTextNode(` ${message}`)); container.append(toast);
  setTimeout(() => toast.remove(), 4500);
}
window.showToast = showToast;
window.RideCarePublic = publicState;
