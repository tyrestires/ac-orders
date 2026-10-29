/**
 * Auto Country Order Automation
 * Runs via GitHub Actions on a schedule.
 * Checks Wave for new paid invoices, then places the order on autocountry.ca
 */

const { chromium } = require('playwright');
const fs = require('fs');

const WAVE_TOKEN  = process.env.WAVE_TOKEN;
const WAVE_BIZ_ID = process.env.WAVE_BIZ_ID;
const AC_USERNAME = process.env.AC_USERNAME;
const AC_PASSWORD = process.env.AC_PASSWORD;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const STATE_FILE = './ordered_invoices.json';

async function wave(query, variables = {}) {
  const res = await fetch('https://gql.waveapps.com/graphql/public', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WAVE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });
  return res.json();
}

async function getPaidInvoices() {
  const result = await wave(
    `query GetPaidInvoices($businessId: ID!, $status: InvoiceStatus) {
      business(id: $businessId) {
        invoices(status: $status, page: 1, pageSize: 50) {
          edges {
            node {
              id invoiceNumber
              amountDue { value } amountPaid { value }
              status
              payments { paymentDate }
              customer { name email address { addressLine1 city province { name } postalCode country { name } } }
              items {
                product { id name } description quantity price
              }
            }
          }
        }
      }
    }`,
    { businessId: WAVE_BIZ_ID, status: 'PAID' }
  );
  return result?.data?.business?.invoices?.edges?.map(e => e.node) || [];
}

function loadOrderedInvoices() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch(e) {}
  return {};
}

function saveOrderedInvoice(invoiceNumber, orderDetails) {
  const state = loadOrderedInvoices();
  state[invoiceNumber] = { ...orderDetails, orderedAt: new Date().toISOString() };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function sendNotification(subject, body) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Tyres Tires Orders <orders@tyrestires.ca>',
      to: [NOTIFY_EMAIL],
      subject,
      text: body
    })
  });
}

async function placeACOrder(invoice) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log(`Placing AC order for invoice #${invoice.invoiceNumber}...`);

    // Sign in
    await page.goto('https://autocountry.ca/en-ca/signin');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="text"]', AC_USERNAME);
    await page.fill('input[type="password"]', AC_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    console.log('Logged in to AC');

    // Process each line item
    for (const item of invoice.items) {
      const sku = (item.product?.name || item.description || '').trim();
      const qty = item.quantity;
      if (!sku) continue;

      console.log(`Searching for SKU: ${sku} x${qty}`);

      await page.goto(`https://autocountry.ca/en-ca/search?q=${encodeURIComponent(sku)}`);
      await page.waitForLoadState('networkidle');

      // Click first product result
      const firstProduct = page.locator('.product-card a, .search-result a, [class*="product"] a').first();
      if (await firstProduct.count() === 0) {
        console.warn(`SKU not found on AC site: ${sku}`);
        continue;
      }
      await firstProduct.click();
      await page.waitForLoadState('networkidle');

      // Set quantity
      const qtyInput = page.locator('input[name="quantity"], input[type="number"]').first();
      if (await qtyInput.count() > 0) {
        await qtyInput.triple_click();
        await qtyInput.fill(String(qty));
      }

      // Add to cart
      await page.click('button:has-text("Add to Cart"), button:has-text("Add to cart")');
      await page.waitForTimeout(1500);
      console.log(`Added ${sku} x${qty} to cart`);
    }

    // Checkout
    await page.goto('https://autocountry.ca/en-ca/checkout');
    await page.waitForLoadState('networkidle');

    // Confirm and place order
    const placeOrderBtn = page.locator('button:has-text("Place Order"), button:has-text("Submit"), button:has-text("Confirm")').first();
    if (await placeOrderBtn.count() > 0) {
      await placeOrderBtn.click();
      await page.waitForLoadState('networkidle');
    }

    const pageContent = await page.textContent('body');
    console.log('Checkout page:', pageContent.substring(0, 300));

    await browser.close();
    return { success: true, pageSnippet: pageContent.substring(0, 500) };

  } catch (err) {
    await browser.close();
    throw err;
  }
}

async function main() {
  console.log('Checking Wave for paid invoices...');
  const invoices = await getPaidInvoices();
  const ordered = loadOrderedInvoices();

  const newInvoices = invoices.filter(inv => !ordered[inv.invoiceNumber]);

  if (newInvoices.length === 0) {
    console.log('No new invoices to process.');
    return;
  }

  for (const invoice of newInvoices) {
    console.log(`Processing invoice #${invoice.invoiceNumber} — ${invoice.customer?.name}`);

    try {
      await placeACOrder(invoice);

      saveOrderedInvoice(invoice.invoiceNumber, {
        customer: invoice.customer?.name,
        items: invoice.items.map(i => ({ sku: i.product?.name || i.description, qty: i.quantity }))
      });

      await sendNotification(
        `✅ AC Order Placed — Invoice #${invoice.invoiceNumber}`,
        `Order placed on Auto Country for invoice #${invoice.invoiceNumber}.\n\nCustomer: ${invoice.customer?.name}\n\nItems:\n${invoice.items.map(i => `  - ${i.product?.name || i.description} x${i.quantity}`).join('\n')}`
      );

      console.log(`✅ Done: Invoice #${invoice.invoiceNumber}`);

    } catch (err) {
      console.error(`❌ Failed invoice #${invoice.invoiceNumber}:`, err.message);

      await sendNotification(
        `❌ AC Order FAILED — Invoice #${invoice.invoiceNumber} — Manual action needed`,
        `Failed to place AC order for invoice #${invoice.invoiceNumber}.\n\nCustomer: ${invoice.customer?.name}\n\nItems:\n${invoice.items.map(i => `  - ${i.product?.name || i.description} x${i.quantity}`).join('\n')}\n\nError: ${err.message}\n\nPlease log in to autocountry.ca and place manually.`
      );
    }
  }
}

main().catch(console.error);
