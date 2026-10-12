const ServiceTracker = {
  stages: [
    { num: 1, name: 'Bike Inward & Job Card Opened', desc: 'Bike checked in at the workshop and initial inspection completed.' },
    { num: 2, name: 'Technical Diagnostic & Disassembly', desc: 'Mechanic is testing engine, fluids, brakes, and electricals.' },
    { num: 3, name: 'Active Servicing & Spares Replacement', desc: 'Service work and genuine-parts replacement are in progress.' },
    { num: 4, name: 'Quality Inspection & Road Test', desc: 'Final safety inspection and test ride are underway.' },
    { num: 5, name: 'Ready for Delivery', desc: 'Quality checks are complete and your bike is ready for collection.' }
  ],
  init() {
    const button = document.getElementById('tracker-search-btn'); const input = document.getElementById('tracker-job-input'); const phone = document.getElementById('tracker-phone-input');
    button?.addEventListener('click', () => this.lookup(input?.value, phone?.value));
    [input, phone].forEach(element => element?.addEventListener('keydown', event => { if (event.key === 'Enter') this.lookup(input?.value, phone?.value); }));
  },
  openWithId(jobId) { window.openModal('trackerModal'); const input = document.getElementById('tracker-job-input'); if (input) input.value = jobId; document.getElementById('tracker-phone-input')?.focus(); },
  async lookup(jobId, phoneLastFour) {
    const result = document.getElementById('tracker-result-area'); if (!result) return;
    result.replaceChildren(RideCareApi.createElement('p', 'tracker-loading', 'Checking your live workshop record…'));
    try {
      const booking = await RideCareApi.trackBooking({ jobId: String(jobId || '').trim().toUpperCase(), phoneLastFour: String(phoneLastFour || '').replace(/\D/g, '').slice(-4) });
      this.render(booking, result);
    } catch (error) { result.replaceChildren(RideCareApi.createElement('p', 'tracker-error', error.message)); }
  },
  render(booking, result) {
    result.replaceChildren();
    const card = RideCareApi.createElement('div', 'tracker-record');
    const heading = RideCareApi.createElement('div', 'tracker-record-heading'); heading.append(RideCareApi.createElement('div', '', `Job Card ${booking.id}`), RideCareApi.createElement('strong', '', booking.bike)); card.append(heading);
    const facts = RideCareApi.createElement('div', 'tracker-facts'); [['Status', booking.status], ['Mechanic', booking.assignedTech], ['Workshop bay', booking.bay], ['Estimated handover', booking.estimatedReady]].forEach(([label, value]) => { const fact = document.createElement('div'); fact.append(RideCareApi.createElement('span', '', label), RideCareApi.createElement('strong', '', value || 'Pending')); facts.append(fact); }); card.append(facts);
    if (booking.notes) { const note = RideCareApi.createElement('p', 'tracker-note'); note.append(RideCareApi.createElement('strong', '', 'Technician note: '), document.createTextNode(booking.notes)); card.append(note); }
    const timeline = RideCareApi.createElement('div', 'tracker-timeline'); this.stages.forEach(stage => { const item = RideCareApi.createElement('div', `tracker-stage-item ${stage.num < booking.stage ? 'completed' : stage.num === booking.stage ? 'active' : ''}`); item.append(RideCareApi.createElement('div', 'stage-marker-dot'), RideCareApi.createElement('div', 'stage-info', `Stage 0${stage.num}: ${stage.name} — ${stage.desc}`)); timeline.append(item); }); card.append(timeline); result.append(card);
  }
};
window.ServiceTracker = ServiceTracker;
