import json
import os
import re
from pathlib import Path
from typing import Any, TypedDict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, END

app = FastAPI(title="TechPath Explorer API", version="1.0.0")

origins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "https://tech-path-explorer.vercel.app",
]

origins.extend(
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "*").split(",")
    if origin.strip()
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(origins)),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

DATA_FILE = Path(__file__).resolve().parent / "technology_data.json"


class ProjectRequest(BaseModel):
    problem_statement: str = Field(min_length=5, max_length=2000)
    skill_level: str = "Beginner"
    budget: str = "Not specified"
    hardware: str = "Not specified"


def load_dataset() -> dict[str, Any]:
    try:
        with DATA_FILE.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except FileNotFoundError as exc:
        raise RuntimeError(
            f"Dataset file not found: {DATA_FILE}"
        ) from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            "technology_data.json contains invalid JSON."
        ) from exc

    if not isinstance(data.get("technologies"), list):
        raise RuntimeError(
            "Dataset must contain a technologies array."
        )

    return data


class WorkflowState(TypedDict, total=False):
    request: dict[str, str]
    dataset: dict[str, Any]
    ranked: list[dict[str, Any]]
    recommendations: list[dict[str, Any]]
    ai_used: bool


def rank_technologies(state: WorkflowState) -> dict:
    project = state["request"]
    dataset = state["dataset"]

    query = " ".join([
        project["problem_statement"],
        project["skill_level"],
        project["budget"],
        project["hardware"],
    ]).lower()

    words = set(re.findall(r"[a-z0-9+#.-]+", query))
    ranked = []

    for tech in dataset["technologies"]:
        searchable = " ".join([
            str(tech.get("name", "")),
            str(tech.get("category", "")),
            str(tech.get("description", "")),
            " ".join(map(str, tech.get("capabilities", []))),
            " ".join(map(str, tech.get("tags", []))),
        ]).lower()

        tech_words = set(re.findall(r"[a-z0-9+#.-]+", searchable))
        overlap = words & tech_words

        score = min(95, 35 + len(overlap) * 8)
        reasons = []
        warnings = []

        if overlap:
            reasons.append(
                "Matches project terms or technology capabilities: "
                + ", ".join(sorted(overlap)[:5])
            )
        else:
            reasons.append(
                "Possible option from the dataset; check its fit "
                "for your specific project."
            )

        hardware_data = tech.get("hardware", {})
        deployment = tech.get("deployment", {})
        pricing = tech.get("pricing", {})
        verification = tech.get("verification", {})

        hardware_text = project["hardware"].lower()
        cloud_requested = any(
            term in hardware_text
            for term in ("cloud", "online", "hosted", "no local")
        )

        if cloud_requested and deployment.get("cloud_available") is True:
            score += 5
            reasons.append(
                "The dataset indicates cloud deployment is available."
            )
        elif cloud_requested and deployment.get("cloud_available") is False:
            score -= 15
            warnings.append(
                "The dataset does not indicate cloud deployment is available."
            )

        budget_text = project["budget"].lower()

        if any(term in budget_text for term in ("free", "₹0", "zero")):
            if pricing.get("free_tier_available") is True:
                score += 5
                reasons.append(
                    "A free tier is listed in the dataset; check its limits."
                )
            elif pricing.get("free_tier_available") is False:
                score -= 10
                warnings.append(
                    "The dataset does not indicate a free tier is available."
                )
            else:
                warnings.append(
                    "Free-tier availability is not confirmed in the dataset."
                )

        if hardware_data.get("minimum_ram_gb") is None:
            warnings.append("Minimum RAM requirement is not specified.")

        if pricing.get("paid_starting_from") is None:
            warnings.append("A starting paid price is not specified.")

        if verification.get("status") != "verified":
            warnings.append(
                "Dataset verification status is not fully verified."
            )

        ranked.append({
            "tech": tech,
            "score": max(0, min(100, score)),
            "reasons": reasons,
            "warnings": warnings,
        })

    ranked.sort(key=lambda item: item["score"], reverse=True)
    return {"ranked": ranked[:5]}


