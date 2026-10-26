# TechPath Explorer — Architecture

> **Status:** Architecture and API test target for an active hackathon project. This document distinguishes inspected implementation from planned behavior. It does not assert that planned integrations are already implemented.

## 1. Purpose and target users

TechPath Explorer helps engineering students choose technologies for a project by considering the problem they want to solve, skill level, budget, available hardware, timeline, and expected outcome. The intended result is a set of technology recommendations with explanations, trade-offs, pricing context, and verification notes.

Primary users are students and hackathon participants who need beginner-readable guidance. Recommendations should explain constraints and uncertainty rather than present a heuristic score as a probability or guarantee.

## 2. High-level architecture and responsibilities

### Planned architecture

- **Frontend — HTML, CSS, JavaScript:** collects the six project inputs, sends requests to the API, and renders results and errors. Deployment target: Vercel (planned; URL not confirmed here).
- **Backend — Python/FastAPI:** validates requests, loads technology data, evaluates constraints, coordinates any model-assisted analysis, validates the response, and returns JSON. Deployment target: Render (planned; URL not confirmed here).
- **Dataset — `backend/technology_data.json`:** researched technology records, capabilities, pricing, hardware requirements, limitations, sources, and verification metadata.
- **Hosted model — provider/model not yet confirmed:** if selected and configured, supports recommendation reasoning. Provider credentials must remain on the server.
- **Tests — `tests/test_api.py`:** API contract tests using pytest and FastAPI TestClient when compatible dependencies are available.

### Confirmed from inspected backend code

`backend/main.py` defines a FastAPI application, `GET /health`, and a basic `POST /analyze`. The current `/analyze` echoes four request fields and returns a message. The inspected code does not define `GET /technologies`, load the dataset, or call a model.

## 3. Repository structure

```text
techpath-explorer/
├── backend/
│   ├── main.py                 # Existing FastAPI app (backend-owner file)
│   ├── requirements.txt        # Existing backend dependencies
│   └── technology_data.json    # Researched technology dataset
├── frontend/                   # HTML/CSS/JavaScript; frontend-owner files
├── docs/
│   └── architecture.md         # This document
├── tests/
│   └── test_api.py             # API contract tests
└── README.md
```

This is a simplified view of the repository. Other files may exist.

## 4. Request lifecycle

### Planned successful analysis flow

1. The student fills in the frontend form: problem statement, skill level, budget, hardware, timeline, and expected outcome.
2. The frontend sends a JSON `POST /analyze` request to the configured backend API.
3. FastAPI validates the request. Invalid input should return HTTP 422 with a non-sensitive `detail`.
4. The backend loads or accesses the researched dataset and its version.
5. The workflow retrieves relevant technology records and evaluates fit against the request constraints.
6. If a hosted model is configured and available, the backend may use it to help produce explanations. The implementation must report what actually ran.
7. The backend validates the response shape, score bounds, and required fields.
8. The API returns `request`, `recommendations`, `dataset_version`, and `analysis`. The frontend renders the results and any warnings.

Steps 4–8 are target behavior, not confirmed behavior in the inspected `main.py`.

## 5. Dataset schema and retrieval

The dataset path is `backend/technology_data.json`. The inspected beginning of the file shows a root `metadata` object containing `dataset_version`, `last_updated`, `compiled_by`, `currency_note`, and a `status_legend`, followed by a `technologies` array. Technology records include fields such as `id`, `name`, `type`, `category`, `purpose`, `capabilities`, `advantages`, `limitations`, `skill_level`, `setup_time_hours`, `hardware`, `integration`, `pricing`, `sources`, and `verification`.

The researcher owns this dataset. The API should read the existing file rather than create a second dataset. Retrieval should validate that the root metadata and technologies array exist and that individual records have the fields needed by the recommendation logic. A missing or malformed file must not result in a misleading successful response. The precise status code and fallback policy for dataset errors need agreement with the backend developer; do not expose filesystem paths or sensitive details in the public error message.

For `GET /technologies`, the target response shape is:

```json
{
  "dataset_version": "0.1.0",
  "technologies": []
}
```

The `technologies` value above is illustrative, not a claim that the live endpoint currently returns an empty list. The version should be read from `metadata.dataset_version`; the array should be read from the root `technologies` field. The endpoint is not present in the inspected backend implementation.

## 6. Agentic workflow

The project plan describes a workflow with these responsibilities. The word “agentic” should only be used for implemented behavior if the code actually executes the steps and coordinates their outputs; a list of design stages alone does not establish that a multi-agent system exists.

