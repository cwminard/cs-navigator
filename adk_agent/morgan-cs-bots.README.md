# CS Tutor + Scholarship/Internship Bots

Two standalone ADK agents for university CS students:

- **`scholarship_internship_bot/`** — finds current scholarships and internships via Tavily web search. Groups results by deadline urgency (URGENT / UPCOMING / OPEN), with days-remaining math and verified apply links.
- **`tutor/`** — flat-architecture tutor covering CS and Math, with six specialist modes (CS Tutor, Math Tutor, Quiz Master, Code Debugger, Problem Solver, Syllabus Advisor). Canvas LMS integration for course-aware answers.
- **`faculty/`** — faculty advising agent for required form guidance, compliance checks, and guided internship form completion in chat.

Both agents are flat `LlmAgent`s (no sub-agent tree), so latency is bounded by one LLM round-trip per turn plus tool time.

## Quick start

```bash
git clone <this-repo>
cd cs-tutor-scholarship-bots

# Install
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# Configure
cp .env.example .env
# edit .env - see "Setup" below for what each var does

# Run
adk run scholarship_internship_bot
adk run tutor
```

## Setup

### Required for both bots

- **Google Cloud project** with Vertex AI API enabled.
- **ADC auth**: `gcloud auth application-default login` with an account that has `Vertex AI User` role on the project.
- **.env** with `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GOOGLE_GENAI_USE_VERTEXAI=TRUE`.

### Scholarship bot only

- **Tavily API key** (free tier = 1000 searches/month): sign up at https://app.tavily.com and paste into `.env` as `TAVILY_API_KEY`.

### Tutor bot only

- **Canvas personal access token**: Canvas → Account → Settings → New Access Token. Paste into `.env` as `CANVAS_API_TOKEN`.
- **Canvas base URL**: e.g. `https://morganstate.instructure.com` (override the default `canvas.instructure.com` in `.env`).
- *(Optional)* `VERTEX_AI_DATASTORE_ID` and `SYLLABI_DATASTORE_ID` if you have Vertex AI Search datastores for course materials and syllabi. Leave blank to skip; course-material features degrade gracefully.
- *(Optional)* `GCS_BUCKET` if you want to sync Canvas files to GCS for search indexing.

## Running

```bash
# Interactive terminal chat
adk run scholarship_internship_bot
adk run tutor

# Browser UI
adk web
# then pick an agent in the dropdown
```

## Tests

```bash
pytest scholarship_internship_bot/tools/test_web_search.py -v
```

Three unit tests cover the Tavily search tool: happy path, missing API key, and network/API exceptions.

## Notes and caveats

- **`VertexAiSearchTool` is NOT wired into tutor** because Vertex rejects mixing function tools with search tools on one `LlmAgent`. SYLLABUS ADVISOR mode currently falls back to general knowledge. To restore syllabus/course-material search, wrap Vertex AI Search as a function tool (same pattern as `web_search`), or split into a dedicated search sub-agent called via `AgentTool`.
- **Canvas integration uses a single shared access token** (set in `.env`). Fine for single-user dev. For multi-tenant deployments, replace with per-user auth (e.g. LDAP + per-student token storage) before shipping.
- **Thinking mode stays on** for `gemini-2.5-flash`. Disabling via `generate_content_config(thinking_config=ThinkingConfig(thinking_budget=0))` requires direct Gemini API auth (`GOOGLE_API_KEY`), not Vertex. If you have an API key and want the speed win, add `generate_content_config=genai_types.GenerateContentConfig(thinking_config=genai_types.ThinkingConfig(thinking_budget=0))` to the `LlmAgent` constructor.
- **Model choice**: `gemini-2.5-flash`. `gemini-2.5-flash-lite` is faster but has a function-call name-resolution bug (emits "run" instead of the tool's real name) observed in this stack; `gemini-2.0-flash` may not be enabled in every project.

## Project layout

```
cs-tutor-scholarship-bots/
├── pyproject.toml
├── README.md
├── .env.example
├── .gitignore
├── scholarship_internship_bot/
│   ├── __init__.py
│   ├── agent.py                # flat LlmAgent, Tavily web_search tool
│   └── tools/
│       ├── __init__.py
│       ├── web_search.py       # Tavily-backed function tool
│       └── test_web_search.py  # 3 unit tests
└── tutor/
    ├── __init__.py
    ├── agent.py                # flat LlmAgent, six-mode instruction, 11 tools
    ├── canvas/                 # Canvas LMS client, sync, datastore mapping
    ├── student/                # student profile + progress tracker (Firestore)
    └── tools/                  # canvas_tools, search_tools, exam_prep_tools, progress_tools
```
