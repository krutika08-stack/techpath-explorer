from fastapi import FastAPI

app = FastAPI(title="TechPath Explorer API")


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "TechPath Explorer backend is running"
    }


@app.post("/analyze")
def analyze_project(project: dict):
    problem = project.get("problem_statement", "")
    skill_level = project.get("skill_level", "Beginner")
    budget = project.get("budget", "Not specified")
    hardware = project.get("hardware", "Not specified")

    return {
        "problem_statement": problem,
        "skill_level": skill_level,
        "budget": budget,
        "hardware": hardware,
        "message": "Project details received successfully"
    }