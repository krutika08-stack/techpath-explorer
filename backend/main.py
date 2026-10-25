from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="TechPath Explorer API")


class ProjectRequest(BaseModel):
    problem_statement: str
    skill_level: str = "Beginner"
    budget: str = "Not specified"
    hardware: str = "Not specified"


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "TechPath Explorer backend is running"
    }


@app.post("/analyze")
def analyze_project(project: ProjectRequest):
    return {
        "problem_statement": project.problem_statement,
        "skill_level": project.skill_level,
        "budget": project.budget,
        "hardware": project.hardware,
        "message": "Project details received successfully"
    }