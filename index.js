const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const WINDSOR_API_KEY = process.env.WINDSOR_API_KEY;
const WINDSOR_BASE = 'https://connectors.windsor.ai/';
const ACCOUNTS = {
  facebook: '584820145452956',
  google_ads: '858-197-3435',
  googleanalytics4: '344633503',
};

async function windsorFetch(connector, fields, params = {}) {
  const url = new URL(WINDSOR_BASE + connector);
  url.searchParams.set('api_key', WINDSOR_API_KEY);
  url.searchParams.set('fields', fields.join(','));
  url.searchParams.set('account_id', ACCOUNTS[connector]);
  if (params.date_from)          url.searchParams.set('date_from', params.date_from);
  if (params.date_to)            url.searchParams.set('date_to', params.date_to);
  if (params.date_preset)        url.searchParams.set('date_preset', params.date_preset);
  if (params.attribution_window) url.searchParams.set('attribution_window', params.attribution_window);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Windsor error: ${res.status} ${await res.text()}`);
  return res.json();
}

// ── Meta ─────────────────────────────────────────────────────────────────────

async function metaDaily(preset, date_from, date_to) {
  return windsorFetch('facebook', [
    'date', 'campaign', 'adset_name', 'ad_name',
    'spend', 'impressions', 'clicks', 'link_clicks',
    'cpc', 'cpm', 'ctr', 'reach', 'frequency',
    'actions_purchase', 'action_values_purchase',
    'actions_landing_page_view',
  ], { date_from, date_to, date_preset: preset, attribution_window: '1d_click' })
}

// Dashboard calls /api/meta-daily
app.get('/api/meta-daily', async (req, res) => {
  try {
    const { date_from, date_to, preset = 'this_monthT' } = req.query
    const data = await metaDaily(preset, date_from, date_to)
    res.json({ ok: true, data: data.data || data })
  } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

// Also support /api/meta/daily
app.get('/api/meta/daily', async (req, res) => {
  try {
    const { date_from, date_to, preset = 'this_monthT', date_preset } = req.query
    const data = await metaDaily(date_preset || preset, date_from, date_to)
    res.json({ ok: true, data: data.data || data })
  } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

// ── Meta hourly ───────────────────────────────────────────────────────────────

async function metaHourly(preset, date_from, date_to) {
  return windsorFetch('facebook', [
    'date', 'hourly_stats_aggregated_by_advertiser_time_zone',
    'campaign', 'adset_name', 'spend', 'impressions',
    'clicks', 'actions_purchase', 'action_values_purchase', 'cpc', 'cpm',
  ], { date_from, date_to, date_preset: preset, attribution_window: '1d_click' })
}

app.get('/api/meta-hourly', async (req, res) => {
  try {
    const { date_from, date_to, preset = 'last_1dT' } = req.query
    const data = await metaHourly(preset, date_from, date_to)
    res.json({ ok: true, data: data.data || data })
  } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

app.get('/api/meta/hourly', async (req, res) => {
  try {
    const { date_from, date_to, preset = 'last_1dT', date_preset } = req.query
    const data = await metaHourly(date_preset || preset, date_from, date_to)
    res.json({ ok: true, data: data.data || data })
  } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

// ── GA4 / Shopify ─────────────────────────────────────────────────────────────

async function ga4Daily(preset, date_from, date_to) {
  return windsorFetch('googleanalytics4', [
    'date', 'source', 'medium', 'campaign',
    'manual_term', 'sessions', 'transactions', 'purchase_revenue',
  ], { date_from, date_to, date_preset: preset })
}

app.get('/api/ga4', async (req, res) => {
  try {
    const { date_from, date_to, preset = 'this_monthT' } = req.query
    const data = await ga4Daily(preset, date_from, date_to)
    res.json({ ok: true, data: data.data || data })
  } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

app.get('/api/ga4/daily', async (req, res) => {
  try {
    const { date_from, date_to, preset = 'this_monthT', date_preset } = req.query
    const data = await ga4Daily(date_preset || preset, date_from, date_to)
    res.json({ ok: true, data: data.data || data })
  } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

// ── Google campaigns ──────────────────────────────────────────────────────────

async function googleCampaigns(preset, date_from, date_to) {
  return windsorFetch('google_ads', [
    'date', 'campaign', 'spend', 'impressions',
    'clicks', 'cpc', 'conversions', 'conversion_value',
  ], { date_from, date_to, date_preset: preset })
}

app.get('/api/google-campaigns', async (req, res) => {
  try {
    const { date_from, date_to, preset = 'this_monthT' } = req.query
    const data = await googleCampaigns(preset, date_from, date_to)
    res.json({ ok: true, data: data.data || data })
  } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

app.get('/api/google/campaigns', async (req, res) => {
  try {
    const { date_from, date_to, preset = 'this_monthT', date_preset } = req.query
    const data = await googleCampaigns(date_preset || preset, date_from, date_to)
    res.json({ ok: true, data: data.data || data })
  } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

// ── Google search terms ───────────────────────────────────────────────────────

app.get('/api/google-search-terms', async (req, res) => {
  try {
    const { date_from, date_to, preset = 'this_monthT' } = req.query
    const data = await windsorFetch('google_ads', [
      'date', 'campaign', 'spend', 'impressions',
      'clicks', 'conversions', 'conversion_value',
    ], { date_from, date_to, date_preset: preset })
    res.json({ ok: true, data: data.data || data })
  } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

// ── Google keywords ───────────────────────────────────────────────────────────

app.get('/api/google-keywords', async (req, res) => {
  try {
    const { date_from, date_to, preset = 'this_monthT' } = req.query
    const data = await windsorFetch('google_ads', [
      'date', 'campaign', 'spend',
      'impressions', 'clicks', 'conversions', 'conversion_value',
    ], { date_from, date_to, date_preset: preset })
    res.json({ ok: true, data: data.data || data })
  } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

// ── Google products ───────────────────────────────────────────────────────────

app.get('/api/google-products', async (req, res) => {
  try {
    const { date_from, date_to, preset = 'this_monthT' } = req.query
    const data = await windsorFetch('google_ads', [
      'date', 'campaign', 'spend',
      'impressions', 'clicks', 'conversions', 'conversion_value',
    ], { date_from, date_to, date_preset: preset })
    res.json({ ok: true, data: data.data || data })
  } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

// ── Google demand gen ─────────────────────────────────────────────────────────

app.get('/api/google-demandgen', async (req, res) => {
  try {
    const { date_from, date_to, preset = 'this_monthT' } = req.query
    const data = await windsorFetch('google_ads', [
      'date', 'campaign', 'spend', 'impressions',
      'clicks', 'conversions', 'conversion_value',
    ], { date_from, date_to, date_preset: preset })
    res.json({ ok: true, data: data.data || data })
  } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

// ── Google awareness ──────────────────────────────────────────────────────────

app.get('/api/google-awareness', async (req, res) => {
  try {
    const { date_from, date_to, preset = 'last_30d' } = req.query
    const data = await windsorFetch('google_ads', [
      'date', 'campaign', 'spend', 'impressions',
      'clicks', 'cpm', 'cpc',
    ], { date_from, date_to, date_preset: preset })
    res.json({ ok: true, data: data.data || data })
  } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Windsor proxy running on :${PORT}`))