def generate_fallback_reasons(state: WorkflowState) -> dict:
    recommendations = []

    for item in state["ranked"]:
        tech = item["tech"]
        pricing = tech.get("pricing", {})
        verification = tech.get("verification", {})

        recommendations.append({
            "id": tech.get("id", ""),
            "name": tech.get("name", "Unknown technology"),
            "category": tech.get("category", "Technology"),
            "score": item["score"],
            "reasons": item["reasons"],
            "warnings": item["warnings"],
            "advantages": tech.get("advantages", []),
            "limitations": tech.get("limitations", []),
            "pricing": {
                "model": pricing.get("model"),
                "budget_tier": pricing.get("budget_tier"),
                "paid_starting_from": pricing.get("paid_starting_from"),
            },
            "sources": tech.get("sources", []),
            "verification": {
                "overall_notes": verification.get(
                    "overall_notes",
                    "Check the source details before use."
                )
            },
        })

    return {
        "recommendations": recommendations,
        "ai_used": False,
    }


def generate_ai_reasons(state: WorkflowState) -> dict:
    token = os.getenv("HF_TOKEN")

    if not token:
        return generate_fallback_reasons(state)

    try:
        from langchain_openai import ChatOpenAI

        model = ChatOpenAI(
            model=os.getenv(
                "HF_MODEL",
                "google/gemma-4-E2B-it",
            ),
            api_key=token,
            base_url="https://router.huggingface.co/v1",
            temperature=0,
            timeout=20,
            max_retries=0,
        )

        candidates = [
            {
                "id": item["tech"].get("id"),
                "name": item["tech"].get("name"),
                "category": item["tech"].get("category"),
                "description": item["tech"].get("description"),
                "capabilities": item["tech"].get("capabilities", []),
                "score": item["score"],
            }
            for item in state["ranked"]
        ]

        prompt = f"""
You are the technology matching agent for TechPath Explorer.

Project requirements:
{json.dumps(state["request"], ensure_ascii=False)}

Available dataset candidates:
{json.dumps(candidates, ensure_ascii=False)}

Return only a JSON object:
{{
  "reasons": {{
    "technology-id": ["short project-specific reason"]
  }}
}}

Use only candidate IDs. Base reasons only on supplied information.
Do not invent prices, licensing, hardware requirements, or capabilities.
Do not change scores or recommend technologies outside the list.
"""

        response = model.invoke(prompt)
        content = response.content

        if isinstance(content, list):
            content = "".join(
                part.get("text", "")
                for part in content
                if isinstance(part, dict)
            )

        text = str(content).strip()
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

        parsed = json.loads(text)
        reason_map = parsed.get("reasons", {})

        if not isinstance(reason_map, dict):
            raise ValueError("Invalid AI response format.")

        result = generate_fallback_reasons(state)

        for recommendation in result["recommendations"]:
            candidate_reasons = reason_map.get(recommendation["id"])

            if (
                isinstance(candidate_reasons, list)
                and candidate_reasons
                and all(
                    isinstance(reason, str)
                    for reason in candidate_reasons
                )
            ):
                recommendation["reasons"] = candidate_reasons[:4]

        result["ai_used"] = True
        return result

    except Exception as exc:
        print("Hosted AI error type:", type(exc).__name__)
        print("Hosted AI error details:", getattr(exc, "body", None))

        return generate_fallback_reasons(state)


def build_graph():
    workflow = StateGraph(WorkflowState)

    workflow.add_node("rank", rank_technologies)
    workflow.add_node("explain", generate_ai_reasons)

    workflow.set_entry_point("rank")
    workflow.add_edge("rank", "explain")
    workflow.add_edge("explain", END)

    return workflow.compile()


graph = build_graph()


@app.get("/health")
def health_check():
    try:
        dataset = load_dataset()
        return {
            "status": "ok",
            "message": "TechPath Explorer backend is running",
            "dataset_loaded": True,
            "technology_count": len(dataset["technologies"]),
            "dataset_version": dataset.get("metadata", {}).get(
                "dataset_version", "unknown"
            ),
            "model_configured": bool(os.getenv("HF_TOKEN")),
        }
    except Exception:
        return {
            "status": "degraded",
            "message": "Backend is running, but the dataset could not load.",
            "dataset_loaded": False,
            "model_configured": bool(os.getenv("HF_TOKEN")),
        }


@app.post("/analyze")
def analyze_project(project: ProjectRequest):
    try:
        dataset = load_dataset()

        state = graph.invoke({
            "request": project.model_dump(),
            "dataset": dataset,
        })

        return {
            "request": project.model_dump(),
            "recommendations": state["recommendations"],
            "dataset_version": dataset.get("metadata", {}).get(
                "dataset_version", "unknown"
            ),
            "ai_used": state.get("ai_used", False),
        }

    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        print(f"Analysis error: {exc!r}")
        raise HTTPException(
            status_code=500,
            detail="Analysis failed. Check backend logs.",
        ) from exc