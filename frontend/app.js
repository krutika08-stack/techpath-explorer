const API_URL = "http://127.0.0.1:8000";

function showView(viewName) {
  ["landingView", "analyzerView", "resultsView"].forEach((id) => {
    document.getElementById(id).classList.add("hidden");
  });

  const target = document.getElementById(viewName + "View");
  if (target) target.classList.remove("hidden");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function prefill() {
  document.getElementById("p_prob").value =
    "Build a chatbot for summarising text.";
  document.getElementById("p_skill").value = "Beginner";
  document.getElementById("p_budg").value = "Free / ₹0";
  document.getElementById("p_hard").value = "Cloud computing only";
  document.getElementById("p_time").value = "1 week";
  document.getElementById("p_out").value = "Working prototype";
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "<p class='text-muted'>No details provided.</p>";
  }

  return `<ul class="roadmap-list">${items
    .map((item) => `<li>${escapeHTML(item)}</li>`)
    .join("")}</ul>`;
}

function renderSources(sources) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return "<p class='text-muted'>No sources provided.</p>";
  }

  return `<ul class="roadmap-list">${sources.map((source) => {
    const url = String(source.url || "");
    const safeURL = /^https?:\/\/[^\s"'<>]+$/i.test(url);

    return `<li>${safeURL
        ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.label || url)}</a>`
        : escapeHTML(source.label || "Source unavailable")
      }</li>`;
  }).join("")}</ul>`;
}

function renderRecommendations(data) {
  const recommendations = data.recommendations || [];

  const cards = recommendations.map((tech, index) => `
    <article class="card">
      <div class="card-top">
        <small class="tech-cat">${escapeHTML(tech.category || "TECHNOLOGY")}</small>
        <span class="badge ${index === 0 ? "badge-green" : ""}">
          Score: ${escapeHTML(tech.score)}
        </span>
      </div>

      <h3>${escapeHTML(tech.name)}</h3>
      <p class="text-muted">Technology ID: ${escapeHTML(tech.id)}</p>

      <h4 style="margin-top:0.8rem;">Why it was recommended</h4>
      ${renderList(tech.reasons)}

      ${tech.warnings?.length ? `
        <h4 style="margin-top:0.8rem;" class="text-amber">Warnings</h4>
        ${renderList(tech.warnings)}
      ` : ""}

      <h4 style="margin-top:0.8rem;" class="text-green">Advantages</h4>
      ${renderList(tech.advantages)}

      <h4 style="margin-top:0.8rem;">Limitations</h4>
      ${renderList(tech.limitations)}

      <h4 style="margin-top:0.8rem;">Pricing information</h4>
      <p class="text-muted">
        Model: ${escapeHTML(tech.pricing?.model || "Not specified")}<br>
        Budget tier: ${escapeHTML(tech.pricing?.budget_tier || "Not specified")}<br>
        Starting price: ${tech.pricing?.paid_starting_from == null
      ? "Not specified"
      : escapeHTML(tech.pricing.paid_starting_from) + " USD"
    }
      </p>

      <h4 style="margin-top:0.8rem;">Sources</h4>
      ${renderSources(tech.sources)}

      <p class="text-muted" style="margin-top:0.8rem;">
        Verification: ${escapeHTML(tech.verification?.overall_notes || "Check source details before use.")}
      </p>
    </article>
  `).join("");

  const resultsView = document.getElementById("resultsView");

  resultsView.innerHTML = `
    <div class="results-header">
      <div>
        <button class="btn-sec" onclick="showView('analyzer')">
          &larr; Edit Inputs
        </button>
        <h2 style="margin-top:0.8rem;">Project Roadmap & Technology Report</h2>
      </div>
      <span class="badge badge-amber">Rule-based MVP</span>
    </div>

    <div class="card">
      <small class="section-title text-indigo">A. Project Understanding</small>
      <p class="project-statement">${escapeHTML(data.request?.problem_statement)}</p>

      <div class="tags-row">
        <span>Skill: <b>${escapeHTML(data.request?.skill_level)}</b></span>
        <span>Budget: <b>${escapeHTML(data.request?.budget)}</b></span>
        <span>Hardware: <b>${escapeHTML(data.request?.hardware)}</b></span>
        <span>Timeline: <b>${escapeHTML(document.getElementById("p_time").value)}</b></span>
        <span>Expected outcome: <b>${escapeHTML(document.getElementById("p_out").value)}</b></span>
      </div>
    </div>

    <small class="section-title text-green">B. Recommended Technology Shortlist</small>
    <p class="text-muted" style="margin:0.5rem 0 1rem;">
      ${recommendations.length} technologies returned. Scores are heuristic,
      not probabilities.
    </p>

    ${cards || `<div class="card">No recommendations were returned.</div>`}

    <div class="card">
      <small class="section-title text-indigo">C. Architecture & Next Steps</small>
      <p style="margin-top:0.6rem;">
        The API currently provides technology recommendations, reasons,
        limitations, pricing information, and sources. A project-specific
        architecture diagram and implementation roadmap are not yet generated
        by the backend.
      </p>
      <p class="text-muted" style="margin-top:0.6rem;">
        Next: compare the recommended options, choose the components that fit
        your constraints, and then build the project architecture.
      </p>
    </div>

    <div class="card">
      <small class="section-title text-amber">D. Evidence & Limitations</small>
      <p class="text-muted" style="margin-top:0.6rem;">
        Recommendations use preliminary rule-based matching, not an AI model.
        Review source links, current prices, licensing, hardware requirements,
        and service restrictions before making a final decision.
      </p>
      <p class="text-muted" style="margin-top:0.6rem;">
        Dataset version: ${escapeHTML(data.dataset_version || "Not specified")}
      </p>
    </div>

    <button class="btn" onclick="showView('analyzer')">Analyze Another Project</button>
  `;

  showView("results");
}

async function generate(event) {
  event.preventDefault();

  const problemStatement = document.getElementById("p_prob").value.trim();

  if (problemStatement.length < 5) {
    alert("Please enter a project statement of at least 5 characters.");
    return;
  }

  const submitButton = event.submitter;
  const originalText = submitButton?.innerText;

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerText = "Analyzing...";
  }

  try {
    const response = await fetch(`${API_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        problem_statement: problemStatement,
        skill_level: document.getElementById("p_skill").value,
        budget: document.getElementById("p_budg").value,
        hardware: document.getElementById("p_hard").value
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const detail = typeof data.detail === "string"
        ? data.detail
        : JSON.stringify(data.detail || data);

      throw new Error(detail || `API request failed (${response.status})`);
    }

    renderRecommendations(data);
  } catch (error) {
    alert(
      "Could not get recommendations from the backend.\n\n" +
      error.message +
      "\n\nCheck that FastAPI is running at " + API_URL
    );
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerText = originalText || "Generate Technology Roadmap";
    }
  }
}

async function copyPrompt() {
  const text = document.getElementById("promptText")?.innerText || "";

  try {
    await navigator.clipboard.writeText(text);
    alert("Prompt copied.");
  } catch {
    alert("Clipboard access is unavailable in this browser.");
  }
}