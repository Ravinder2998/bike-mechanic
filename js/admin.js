const adminState = { bookings: [], inquiries: [], reviews: [], services: [], settings: null };

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm')?.addEventListener('submit', login);
  document.getElementById('logoutButton')?.addEventListener('click', logout);
  // Sidebar tab switching is handled by inline script in admin.html; admin-tab kept for legacy compatibility
  document.getElementById('serviceForm')?.addEventListener('submit', saveService);
  document.getElementById('cancelServiceEdit')?.addEventListener('click', clearServiceForm);
  document.getElementById('settingsForm')?.addEventListener('submit', saveSettings);
  verifySession();
});

function message(text = '', success = false) { const element = document.getElementById('dashboardMessage'); if (element) { element.textContent = text; element.classList.toggle('success', success); } }
function loginMessage(text = '') { document.getElementById('loginMessage').textContent = text; }
function activatePane(name) {
  document.querySelectorAll('.sidebar-link[data-pane]').forEach(btn => btn.classList.toggle('active', btn.dataset.pane === name));
  document.querySelectorAll('.admin-pane').forEach(pane => pane.classList.toggle('active', pane.id === `pane-${name}`));
  const paneNames = { jobs: 'Service Jobs', inquiries: 'Customer Inquiries', reviews: 'Customer Reviews', services: 'Services', settings: 'Site Settings' };
  const titleEl = document.getElementById('adminTopbarTitle');
  if (titleEl) titleEl.textContent = paneNames[name] || name;
}
function setView(authenticated) { document.getElementById('loginView').classList.toggle('hidden', authenticated); document.getElementById('dashboardView').classList.toggle('hidden', !authenticated); }

async function verifySession() {
  try { const result = await RideCareApi.request('/api/admin/me'); setView(true); const userLabel = document.getElementById('adminUserLabel'); if (userLabel) userLabel.textContent = `Signed in as ${result.user.name}`; document.getElementById('adminWelcome').textContent = 'Changes are published to the live site immediately.'; await loadDashboard(); }
  catch { setView(false); }
}

