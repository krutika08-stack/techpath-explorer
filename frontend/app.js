const API_URL = "http://127.0.0.1:8000";

// --- VIEW NAVIGATION ---
function showView(viewName) {
  ["landingView", "analyzerView", "resultsView"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });

  const target = document.getElementById(viewName + "View");
  if (target) {
    target.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// --- SAFE RENDERING UTILITIES (XSS Prevention) ---
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function isValidHttpUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function renderList(items, customClass = "") {
  if (!Array.isArray(items) || items.length === 0) {
    return "<p class='text-muted text-xs'>None specified.</p>";
  }

  const listItems = items
    .map((item) => `<li>${escapeHTML(item)}</li>`)
    .join("");

  return `<ul class="clean-list ${customClass}">${listItems}</ul>`;
}

function renderSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return "<p class='text-muted text-xs'>No external sources listed.</p>";
  }

  const listItems = sources
    .map((source) => {
      const rawUrl = String(source.url || "").trim();
      const label = escapeHTML(source.label || rawUrl || "Source Documentation");

      if (isValidHttpUrl(rawUrl)) {
        const safeUrl = escapeHTML(rawUrl);
        return `<li><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a></li>`;
      }
      return `<li>${label} <span class="text-muted">(Link unavailable)</span></li>`;
    })
    .join("");

  return `<ul class="clean-list sources-list">${listItems}</ul>`;
}

// --- HEALTH CHECK ON PAGE LOAD ---
async function checkHealth() {
  const healthBadge = document.getElementById("healthBadge");
  const healthDot = healthBadge?.querySelector(".health-dot");
  const healthText = document.getElementById("healthText");
  const modelBadge = document.getElementById("modelConfigBadge");

  try {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.status === "ok") {
      if (healthDot) {
        healthDot.className = "health-dot dot-ok";
      }
      if (healthText) {
        const count = data.technology_count != null ? `${data.technology_count} tech entries` : "Active";
        healthText.innerText = `Backend Connected (${count})`;
      }

      // Check model configuration status (token configured vs unset)
      // Note: model_configured is configuration status only, not proof of successful inference
      if (modelBadge) {
        if (data.model_configured) {
          modelBadge.className = "badge badge-ai";
          modelBadge.innerText = "Cloud Model: Token Configured";
          modelBadge.title = "HF_TOKEN environment variable is set. Inference will be attempted during analysis.";
        } else {
          modelBadge.className = "badge badge-neutral";
          modelBadge.innerText = "Cloud Model: Unconfigured (Fallback Ready)";
          modelBadge.title = "HF_TOKEN is not set. Deterministic rule-based fallback will be used.";
        }
      }
    } else {
      // Degraded state (e.g. dataset failed to load)
      if (healthDot) healthDot.className = "health-dot dot-warn";
      if (healthText) healthText.innerText = "Backend Degraded (Dataset issue)";
    }
  } catch (error) {
    if (healthDot) healthDot.className = "health-dot dot-err";
    if (healthText) healthText.innerText = "Backend Offline (Port 8000)";
    if (modelBadge) {
      modelBadge.className = "badge badge-neutral";
      modelBadge.innerText = "Cloud Model: Unknown";
    }
  }
}

// --- PRESET LOADER (Beginner Friendly Testing) ---
function loadPreset(type) {
  const probInput = document.getElementById("p_prob");
  const skillInput = document.getElementById("p_skill");
  const budgInput = document.getElementById("p_budg");
  const hardInput = document.getElementById("p_hard");

  if (type === "chatbot") {
    probInput.value = "Build an AI chatbot for customer support, document question answering, and text summarization.";
    skillInput.value = "Beginner";
    budgInput.value = "Free / ₹0";
    hardInput.value = "Cloud computing only";
  } else if (type === "api") {
    probInput.value = "Create a scalable web API with background data processing, secure auth, and relational storage.";
    skillInput.value = "Intermediate";
    budgInput.value = "Flexible";
    hardInput.value = "Cloud computing only";
  } else if (type === "edge") {
    probInput.value = "Detect plant leaf diseases locally on edge devices with lightweight computer vision and no external internet dependencies.";
    skillInput.value = "Beginner";
    budgInput.value = "Free / ₹0";
    hardInput.value = "16 GB RAM, no GPU";
  }

  updateCharCount();
  hideFormAlert();
}

function updateCharCount() {
  const textarea = document.getElementById("p_prob");
  const counter = document.getElementById("charCount");
  if (textarea && counter) {
    const len = textarea.value.trim().length;
    counter.innerText = `${len} / 2000`;
    if (len > 0 && len < 5) {
      counter.style.color = "var(--amber)";
    } else {
      counter.style.color = "var(--muted)";
    }
  }
}

function showFormAlert(message) {
  const alertBox = document.getElementById("formAlert");
  if (alertBox) {
    alertBox.innerText = message;
    alertBox.classList.remove("hidden");
  }
}

function hideFormAlert() {
  const alertBox = document.getElementById("formAlert");
  if (alertBox) {
    alertBox.innerText = "";
    alertBox.classList.add("hidden");
  }
}

