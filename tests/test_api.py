"""Contract tests for the TechPath Explorer FastAPI.

These tests describe the agreed target API contract. The currently inspected
backend is incomplete, so some target tests are expected to fail until the
backend owner implements the corresponding behavior.

Run from the repository root:
    python -m pytest -q

No real model/provider calls or network access should be needed.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)

ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = ROOT / "backend" / "technology_data.json"

VALID_REQUEST: dict[str, str] = {
    "problem_statement": "Build a chatbot for summarising text.",
    "skill_level": "Beginner",
    "budget": "Free / ₹0",
    "hardware": "Cloud computing only",
    "timeline": "1 week",
    "expected_outcome": "Working prototype",
}

RECOMMENDATION_FIELDS = {
    "id",
    "name",
    "category",
    "score",
    "reasons",
    "warnings",
    "advantages",
    "limitations",
    "pricing",
    "verification",
}
PRICING_FIELDS = {
    "model",
    "budget_tier",
    "paid_starting_from",
    "currency",
    "pricing_notes",
    "sources",
}
VERIFICATION_FIELDS = {"status", "overall_notes"}


def test_health_returns_expected_status_and_fields() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["message"] == "TechPath Explorer backend is running"


def test_cors_allows_frontend_analysis_requests() -> None:
    response = client.options(
        "/analyze",
        headers={
            "Origin": "https://tech-path-explorer.vercel.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] in {
        "*",
        "https://tech-path-explorer.vercel.app",
    }


def test_technologies_returns_dataset_version_and_array() -> None:
    """Target-contract test; currently expected to fail until route exists."""
    response = client.get("/technologies")

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body.get("dataset_version"), str)
    assert body["dataset_version"].strip()
    assert isinstance(body.get("technologies"), list)


def test_repository_dataset_has_metadata_version_and_technologies() -> None:
    """Validate the checked-in dataset without depending on the API route."""
    assert DATASET_PATH.is_file()
    data = json.loads(DATASET_PATH.read_text(encoding="utf-8"))

    assert isinstance(data, dict)
    assert isinstance(data.get("metadata"), dict)
    assert isinstance(data["metadata"].get("dataset_version"), str)
    assert data["metadata"]["dataset_version"].strip()
    assert isinstance(data.get("technologies"), list)

    for record in data["technologies"]:
        assert isinstance(record, dict)
        assert isinstance(record.get("id"), str)
        assert isinstance(record.get("name"), str)


def test_analyze_accepts_all_six_fields_and_returns_target_shape() -> None:
    """Target-contract test; currently expected to fail against the basic API."""
    response = client.post("/analyze", json=VALID_REQUEST)

    assert response.status_code == 200
    body = response.json()
    assert {"request", "recommendations", "dataset_version", "analysis"} <= body.keys()
    assert body["request"] == VALID_REQUEST
    assert isinstance(body["recommendations"], list)
    assert isinstance(body["dataset_version"], str)
    assert isinstance(body["analysis"], dict)


def test_analyze_applies_documented_defaults_when_optional_fields_are_omitted() -> None:
    """Proposed defaults for team confirmation; see docs/architecture.md."""
    response = client.post(
        "/analyze",
        json={"problem_statement": "Build a small study assistant."},
    )

    assert response.status_code == 200
    request = response.json()["request"]
    assert request["problem_statement"] == "Build a small study assistant."
    assert request["skill_level"] == "Beginner"
    assert request["budget"] == "Not specified"
    assert request["hardware"] == "Not specified"
    assert request["timeline"] == "Not specified"
    assert request["expected_outcome"] == "Not specified"


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"problem_statement": ""},
        {"problem_statement": "   "},
        {"problem_statement": "abcd"},
    ],
    ids=["missing", "empty", "whitespace-only", "too-short"],
)
def test_analyze_rejects_invalid_problem_statement(payload: dict[str, Any]) -> None:
    response = client.post("/analyze", json=payload)

    assert response.status_code == 422
    assert isinstance(response.json().get("detail"), (str, list))


@pytest.mark.parametrize("skill_level", ["Novice", "expert", "", "beginner"])
def test_analyze_rejects_unsupported_skill_level(skill_level: str) -> None:
    response = client.post(
        "/analyze",
        json={**VALID_REQUEST, "skill_level": skill_level},
    )

    assert response.status_code == 422
    assert "detail" in response.json()


@pytest.mark.parametrize("field", ["budget", "hardware", "timeline", "expected_outcome"])
def test_analyze_rejects_non_string_optional_fields(field: str) -> None:
    response = client.post("/analyze", json={**VALID_REQUEST, field: 123})

    assert response.status_code == 422
    assert "detail" in response.json()


def test_empty_recommendations_is_a_valid_success_result() -> None:
    """An empty list is allowed by the target contract."""
    response = client.post("/analyze", json=VALID_REQUEST)

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body["recommendations"], list)
    # This test does not require the list to be empty; it verifies that an
    # empty result, when returned, is accepted as a valid shape.
    if not body["recommendations"]:
        assert {"request", "dataset_version", "analysis"} <= body.keys()


def test_each_returned_recommendation_matches_contract() -> None:
    response = client.post("/analyze", json=VALID_REQUEST)

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body.get("recommendations"), list)

    for item in body["recommendations"]:
        assert RECOMMENDATION_FIELDS <= item.keys()
        assert isinstance(item["id"], str)
        assert isinstance(item["name"], str)
        assert isinstance(item["category"], str)
        assert isinstance(item["score"], (int, float))
        assert 0 <= item["score"] <= 100
        for field in ("reasons", "warnings", "advantages", "limitations"):
            assert isinstance(item[field], list)
            assert all(isinstance(value, str) for value in item[field])

        assert isinstance(item["pricing"], dict)
        assert PRICING_FIELDS <= item["pricing"].keys()
        assert isinstance(item["pricing"]["sources"], list)
        for source in item["pricing"]["sources"]:
            assert isinstance(source, dict)
            assert {"label", "url"} <= source.keys()
            assert isinstance(source["label"], str)
            assert isinstance(source["url"], str)

        assert isinstance(item["verification"], dict)
        assert VERIFICATION_FIELDS <= item["verification"].keys()


def test_analysis_metadata_is_truthful_and_has_required_fields() -> None:
    response = client.post("/analyze", json=VALID_REQUEST)

    assert response.status_code == 200
    analysis = response.json()["analysis"]
    assert isinstance(analysis.get("method"), str)
    assert "model" in analysis
    assert isinstance(analysis.get("workflow_steps"), list)
    assert isinstance(analysis.get("limitations"), list)


def test_model_failure_returns_safe_fallback_or_service_unavailable() -> None:
    """The backend should either safely fall back or return a controlled 503.

    This contract-level test does not mock a provider because the inspected
    backend currently exposes no provider dependency to override. Once the
    backend adds an injectable provider function, add a monkeypatch here to
    force a provider exception and assert the documented branch.
    """
    response = client.post("/analyze", json=VALID_REQUEST)

    # A normal success may use a safe deterministic fallback. If a required
    # provider is unavailable and no fallback exists, 503 is the target.
    assert response.status_code in (200, 503)
    if response.status_code == 503:
        assert isinstance(response.json().get("detail"), str)
        assert response.json()["detail"].strip()


def test_error_responses_do_not_expose_common_secret_markers() -> None:
    response = client.post(
        "/analyze",
        json={"problem_statement": "   ", "budget": "TOKEN_TEST_SECRET_123"},
    )

    if response.status_code >= 400:
        body = response.text
        for marker in (
            "TOKEN_TEST_SECRET_123",
            "hf_",
            "sk-",
            "Authorization:",
            "Traceback (most recent call last)",
        ):
            assert marker not in body