| Planned step | Responsibility | Inputs | Outputs | Tools / dependencies |
|---|---|---|---|---|
| 1. Project understanding | Normalize the user's goal and constraints | Six request fields | Validated/normalized project brief | Pydantic/FastAPI validation; deterministic code |
| 2. Technology retrieval | Find candidate records in the existing dataset | Project brief and dataset | Candidate technology records | JSON dataset; retrieval/filter code |
| 3. Constraint evaluation | Compare candidates with skill, budget, hardware, timeline, and outcome | Candidates and constraints | Fit signals, warnings, exclusions | Deterministic rules; dataset metadata |
| 4. Model-assisted recommendation | Generate or refine human-readable explanations if a hosted model is configured | Brief, candidate facts, fit signals | Draft recommendations/explanations | Hosted inference provider, if confirmed and available |
| 5. Response validation | Check schema, scores, sources, and truthful execution metadata | Draft response and source records | Validated API response or controlled error | Pydantic/schema validation and application checks |

For each request, `analysis` should identify the method actually used, the actual model ID only if a model ran, which workflow steps executed, and known limitations. Do not label a planned step as executed when it was skipped.

## 7. Model integration: planned vs confirmed

**Planned:** use an eligible hosted open-weight/open-source model with cloud inference.

**Not confirmed in inspected code:** provider, model identifier, credentials/configuration, inference client, retry policy, and fallback behavior. The inspected `backend/main.py` contains no model integration. Do not invent a model name or imply model-generated recommendations are currently available.

Before integration, the team should decide how the provider/model is selected, how timeouts and rate limits are handled, whether deterministic dataset-only recommendations are a safe fallback, and what metadata is returned when fallback is used. External provider calls should be wrapped so tests can mock them and never need real credentials or internet access.

## 8. API endpoint contracts

### `GET /health`

**Current known behavior:** the inspected implementation returns HTTP 200 with:

```json
{
  "status": "ok",
  "message": "TechPath Explorer backend is running"
}
```

Tests should check HTTP 200 and these fields/values.

### `GET /technologies`

**Target behavior:** return the dataset version and the technologies array, with the response shape:

```json
{
  "dataset_version": "0.1.0",
  "technologies": []
}
```

The version shown is an example from the inspected dataset metadata; the response must use the actual loaded dataset version. This route is not implemented in the inspected `backend/main.py`.

### `POST /analyze`

**Target request:**

```json
{
  "problem_statement": "Build a chatbot for summarising text.",
  "skill_level": "Beginner",
  "budget": "Free / ₹0",
  "hardware": "Cloud computing only",
  "timeline": "1 week",
  "expected_outcome": "Working prototype"
}
```

- `problem_statement` is required and must contain at least five characters after trimming whitespace.
- `skill_level` must be `Beginner`, `Intermediate`, or `Advanced`.
- `budget`, `hardware`, `timeline`, and `expected_outcome` must be strings.
- The frontend should send all six fields.
- For backward compatibility, omitted optional fields must receive documented defaults. The shared contract does not specify defaults for every field. **Proposed values for team confirmation:** preserve current defaults `skill_level="Beginner"`, `budget="Not specified"`, `hardware="Not specified"`; use `"Not specified"` for omitted `timeline` and `expected_outcome`. These are proposals, not confirmed implementation behavior.

**Target successful response:**

```json
{
  "request": {
    "problem_statement": "Build a chatbot for summarising text.",
    "skill_level": "Beginner",
    "budget": "Free / ₹0",
    "hardware": "Cloud computing only",
    "timeline": "1 week",
    "expected_outcome": "Working prototype"
  },
  "recommendations": [],
  "dataset_version": "0.1.0",
  "analysis": {
    "method": "must describe the method actually used",
    "model": null,
    "workflow_steps": [],
    "limitations": []
  }
}
```

This illustrates required top-level keys and metadata intent. The empty recommendations list and example metadata are illustrative, not a prediction of an actual response.

Each recommendation must contain `id`, `name`, `category`, `score`, `reasons`, `warnings`, `advantages`, `limitations`, `pricing`, and `verification`. `score` is a heuristic fit score from 0 to 100, not a probability. `pricing` must contain `model`, `budget_tier`, `paid_starting_from`, `currency`, `pricing_notes`, and `sources`. Each source contains `label` and `url`. `verification` must contain `status` and `overall_notes`.

### Errors

- **422:** request validation failure, including missing/invalid problem statement or unsupported skill level.
- **503:** required service is unavailable and no safe fallback is possible.
- **500:** unexpected internal failure. Public messages must not expose secrets, stack traces, local paths, or provider internals.
- Error bodies should contain a clear, non-sensitive `detail` message.

The exact policy for dataset errors and model failures must be implemented consistently with this contract and agreed by the backend owner.

## 9. Response validation, scoring, constraints, and fallback

Before returning success, the backend should validate required response keys and nested recommendation fields; ensure list fields are arrays of strings; ensure each source has a label and URL; ensure score is numeric and within 0–100; and ensure pricing and verification objects have their required fields.

Scoring should be described as a **heuristic fit score**, with factors and limitations documented. It must not be presented as a probability, measured accuracy, or guarantee. Constraint evaluation should consider the user's budget, hardware, skill level, timeline, and expected outcome, and explain any incompatibility through warnings or limitations.