// --- FORM SUBMISSION & ANALYSIS ---
async function handleAnalyze(event) {
  event.preventDefault();
  hideFormAlert();

  const problemStatement = document.getElementById("p_prob").value.trim();
  const skillLevel = document.getElementById("p_skill").value;
  const budget = document.getElementById("p_budg").value;
  const hardware = document.getElementById("p_hard").value;

  if (problemStatement.length < 5) {
    showFormAlert("Please provide a problem statement of at least 5 characters.");
    return;
  }

  const submitBtn = document.getElementById("submitBtn");
  const loadingState = document.getElementById("loadingState");

  // Toggle loading state
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = "Analyzing Constraints...";
  }
  if (loadingState) {
    loadingState.classList.remove("hidden");
  }

  try {
    const response = await fetch(`${API_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        problem_statement: problemStatement,
        skill_level: skillLevel,
        budget: budget,
        hardware: hardware
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail || data);
      throw new Error(errorMsg || `API request failed with status ${response.status}`);
    }

    renderResults(data);
    showView("results");
  } catch (error) {
    showFormAlert(
      `Could not complete analysis.\n\nDetails: ${error.message}\n\nPlease check that the FastAPI backend is running at ${API_URL}.`
    );
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = "✨ Analyze & Generate Roadmap →";
    }
    if (loadingState) {
      loadingState.classList.add("hidden");
    }
  }
}

// --- RENDER RESULTS WITH HONEST PROVENANCE ---
function renderResults(data) {
  // 1. Populate Request Summary
  document.getElementById("res_problem").innerText = data.request?.problem_statement || "Not specified";
  document.getElementById("res_skill").innerText = data.request?.skill_level || "Not specified";
  document.getElementById("res_budget").innerText = data.request?.budget || "Not specified";
  document.getElementById("res_hardware").innerText = data.request?.hardware || "Not specified";

  // 2. Strict Honest Provenance Badge
  // Display AI-assisted status ONLY when data.ai_used === true.
  // Do not name specific models unless confirmed by the backend response.
  const badgeContainer = document.getElementById("provenanceBadgeContainer");
  const evidenceText = document.getElementById("evidenceText");
  const inferenceModeText = document.getElementById("res_inference_mode");

  if (data.ai_used === true) {
    badgeContainer.innerHTML = '<span class="badge badge-ai">✨ AI-Assisted</span>';
    evidenceText.innerText =
      "Match reasons were generated using cloud-hosted AI inference based on the candidate technologies and your specific constraints. Verify official docs and pricing before architectural commitment.";
    inferenceModeText.innerText = "Cloud AI Augmented";
  } else {
    badgeContainer.innerHTML = '<span class="badge badge-fallback">⚙️ Heuristic Matching (Rule-Based Fallback)</span>';
    evidenceText.innerText =
      "Recommendations and reasons were determined using deterministic constraint matching and keyword overlap from the local dataset. Cloud AI inference was not utilized.";
    inferenceModeText.innerText = "Deterministic Heuristic Fallback";
  }

  // 3. Dataset version display
  document.getElementById("res_dataset_version").innerText = escapeHTML(data.dataset_version || "unknown");

  // 4. Render Recommendation Cards
  const recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
  const container = document.getElementById("recommendationsList");

  if (recommendations.length === 0) {
    container.innerHTML = '<div class="card"><p class="text-muted">No matching technologies returned by the backend.</p></div>';
    return;
  }

  container.innerHTML = recommendations.map((item, index) => {
    const scoreVal = typeof item.score === "number" ? Math.round(item.score) : escapeHTML(item.score);

    // Format pricing details safely
    const pricing = item.pricing || {};
    const priceModel = escapeHTML(pricing.model || "Not specified");
    const budgetTier = escapeHTML(pricing.budget_tier || "Not specified");
    const startingPrice = pricing.paid_starting_from == null
      ? "None specified"
      : `${escapeHTML(pricing.paid_starting_from)} USD`;

    // Warnings list
    const hasWarnings = Array.isArray(item.warnings) && item.warnings.length > 0;
    const warningsHTML = hasWarnings
      ? `
        <div class="warnings-box">
          <h4 class="text-amber">⚠️ Verification & Constraint Warnings</h4>
          ${renderList(item.warnings)}
        </div>
      `
      : "";

    return `
      <article class="rec-card">
        <div class="card-top">
          <span class="tech-cat">${escapeHTML(item.category || "Technology")}</span>
          <span class="badge ${index === 0 ? "badge-score" : "badge-neutral"}">
            Match Score: ${scoreVal}%
          </span>
        </div>

        <div class="rec-title-row">
          <h3>${index + 1}. ${escapeHTML(item.name || "Unknown Tool")}</h3>
          <span class="rec-id">ID: ${escapeHTML(item.id || "")}</span>
        </div>

        <!-- Reasons -->
        <div class="detail-block">
          <h4 class="text-indigo">Why It Matched</h4>
          ${renderList(item.reasons)}
        </div>

        <!-- Warnings -->
        ${warningsHTML}

        <!-- Advantages -->
        <div class="detail-block">
          <h4 class="text-green">Key Advantages</h4>
          ${renderList(item.advantages, "advantages-list")}
        </div>

        <!-- Limitations -->
        <div class="detail-block">
          <h4>Limitations to Consider</h4>
          ${renderList(item.limitations)}
        </div>

        <!-- Pricing Specs -->
        <div class="detail-block">
          <h4>Pricing & Resource Tier</h4>
          <div class="pricing-box">
            <span>Model: <b>${priceModel}</b></span>
            <span>Tier: <b>${budgetTier}</b></span>
            <span>Starting Price: <b>${startingPrice}</b></span>
          </div>
        </div>

        <!-- Sources -->
        <div class="detail-block">
          <h4>Verified Documentation & Sources</h4>
          ${renderSources(item.sources)}
        </div>

        <!-- Verification note -->
        <div class="verification-note">
          Dataset Note: ${escapeHTML(item.verification?.overall_notes || "Check source details before use.")}
        </div>
      </article>
    `;
  }).join("");
}

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  checkHealth();
  updateCharCount();
});
