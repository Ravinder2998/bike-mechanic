(() => {
  async function request(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
      ...options
    });
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json() : null;
    if (!response.ok) {
      const error = new Error(payload?.error || 'Something went wrong.');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = text;
    return element;
  }

  window.RideCareApi = {
    getPublicContent: () => request('/api/public/content'),
    getServices: () => request('/api/services'),
    getBookingOptions: () => request('/api/booking-options'),
    getCalculatorConfig: () => request('/api/calculator-config'),
    quote: data => request('/api/quote', { method: 'POST', body: JSON.stringify(data) }),
    createBooking: data => request('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),
    trackBooking: data => request('/api/tracking/lookup', { method: 'POST', body: JSON.stringify(data) }),
    createInquiry: data => request('/api/inquiries', { method: 'POST', body: JSON.stringify(data) }),
    request,
    createElement
  };
})();
