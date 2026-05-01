const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// API key auth — exempt /health for Railway health checks
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.BLISSCLUB_API_KEY) return res.status(403).json({ ok: false, error: 'Forbidden' });
  next();
});

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
  if (params.date_from) url.searchParams.set('date_from', params.date_from);
  if (params.date_to) url.searchParams.set('date_to', params.date_to);
  if (params.date_preset) url.searchParams.set('date_preset', params.date_preset);
  if (params.attribution_window) url.searchParams.set('attribution_window', params.attribution_window);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Windsor error: ${res.status} ${await res.text()}`);
  return res.json();
}

app.get('/api/meta/daily', async (req, res) => {
  try {
    const { date_from, date_to, date_preset = 'this_monthT' } = req.query;
    const data = await windsorFetch('facebook', [
      'date', 'campaign', 'adset_name', 'ad_name',
      'spend', 'impressions', 'clicks', 'link_clicks',
      'cpc', 'cpm', 'ctr', 'reach', 'frequency',
      'actions_purchase', 'action_values_purchase',
      'actions_landing_page_view',
    ], { date_from, date_to, date_preset, attribution_window: '1d_click' });
    res.json({ ok: true, data: data.data || data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/meta/hourly', async (req, res) => {
  try {
    const { date_from, date_to, date_preset = 'last_1dT' } = req.query;
    const data = await windsorFetch('facebook', [
      'date', 'hourly_stats_aggregated_by_advertiser_time_zone',
      'campaign', 'adset_name', 'spend', 'impressions',
      'clicks', 'actions_purchase', 'action_values_purchase',
      'cpc', 'cpm',
    ], { date_from, date_to, date_preset, attribution_window: '1d_click' });
    res.json({ ok: true, data: data.data || data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/google/campaigns', async (req, res) => {
  try {
    const { date_from, date_to, date_preset = 'this_monthT' } = req.query;
    const data = await windsorFetch('google_ads', [
      'date', 'campaign', 'spend', 'impressions',
      'clicks', 'cpc', 'conversions', 'conversion_value',
    ], { date_from, date_to, date_preset });
    res.json({ ok: true, data: data.data || data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/ga4/daily', async (req, res) => {
  try {
    const { date_from, date_to, date_preset = 'this_monthT' } = req.query;
    const data = await windsorFetch('googleanalytics4', [
      'date', 'source', 'medium', 'campaign',
      'manual_term', 'sessions', 'transactions', 'purchase_revenue',
    ], { date_from, date_to, date_preset });
    res.json({ ok: true, data: data.data || data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Windsor proxy running on :${PORT}`));
