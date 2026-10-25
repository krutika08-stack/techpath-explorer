// ---------- Configuration ----------
// Local development default. For production, replace this with the deployed Render URL,
// for example "https://your-service.onrender.com" (no trailing slash), then redeploy the frontend.
const API_URL = "http://127.0.0.1:8000";
const REQUEST_TIMEOUT_MS = 90000; // a free Render service can take about 50 seconds to wake up

let lastPayload = null;

function showView(viewName) {
  document.getElementById('landingView').classList.add('hidden');
  document.getElementById('analyzerView').classList.add('hidden');
  document.getElementById('resultsView').classList.add('hidden');

  const target = document.getElementById(viewName + 'View');
  if (target) target.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prefill() {
  document.getElementById('p_prob').value = "Build a plant disease detection project using smartphone photos to classify leaf blight for smallholder farmers.";
  document.getElementById('p_skill').value = "Beginner";
  document.getElementById('p_budg').value = "Free / ₹0";
  document.getElementById('p_hard').value = "16 GB RAM, no GPU";
  document.getElementById('p_time').value = "2–4 weeks";
  document.getElementById('p_out').value = "Working prototype";
}

// ---------- Helpers ----------
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = (v) => (v === null || v === undefined ? '' : String(v)).trim();
const strList = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

// Builds elements with textContent, so untrusted text is never parsed as HTML.
function el(tag, text, cls) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}

