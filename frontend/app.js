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

function generate(e) {
  e.preventDefault();
  document.getElementById('out_prob').innerText = document.getElementById('p_prob').value;
  document.getElementById('out_skill').innerText = document.getElementById('p_skill').value;
  document.getElementById('out_budg').innerText = document.getElementById('p_budg').value;
  document.getElementById('out_hard').innerText = document.getElementById('p_hard').value;
  document.getElementById('out_outcome').innerText = document.getElementById('p_out').value;
  showView('results');
}

function copyPrompt() {
  const text = document.getElementById('promptText').innerText;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copyBtn');
    btn.innerText = "Copied!";
    setTimeout(() => btn.innerText = "Copy Prompt", 2000);
  });
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