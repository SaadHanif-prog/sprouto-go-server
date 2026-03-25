const asyncHandler = require('#utils/async-handler');
const { getStripe } = require('#services/stripe');


const createCheckoutSession = asyncHandler(async (req, res) => {
  const { items, successUrl, cancelUrl, customerEmail, billingCycle } = req.body;
  const stripe = getStripe();

  if (!stripe) {
    return res.json({ url: successUrl + '&simulated=true' });
  }

  const lineItems = items.map((item) => {
    const basePrice = billingCycle === 'annual' ? Math.round(item.price * 12 * 0.8) : item.price;
    const priceWithVat = Math.round(basePrice * 1.2);

    return {
      price_data: {
        currency: 'gbp',
        product_data: { name: `${item.name} (Inc. 20% UK VAT)` },
        unit_amount: priceWithVat * 100,
        recurring: { interval: billingCycle === 'annual' ? 'year' : 'month' },
      },
      quantity: 1,
    };
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: customerEmail,
  });

  res.json({ url: session.url });
});

module.exports = { createCheckoutSession };