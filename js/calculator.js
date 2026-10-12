const ServiceCalculator = {
  initialized: false,
  config: null,
  activeSegment: 'sports',
  appliedCoupon: '',
  async init() {
    if (this.initialized) return;
    this.initialized = true;
    try { this.config = await RideCareApi.getCalculatorConfig(); this.render(); this.bindEvents(); this.calculate(); }
    catch (error) { console.warn('Estimator configuration unavailable:', error.message); }
  },
  render() {
    const segmentContainer = document.getElementById('calculatorSegments');
    const itemContainer = document.getElementById('calculatorItems');
    if (segmentContainer) {
      segmentContainer.replaceChildren();
      this.config.segments.forEach((segment, index) => { const button = RideCareApi.createElement('button', `brand-chip calc-seg-btn ${index === 0 ? 'active selected' : ''}`, segment.name); button.type = 'button'; button.dataset.segment = segment.slug; button.addEventListener('click', () => { this.activeSegment = segment.slug; segmentContainer.querySelectorAll('button').forEach(item => item.classList.remove('active', 'selected')); button.classList.add('active', 'selected'); this.calculate(); }); segmentContainer.append(button); if (index === 0) this.activeSegment = segment.slug; });
    }
    if (itemContainer) {
      itemContainer.replaceChildren();
      this.config.items.forEach(item => { const label = RideCareApi.createElement('label', 'calc-item-row'); const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = item.itemKey; checkbox.addEventListener('change', () => this.calculate()); label.append(checkbox, RideCareApi.createElement('span', '', `${item.name} — ₹${Number(item.basePrice).toLocaleString('en-IN')}`)); itemContainer.append(label); });
    }
  },
  bindEvents() {
    document.getElementById('calc-apply-coupon-btn')?.addEventListener('click', () => { this.appliedCoupon = document.getElementById('calc-coupon-input')?.value.trim().toUpperCase() || ''; this.calculate(); });
    document.getElementById('calc-book-btn')?.addEventListener('click', () => { window.closeAllModals(); window.BookingWizard.currentStep = 3; window.BookingWizard.renderStep(); window.openModal('bookingModal'); });
  },
  async calculate() {
    if (!this.config) return;
    const itemKeys = [...document.querySelectorAll('#calculatorItems input:checked')].map(item => item.value);
    try {
      const quote = await RideCareApi.quote({ segmentSlug: this.activeSegment, itemKeys, couponCode: this.appliedCoupon || undefined });
      const calculator = quote.calculator;
      document.getElementById('calc-subtotal-val').textContent = `₹${calculator.subtotal.toLocaleString('en-IN')}`;
      document.getElementById('calc-discount-val').textContent = `-₹${calculator.discount.toLocaleString('en-IN')}`;
      document.getElementById('calc-final-val').textContent = `₹${calculator.total.toLocaleString('en-IN')}`;
      if (calculator.coupon) window.showToast(calculator.coupon.message, 'success');
    } catch (error) { if (this.appliedCoupon) window.showToast(error.message, 'error'); }
  }
};
window.ServiceCalculator = ServiceCalculator;
