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