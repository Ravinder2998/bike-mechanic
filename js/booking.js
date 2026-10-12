const BookingWizard = {
  currentStep: 1,
  totalSteps: 4,
  initialized: false,
  options: { brands: [], slots: [], services: [], pickupFee: 0 },
  data: { brand: '', model: '', selectedServices: [], serviceType: 'workshop', date: '', timeSlot: '', customerName: '', phone: '', email: '', regNumber: '', notes: '', estimatedTotal: 0 },

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      const options = await RideCareApi.getBookingOptions();
      this.options = { ...options, services: [] };
      await this.refreshServices();
      this.renderOptions(); this.bindEvents(); this.setDefaultDate(); await this.calculateTotal();
    } catch (error) { window.showToast('Booking options could not be loaded. Please refresh the page.', 'error'); }
  },

  async refreshServices() {
    this.options.services = window.RideCarePublic?.services?.length ? window.RideCarePublic.services : await RideCareApi.getServices();
  },

  renderOptions() {
    const brandGrid = document.getElementById('brandChipsGrid');
    const serviceList = document.getElementById('serviceSelectList');
    const slotSelect = document.getElementById('booking-slot');
    if (brandGrid) {
      brandGrid.replaceChildren();
      this.options.brands.forEach((brand, index) => {
        const button = RideCareApi.createElement('button', `brand-chip ${index === 0 ? 'selected' : ''}`, brand.name); button.type = 'button'; button.dataset.brand = brand.name;
        button.addEventListener('click', () => { brandGrid.querySelectorAll('.brand-chip').forEach(item => item.classList.remove('selected')); button.classList.add('selected'); this.data.brand = brand.name; });
        brandGrid.append(button); if (index === 0) this.data.brand = brand.name;
      });
    }
    if (serviceList) {
      serviceList.replaceChildren();
      this.options.services.forEach((service, index) => {
        const card = RideCareApi.createElement('button', `service-select-card ${index === 0 ? 'selected' : ''}`); card.type = 'button'; card.dataset.service = service.slug;
        const meta = RideCareApi.createElement('div', 'service-select-meta'); meta.append(RideCareApi.createElement('strong', '', service.title), RideCareApi.createElement('span', '', service.shortDescription));
        card.append(meta, RideCareApi.createElement('span', 'service-select-price', `₹${Number(service.basePrice).toLocaleString('en-IN')}`));
        card.addEventListener('click', () => { card.classList.toggle('selected'); this.data.selectedServices = [...serviceList.querySelectorAll('.service-select-card.selected')].map(item => item.dataset.service); this.calculateTotal(); });
        serviceList.append(card); if (index === 0) this.data.selectedServices = [service.slug];
      });
    }
    if (slotSelect) {
      slotSelect.replaceChildren();
      this.options.slots.forEach(slot => { const option = document.createElement('option'); option.value = slot.label; option.textContent = slot.label; slotSelect.append(option); });
      this.data.timeSlot = slotSelect.value;
    }
  },

  bindEvents() {
    document.querySelectorAll('input[name="service-type"]').forEach(radio => radio.addEventListener('change', event => { this.data.serviceType = event.target.value; this.calculateTotal(); }));
    document.getElementById('wizard-next-btn')?.addEventListener('click', () => this.nextStep());
    document.getElementById('wizard-prev-btn')?.addEventListener('click', () => this.prevStep());
  },

  setDefaultDate() {
    const input = document.getElementById('booking-date'); if (!input) return;
    const date = new Date(); date.setDate(date.getDate() + 1);
    input.min = date.toISOString().slice(0, 10); input.value = input.min; this.data.date = input.value;
  },

  async calculateTotal() {
    try {
      const quote = await RideCareApi.quote({ serviceSlugs: this.data.selectedServices, serviceType: this.data.serviceType });
      this.data.estimatedTotal = quote.total;
      const total = document.getElementById('wizard-total-display'); if (total) total.textContent = `₹${Number(quote.total).toLocaleString('en-IN')}`;
    } catch (error) { window.showToast(error.message, 'error'); }
  },

  validateCurrentStep() {
    if (this.currentStep === 1) { this.data.model = document.getElementById('bike-model-input')?.value.trim(); if (!this.data.model) { window.showToast('Enter your bike model.', 'error'); return false; } }
    if (this.currentStep === 2 && !this.data.selectedServices.length) { window.showToast('Select at least one service package.', 'error'); return false; }
    if (this.currentStep === 3) { this.data.date = document.getElementById('booking-date')?.value; this.data.timeSlot = document.getElementById('booking-slot')?.value; if (!this.data.date || !this.data.timeSlot) { window.showToast('Choose a date and time slot.', 'error'); return false; } }
    if (this.currentStep === 4) {
      this.data.customerName = document.getElementById('cust-name')?.value.trim(); this.data.phone = document.getElementById('cust-phone')?.value.trim(); this.data.email = document.getElementById('cust-email')?.value.trim(); this.data.regNumber = document.getElementById('cust-reg')?.value.trim(); this.data.notes = document.getElementById('cust-notes')?.value.trim();
      if (!this.data.customerName || !this.data.phone) { window.showToast('Provide your name and phone number.', 'error'); return false; }
    }
    return true;
  },

  nextStep() { if (!this.validateCurrentStep()) return; if (this.currentStep < this.totalSteps) { this.currentStep += 1; this.renderStep(); } else this.submitBooking(); },
  prevStep() { if (this.currentStep > 1) { this.currentStep -= 1; this.renderStep(); } },
  renderStep() {
    document.querySelectorAll('.wizard-step-panel').forEach(panel => { panel.style.display = panel.id === `wizard-step-${this.currentStep}` ? 'block' : 'none'; });
    document.querySelectorAll('.wizard-step-node').forEach((node, index) => node.classList.toggle('active', index + 1 === this.currentStep));
    const fill = document.getElementById('stepper-fill'); if (fill) fill.style.width = `${((this.currentStep - 1) / (this.totalSteps - 1)) * 100}%`;
    const previous = document.getElementById('wizard-prev-btn'); const next = document.getElementById('wizard-next-btn');
    if (previous) previous.style.visibility = this.currentStep === 1 ? 'hidden' : 'visible';
    if (next) next.textContent = this.currentStep === this.totalSteps ? 'Confirm Booking ✓' : 'Continue →';
  },

  async submitBooking() {
    const button = document.getElementById('wizard-next-btn'); if (button) button.disabled = true;
    try {
      const record = await RideCareApi.createBooking({ customer: this.data.customerName, phone: this.data.phone, email: this.data.email, bike: `${this.data.brand} ${this.data.model}`.trim(), reg: this.data.regNumber, date: this.data.date, timeSlot: this.data.timeSlot, serviceSlugs: this.data.selectedServices, serviceType: this.data.serviceType, notes: this.data.notes, company_website: document.getElementById('bookingHoneypot')?.value || '' });
      this.renderTicket(record); window.showToast(`Booking confirmed. Your job card is ${record.id}.`, 'success');
    } catch (error) { window.showToast(error.message, 'error'); } finally { if (button) button.disabled = false; }
  },

  renderTicket(record) {
    const body = document.querySelector('#bookingModal .modal-body'); const footer = document.querySelector('#bookingModal .modal-footer'); if (!body) return; if (footer) footer.style.display = 'none';
    body.replaceChildren();
    const ticket = RideCareApi.createElement('div', 'booking-ticket'); ticket.append(RideCareApi.createElement('h3', 'ticket-id', `Job Card ${record.id}`), RideCareApi.createElement('p', '', 'Your booking is confirmed. Keep this job-card number for live tracking.'));
    const details = RideCareApi.createElement('dl', 'ticket-details-grid'); [['Rider', record.customer], ['Motorcycle', record.bike], ['Date & slot', `${record.date} (${record.timeSlot})`], ['Services', record.services.join(', ')], ['Estimated bill', `₹${Number(record.total).toLocaleString('en-IN')}`]].forEach(([label, value]) => { const row = document.createElement('div'); row.append(RideCareApi.createElement('dt', '', label), RideCareApi.createElement('dd', '', value)); details.append(row); });
    const track = RideCareApi.createElement('button', 'btn btn-primary', 'Track My Bike →'); track.type = 'button'; track.addEventListener('click', () => { window.closeAllModals(); window.ServiceTracker?.openWithId(record.id); }); ticket.append(details, track); body.append(ticket);
  },

  openWithService(serviceSlug) {
    this.currentStep = 2; this.data.selectedServices = [serviceSlug]; document.querySelectorAll('.service-select-card').forEach(card => card.classList.toggle('selected', card.dataset.service === serviceSlug)); this.calculateTotal(); this.renderStep(); window.openModal('bookingModal');
  }
};
window.BookingWizard = BookingWizard;
document.addEventListener('ridecare:content-ready', () => { if (BookingWizard.initialized) BookingWizard.refreshServices().then(() => BookingWizard.renderOptions()); });