async function login(event) {
  event.preventDefault(); loginMessage('');
  const button = event.currentTarget.querySelector('button'); button.disabled = true;
  try { await RideCareApi.request('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: document.getElementById('loginUsername').value, password: document.getElementById('loginPassword').value }) }); await verifySession(); }
  catch (error) { loginMessage(error.message); } finally { button.disabled = false; }
}

async function logout() { try { await RideCareApi.request('/api/admin/logout', { method: 'POST' }); } finally { setView(false); } }

async function loadDashboard() {
  try {
    const [stats, bookings, inquiries, reviews, services, settings] = await Promise.all([
      RideCareApi.request('/api/stats'), RideCareApi.request('/api/bookings'), RideCareApi.request('/api/inquiries'), RideCareApi.request('/api/admin/reviews'), RideCareApi.request('/api/admin/services'), RideCareApi.request('/api/admin/settings')
    ]);
    Object.assign(adminState, { bookings, inquiries, reviews, services, settings });
    document.getElementById('statTotalJobs').textContent = stats.totalBookings;
    document.getElementById('statInServicing').textContent = stats.inServicing;
    document.getElementById('statReady').textContent = stats.readyForPickup;
    document.getElementById('statRevenue').textContent = `₹${Number(stats.todayRevenue).toLocaleString('en-IN')}`;
    renderBookings(); renderInquiries(); renderReviews(); renderServices(); fillSettings(settings);
  } catch (error) { message(error.message); }
}

function cell(row, text) { const td = document.createElement('td'); td.textContent = text ?? ''; row.append(td); return td; }
function actionButton(label, handler, kind = 'btn btn-sm btn-outline') { const button = RideCareApi.createElement('button', kind, label); button.type = 'button'; button.addEventListener('click', handler); return button; }
function emptyRow(body, colspan, text) { const row = document.createElement('tr'); const td = cell(row, text); td.colSpan = colspan; td.style.textAlign = 'center'; body.replaceChildren(row); }

function renderBookings() {
  const body = document.getElementById('bookingsTableBody'); if (!adminState.bookings.length) return emptyRow(body, 7, 'No bookings yet.'); body.replaceChildren();
  adminState.bookings.forEach(booking => {
    const row = document.createElement('tr'); cell(row, booking.id); cell(row, `${booking.customer}\n${booking.phone}`); cell(row, `${booking.bike}\n${booking.reg || 'No registration'}`); cell(row, `Stage ${booking.stage}: ${booking.status}`); cell(row, `${booking.assignedTech || 'Unassigned'}\n${booking.bay || 'No bay'}\n${booking.estimatedReady || 'Pending'}`); cell(row, `₹${Number(booking.total).toLocaleString('en-IN')}`);
    const actions = cell(row, ''); const wrap = RideCareApi.createElement('div', 'admin-row-actions'); wrap.append(actionButton('Update', () => updateBooking(booking)), actionButton('Delete', () => deleteBooking(booking.id))); actions.append(wrap); body.append(row);
  });
}
async function updateBooking(booking) {
  const stage = prompt('Stage (1-5):', booking.stage); if (stage === null) return;
  const assignedTech = prompt('Assigned mechanic:', booking.assignedTech || ''); if (assignedTech === null) return;
  const bay = prompt('Workshop bay:', booking.bay || ''); if (bay === null) return;
  const estimatedReady = prompt('Estimated handover:', booking.estimatedReady || ''); if (estimatedReady === null) return;
  const notes = prompt('Technician note visible to rider:', booking.notes || ''); if (notes === null) return;
  try { await RideCareApi.request(`/api/bookings/${encodeURIComponent(booking.id)}`, { method: 'PATCH', body: JSON.stringify({ stage: Number(stage), assignedTech, bay, estimatedReady, notes }) }); message('Booking update published.', true); await loadDashboard(); } catch (error) { message(error.message); }
}
async function deleteBooking(id) { if (!confirm(`Delete job card ${id}? This cannot be undone.`)) return; try { await RideCareApi.request(`/api/bookings/${encodeURIComponent(id)}`, { method: 'DELETE' }); message('Booking deleted.', true); await loadDashboard(); } catch (error) { message(error.message); } }

function renderInquiries() {
  const body = document.getElementById('inquiriesTableBody'); if (!adminState.inquiries.length) return emptyRow(body, 6, 'No inquiries yet.'); body.replaceChildren();
  adminState.inquiries.forEach(inquiry => { const row = document.createElement('tr'); cell(row, inquiry.name); cell(row, inquiry.phone); cell(row, inquiry.bike); cell(row, inquiry.message); cell(row, inquiry.status); const actions = cell(row, ''); const next = inquiry.status === 'New' ? 'Contacted' : 'Resolved'; actions.append(actionButton(`Mark ${next}`, () => updateInquiry(inquiry.id, next))); body.append(row); });
}
async function updateInquiry(id, status) { try { await RideCareApi.request(`/api/inquiries/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }); message('Inquiry updated.', true); await loadDashboard(); } catch (error) { message(error.message); } }

function renderReviews() {
  const body = document.getElementById('reviewsTableBody'); if (!adminState.reviews.length) return emptyRow(body, 6, 'No reviews yet.'); body.replaceChildren();
  adminState.reviews.forEach(review => { const row = document.createElement('tr'); cell(row, review.name); cell(row, review.bike); cell(row, '★'.repeat(review.rating)); cell(row, review.quote); cell(row, review.approved ? 'Published' : 'Pending approval'); const actions = cell(row, ''); const wrap = RideCareApi.createElement('div', 'admin-row-actions'); wrap.append(actionButton(review.approved ? 'Unpublish' : 'Publish', () => toggleReview(review)), actionButton('Delete', () => deleteReview(review.id))); actions.append(wrap); body.append(row); });
}
async function toggleReview(review) { try { await RideCareApi.request(`/api/admin/reviews/${encodeURIComponent(review.id)}`, { method: 'PATCH', body: JSON.stringify({ approved: !review.approved }) }); message('Review visibility updated.', true); await loadDashboard(); } catch (error) { message(error.message); } }
async function deleteReview(id) { if (!confirm('Delete this review?')) return; try { await RideCareApi.request(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: 'DELETE' }); message('Review deleted.', true); await loadDashboard(); } catch (error) { message(error.message); } }

function renderServices() {
  const body = document.getElementById('servicesTableBody'); if (!adminState.services.length) return emptyRow(body, 5, 'No services found.'); body.replaceChildren();
  adminState.services.forEach(service => { const row = document.createElement('tr'); cell(row, service.title); cell(row, `₹${Number(service.basePrice).toLocaleString('en-IN')}`); cell(row, service.isActive ? 'Active' : 'Archived'); cell(row, service.imageUrl); const actions = cell(row, ''); const wrap = RideCareApi.createElement('div', 'admin-row-actions'); wrap.append(actionButton('Edit', () => editService(service)), actionButton(service.isActive ? 'Archive' : 'Inactive', () => archiveService(service.slug))); actions.append(wrap); body.append(row); });
}
function editService(service) {
  activatePane('services'); document.getElementById('serviceFormTitle').textContent = `Edit ${service.title}`; document.getElementById('serviceEditSlug').value = service.slug; document.getElementById('serviceSlug').value = service.slug; document.getElementById('serviceSlug').disabled = true; document.getElementById('serviceTitle').value = service.title; document.getElementById('serviceDetailTitle').value = service.detailTitle; document.getElementById('serviceIcon').value = service.icon; document.getElementById('servicePrice').value = service.basePrice; document.getElementById('serviceDuration').value = service.duration; document.getElementById('serviceInterval').value = service.intervalText; document.getElementById('serviceSortOrder').value = service.sortOrder; document.getElementById('serviceImageUrl').value = service.imageUrl; document.getElementById('serviceAltText').value = service.altText; document.getElementById('serviceDescription').value = service.shortDescription; document.getElementById('serviceInclusions').value = service.inclusions.join('\n'); window.scrollTo({ top: 0, behavior: 'smooth' });
}
function clearServiceForm() { document.getElementById('serviceForm').reset(); document.getElementById('serviceEditSlug').value = ''; document.getElementById('serviceSlug').disabled = false; document.getElementById('serviceFormTitle').textContent = 'Add service'; }
async function saveService(event) {
  event.preventDefault(); const editSlug = document.getElementById('serviceEditSlug').value;
  const data = { slug: document.getElementById('serviceSlug').value, title: document.getElementById('serviceTitle').value, detailTitle: document.getElementById('serviceDetailTitle').value, icon: document.getElementById('serviceIcon').value, basePrice: Number(document.getElementById('servicePrice').value), duration: document.getElementById('serviceDuration').value, intervalText: document.getElementById('serviceInterval').value, sortOrder: Number(document.getElementById('serviceSortOrder').value), imageUrl: document.getElementById('serviceImageUrl').value, altText: document.getElementById('serviceAltText').value, shortDescription: document.getElementById('serviceDescription').value, inclusions: document.getElementById('serviceInclusions').value.split('\n').map(value => value.trim()).filter(Boolean) };
  try { await RideCareApi.request(editSlug ? `/api/admin/services/${encodeURIComponent(editSlug)}` : '/api/admin/services', { method: editSlug ? 'PATCH' : 'POST', body: JSON.stringify(data) }); message('Service saved and published.', true); clearServiceForm(); await loadDashboard(); } catch (error) { message(error.message); }
}

function fillSettings(settings) { document.getElementById('settingBusinessName').value = settings.businessName || ''; document.getElementById('settingPhone').value = settings.phone || ''; document.getElementById('settingEmail').value = settings.email || ''; document.getElementById('settingMapUrl').value = settings.mapUrl || ''; document.getElementById('settingHeroLead').value = settings.heroLead || ''; document.getElementById('settingAddress').value = settings.address || ''; document.getElementById('settingWeekdayHours').value = settings.weekdayHours || ''; document.getElementById('settingWeekendHours').value = settings.weekendHours || ''; document.getElementById('settingEmergencyHours').value = settings.emergencyHours || ''; document.getElementById('settingPickupFee').value = settings.pickupFee || 0; }
async function saveSettings(event) { event.preventDefault(); const data = { businessName: document.getElementById('settingBusinessName').value, phone: document.getElementById('settingPhone').value, email: document.getElementById('settingEmail').value, mapUrl: document.getElementById('settingMapUrl').value, heroLead: document.getElementById('settingHeroLead').value, address: document.getElementById('settingAddress').value, weekdayHours: document.getElementById('settingWeekdayHours').value, weekendHours: document.getElementById('settingWeekendHours').value, emergencyHours: document.getElementById('settingEmergencyHours').value, pickupFee: Number(document.getElementById('settingPickupFee').value) };
  try { await RideCareApi.request('/api/admin/settings', { method: 'PATCH', body: JSON.stringify(data) }); message('Site settings saved and published.', true); } catch (error) { message(error.message); }
}
async function archiveService(slug) { if (!confirm(`Archive '${slug}' from public booking?`)) return; try { await RideCareApi.request(`/api/admin/services/${encodeURIComponent(slug)}`, { method: 'DELETE' }); message('Service archived.', true); await loadDashboard(); } catch (error) { message(error.message); } }