// ── Meta catalog (product_id breakdown) ──────────────────────────────────────
// product_id field returns "42313317908736, Product Name" — ID + name combined
// Only pull catalog/DPA campaigns to avoid null product_id on regular ads

app.get('/api/meta-catalog', async (req, res) => {
  try {
    const { date_from, date_to, preset = 'last_30d' } = req.query
    const data = await windsorFetch('facebook', [
      'date', 'campaign', 'adset_name',
      'product_id',
      'spend', 'impressions', 'clicks',
      'actions_purchase', 'action_values_purchase',
      'actions_add_to_cart', 'actions_view_content',
    ], { date_from, date_to, date_preset: preset, attribution_window: '1d_click' })

    const rows = (data.data || data)
      .filter(r => {
        // Only keep rows with product data OR catalog campaigns
        const c = (r.campaign || '').toLowerCase()
        return r.product_id || c.includes('catalog') || c.includes('dpa') || c.includes('adv+catalog')
      })
      .map(r => {
        // product_id = "42313317908736, Product Name" — split into id + name
        const raw = r.product_id || ''
        const commaIdx = raw.indexOf(',')
        const product_id   = commaIdx > -1 ? raw.slice(0, commaIdx).trim() : raw.trim()
        const product_name = commaIdx > -1 ? raw.slice(commaIdx + 1).trim() : ''
        return { ...r, product_id, product_name }
      })

    res.json({ ok: true, data: rows })
  } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})