An empty `recommendations` array is a valid result when no candidate can be recommended safely. It must not be silently replaced with fabricated recommendations. A deterministic dataset-only fallback may be used only if implemented and judged safe; otherwise a required-service failure should return 503. `analysis` must truthfully describe the actual path taken, including skipped workflow steps and limitations.

## 10. Error handling and status codes

| Status | Intended use | Public response |
|---|---|---|
| 200 | Successful health, technology listing, or analysis | Endpoint-specific JSON |
| 422 | Invalid request input | `detail` explains which input is invalid without internal details |
| 503 | Required external service unavailable and no safe fallback exists | Non-sensitive service-unavailable `detail` |
| 500 | Unexpected internal error | Generic non-sensitive `detail`; log technical detail privately |

The current inspected code relies on FastAPI/Pydantic defaults for basic request parsing. It does not yet implement all target validation or failure policies.

## 11. Security

- Store provider API keys only in server-side environment variables or an approved secret manager. Never commit secrets or put provider keys in frontend JavaScript.
- Keep local secret files out of version control; check `.gitignore` before committing.
- Configure CORS for the actual frontend origin(s) when the frontend/backend are deployed. Avoid permissive production origins unless the team has explicitly accepted the risk.
- Validate and normalize all user inputs. Avoid logging complete sensitive requests or secrets.
- Return clear but non-sensitive error messages. Do not return tracebacks, local paths, environment variables, access tokens, or provider response headers.
- Set reasonable request size and provider timeout limits when implementing inference.
- Treat dataset content and source URLs as data, not executable instructions. Validate URLs before rendering them as links.
- Use HTTPS for deployed services and review platform secret settings before deployment.

These are implementation recommendations; the inspected backend does not demonstrate all of them.

## 12. Testing approach and how to run tests

`tests/test_api.py` is intended to use pytest and FastAPI `TestClient`. Tests should be deterministic, independent, and offline. Any model/provider calls should be mocked; tests should not require an API key, paid service, internet access, or exact generated wording. Dataset tests should use temporary files or controlled dependency overrides where possible.

From the repository root, after pytest and a compatible HTTP client are installed in the development environment:

```powershell
python -m pytest -q
```

The inspected `backend/requirements.txt` lists only `fastapi` and `uvicorn`; it does not list `pytest` or `httpx`. Do not change that owned file as part of this task. If test dependencies are missing, report that fact and ask the team to decide where development dependencies should be declared.

Some target-contract tests are expected to fail against the currently inspected backend because `GET /technologies`, six-field normalization, recommendation responses, and model/fallback behavior are not implemented. Test outcomes must be reported only after actually running them.

## 13. Local development and deployment

### Local development

1. Create/activate a Python virtual environment.
2. Install the backend dependencies from `backend/requirements.txt`.
3. Run the API from the repository root with a command appropriate to the app import path, for example:

   ```powershell
   python -m uvicorn backend.main:app --reload
   ```

4. Check `GET /health` locally. The current implementation does not yet support all target endpoints.

The exact command should be verified against the team's environment and package layout.

### Deployment plan

- **Backend to Render:** configure the service to install the backend requirements and start Uvicorn with the correct import path. Configure secrets as environment variables. The actual service URL and deployment status have not been confirmed by this inspection.
- **Frontend to Vercel:** deploy the existing frontend and configure its API base URL to the confirmed backend URL using the project's chosen configuration method. Do not hard-code an invented deployment URL or secret in client code.
- Verify CORS, health checks, environment variables, and API behavior after deployment. No successful deployment is claimed by this document.

## 14. Known gaps and decisions awaiting confirmation

1. The inspected `backend/main.py` implements `GET /health` and a basic `POST /analyze`; it does not implement `GET /technologies`.
2. Current `ProjectRequest` has only four fields: `problem_statement`, `skill_level`, `budget`, and `hardware`. It lacks `timeline` and `expected_outcome`.
3. Current `/analyze` returns the submitted fields and a message, not the target normalized request, recommendations, dataset version, or analysis metadata.
4. Problem statement minimum length and allowed skill-level values are not enforced explicitly in the inspected code.
5. Dataset loading, retrieval, recommendation scoring, response validation, model integration, and fallback/error policies are not present in the inspected `main.py`.
6. The exact hosted model/provider and its eligibility have not been confirmed.
7. Defaults for omitted `timeline` and `expected_outcome` are not specified by the shared contract. Proposed values are documented in Section 8 and require team confirmation.
8. The dataset error status and the safe fallback policy require a backend-owner decision.
9. `pytest` and `httpx` are absent from the inspected `backend/requirements.txt`; their availability in the active environment must be checked.
10. Git branch instructions name `backend` as the base branch, but the branch list inspected during this task showed `feature/backend-api`, `feature/architecture`, `features/frontend`, and `main`, with no `backend` branch. Confirm the correct base branch with the team before creating `architecture-tests` or opening the PR.
11. Render/Vercel deployment URLs, model configuration, and end-to-end deployed behavior remain unverified.