// Only http(s) links are rendered as links.
function safeUrl(value) {
  try {
    const u = new URL(str(value));
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch (_) {
    return null;
  }
}

// ---------- Form submit -> POST /analyze ----------
function collectPayload() {
  return {
    problem_statement: document.getElementById('p_prob').value.trim(),
    skill_level: document.getElementById('p_skill').value,
    budget: document.getElementById('p_budg').value,
    hardware: document.getElementById('p_hard').value,
    timeline: document.getElementById('p_time').value,
    expected_outcome: document.getElementById('p_out').value
  };
}

function generate(e) {
  e.preventDefault();
  const payload = collectPayload();
  if (!payload.problem_statement) {
    showFormStatus('Please describe your project before continuing.', false);
    return;
  }
  submitPayload(payload);
}

async function submitPayload(payload) {
  lastPayload = payload;
  hideFormStatus();
  setLoading(true);
  try {
    const data = await requestAnalysis(payload);
    renderResults(data, payload);
    showView('results');
  } catch (err) {
    showFormStatus(err.message || 'Something went wrong. Please try again.', true);
  } finally {
    setLoading(false); // always restore the button, whatever happened
  }
}

async function requestAnalysis(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(API_URL.replace(/\/+$/, '') + '/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!res.ok) throw new Error(await httpErrorMessage(res));
    let data;
    try {
      data = await res.json();
    } catch (_) {
      throw new Error('The server sent a response that is not valid JSON.');
    }
    if (!isObject(data) || !Array.isArray(data.recommendations)) {
      throw new Error('The server response is missing the "recommendations" list.');
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('The request timed out. The server may be waking up, so please retry in a moment.');
    }
    if (err instanceof TypeError) {
      throw new Error('Cannot reach the backend at ' + API_URL + '. Check that it is running and allows requests from this site.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function httpErrorMessage(res) {
  let detail = '';
  try {
    const body = await res.json();
    if (isObject(body) && typeof body.detail === 'string') {
      detail = body.detail;
    } else if (isObject(body) && Array.isArray(body.detail)) {
      detail = body.detail.map((d) => str(isObject(d) ? d.msg : d)).filter(Boolean).join('; ');
    }
  } catch (_) { /* the error body was not JSON */ }
  const wake = [502, 503, 504].includes(res.status) ? ' The server may be starting up; try again shortly.' : '';
  return 'The server returned an error (' + res.status + ').' + (detail ? ' ' + detail : '') + wake;
}

// ---------- Loading and error states ----------
function setLoading(on) {
  const btn = document.getElementById('submitBtn');
  if (!btn.dataset.label) btn.dataset.label = btn.textContent.trim();
  btn.disabled = on;
  btn.textContent = on ? 'Analyzing…' : btn.dataset.label;
}

function showFormStatus(message, canRetry) {
  document.getElementById('formStatusMsg').textContent = message;
  document.getElementById('retryBtn').classList.toggle('hidden', !canRetry);
  const box = document.getElementById('formStatus');
  box.classList.remove('hidden');
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideFormStatus() {
  document.getElementById('formStatus').classList.add('hidden');
}

document.getElementById('retryBtn').addEventListener('click', () => {
  if (lastPayload) submitPayload(lastPayload);
});

// ---------- Rendering the API response ----------
function renderResults(data, payload) {
  const req = isObject(data.request) ? data.request : payload;
  document.getElementById('out_prob').textContent = str(req.problem_statement) || payload.problem_statement;
  document.getElementById('out_skill').textContent = str(req.skill_level) || payload.skill_level;
  document.getElementById('out_budg').textContent = str(req.budget) || payload.budget;
  document.getElementById('out_hard').textContent = str(req.hardware) || payload.hardware;
  document.getElementById('out_time').textContent = str(req.timeline) || payload.timeline;
  document.getElementById('out_outcome').textContent = str(req.expected_outcome) || payload.expected_outcome;

  const list = document.getElementById('recList');
  list.replaceChildren();
  const recs = data.recommendations.filter(isObject);
  document.getElementById('emptyState').classList.toggle('hidden', recs.length > 0);
  recs.forEach((rec, i) => list.append(buildCard(rec, i + 1)));

  renderAnalysis(data.analysis);

  const version = str(data.dataset_version);
  document.getElementById('datasetVersion').textContent = version ? 'Dataset version: ' + version : '';
}

function formatScore(v) {
  return typeof v === 'number' && isFinite(v) ? String(Math.round(v * 100) / 100) : str(v);
}

function listBlock(title, items, colorClass) {
  if (!items.length) return null;
  const block = el('div', '', 'rec-block');
  block.append(el('h5', title, colorClass));
  const ul = document.createElement('ul');
  items.forEach((t) => ul.append(el('li', t)));
  block.append(ul);
  return block;
}

function buildCard(rec, rank) {
  const card = el('div', '', 'card rec-card');

  const top = el('div', '', 'card-top');
  top.append(el('small', '#' + rank + (str(rec.category) ? ' · ' + str(rec.category).toUpperCase() : ''), 'tech-cat'));
  const score = formatScore(rec.score);
  if (score) top.append(el('span', 'Score ' + score, 'badge badge-green'));
  card.append(top);

  card.append(el('h4', str(rec.name) || 'Unnamed technology'));

  [
    listBlock('Why it fits', strList(rec.reasons), 'text-indigo'),
    listBlock('Advantages', strList(rec.advantages), 'text-green'),
    listBlock('Warnings', strList(rec.warnings), 'text-amber'),
    listBlock('Limitations', strList(rec.limitations), 'text-muted')
  ].forEach((b) => { if (b) card.append(b); });

  const meta = el('div', '', 'rec-meta');
  const p = isObject(rec.pricing) ? rec.pricing : {};
  const priceParts = [str(p.model), str(p.budget_tier)].filter(Boolean);
  if (p.paid_starting_from !== null && p.paid_starting_from !== undefined && str(p.paid_starting_from) !== '') {
    priceParts.push('paid from ' + (str(p.currency) ? str(p.currency) + ' ' : '') + str(p.paid_starting_from));
  }
  if (priceParts.length) {
    const s = el('span', 'Pricing: ');
    s.append(el('b', priceParts.join(' · ')));
    meta.append(s);
  }
  if (str(p.pricing_notes)) meta.append(el('span', str(p.pricing_notes)));

  const v = isObject(rec.verification) ? rec.verification : {};
  if (str(v.status)) {
    const s = el('span', 'Verification: ');
    s.append(el('b', str(v.status)));
    meta.append(s);
  }
  if (str(v.overall_notes)) meta.append(el('span', str(v.overall_notes)));
  if (meta.children.length) card.append(meta);

  const sources = Array.isArray(rec.sources) ? rec.sources.filter(isObject) : [];
  if (sources.length) {
    const block = el('div', '', 'rec-block');
    block.append(el('h5', 'Sources', 'text-indigo'));
    const ul = el('ul', '', 'src-list');
    sources.forEach((src) => {
      const label = str(src.label) || str(src.url) || 'Source';
      const href = safeUrl(src.url);
      const li = document.createElement('li');
      if (href) {
        const a = el('a', label);
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        li.append(a);
      } else {
        li.append(el('span', label + ' (link unavailable)', 'text-muted'));
      }
      ul.append(li);
    });
    block.append(ul);
    card.append(block);
  }
  return card;
}

function fillList(wrapId, listId, items) {
  const wrap = document.getElementById(wrapId);
  const list = document.getElementById(listId);
  list.replaceChildren();
  items.forEach((t) => list.append(el('li', t)));
  wrap.classList.toggle('hidden', !items.length);
}

function renderAnalysis(a) {
  const card = document.getElementById('analysisCard');
  if (!isObject(a)) { card.classList.add('hidden'); return; }
  const meta = [];
  if (str(a.method)) meta.push('Method: ' + str(a.method));
  if (str(a.model_used)) meta.push('Model: ' + str(a.model_used));
  document.getElementById('an_meta').textContent = meta.join(' · ');
  fillList('an_stepsWrap', 'an_steps', strList(a.workflow_steps));
  fillList('an_limitsWrap', 'an_limits', strList(a.limitations));
  const hasContent = meta.length || strList(a.workflow_steps).length || strList(a.limitations).length;
  card.classList.toggle('hidden', !hasContent);
}

document.addEventListener('DOMContentLoaded', () => {
  prefill();
});

// Particle network background
(function particleNetwork() {
  const canvas = document.createElement('canvas');
  canvas.id = 'network-bg';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LINK = 130;      // distance at which two dots connect
  const MOUSE_LINK = 170; // distance at which dots connect to the cursor
  const mouse = { x: -9999, y: -9999 };
  let w, h, points = [];

  function makePoint() {
    return { x: Math.random() * w, y: Math.random() * h,
             vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
             r: 1 + Math.random() * 1.5 };
  }
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(90, Math.floor((w * h) / 16000)); // fewer dots on small screens
    while (points.length < count) points.push(makePoint());
    points.length = count;
    if (reduceMotion) draw();
  }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!reduceMotion) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      ctx.fillStyle = 'rgba(129, 140, 248, 0.85)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      for (let k = i + 1; k < points.length; k++) {
        const q = points[k], dx = p.x - q.x, dy = p.y - q.y, d2 = dx * dx + dy * dy;
        if (d2 < LINK * LINK) {
          ctx.strokeStyle = `rgba(99, 102, 241, ${(1 - Math.sqrt(d2) / LINK) * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
      const mx = p.x - mouse.x, my = p.y - mouse.y, md2 = mx * mx + my * my;
      if (md2 < MOUSE_LINK * MOUSE_LINK) {
        ctx.strokeStyle = `rgba(16, 185, 129, ${(1 - Math.sqrt(md2) / MOUSE_LINK) * 0.7})`;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
    }
    if (!reduceMotion) requestAnimationFrame(draw);
  }
  window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  document.addEventListener('mouseleave', () => { mouse.x = mouse.y = -9999; });
  window.addEventListener('resize', resize);
  resize();
  if (!reduceMotion) draw();
})();