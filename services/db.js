const db = {
  plans: [
    { id: 'p1', name: 'Starter Site', price: 159, currency: 'GBP', features: ['1 Website', 'Basic Analytics', '5 Requests/mo', 'Email Support'] },
    { id: 'p2', name: 'Pro Site', price: 249, currency: 'GBP', features: ['3 Websites', 'Advanced Analytics', 'Unlimited Requests', 'Priority Support', 'Custom Integrations'], popular: true },
  ],
  addons: [
    { id: 'a1', name: 'Advanced SEO Pack', price: 49, currency: 'GBP', desc: 'Deep keyword analysis and monthly technical audits.', icon: 'Globe' },
    { id: 'a2', name: 'Enterprise Security', price: 99, currency: 'GBP', desc: 'DDoS protection, WAF, and daily malware scans.', icon: 'Shield' },
    { id: 'a3', name: 'Speed Optimization', price: 29, currency: 'GBP', desc: 'Global CDN, image optimization, and caching.', icon: 'Zap' },
  ],
  clients: [
    { id: 'c1', name: 'Sprouto Main', email: 'client@sprouto.com', plan: 'Pro Site', status: 'active', joined: '2026-01-15' },
  ],
};

module.exports = db;