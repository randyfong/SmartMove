# SmartMove: Autonomous AI Relocation & Auditable Booking Engine

SmartMove is an autonomous, consumer-focused AI Agent designed to solve relocation and apartment hunting. The platform automates listing search, reviews local amenities/walkability, secures calendar holds, and logs git-native AI trace checkpoints to ensure absolute transparency and control over the agent's actions.

This implementation plan adapts the original node-centric design to use the existing **Python 3.9** environment with **FastAPI** and **uvicorn**, which are already installed on the system, paired with a stunning, high-fidelity **Glassmorphic HTML/CSS/JS** client-side dashboard.

---

## User Review Required

> [!IMPORTANT]
> **API Key Setup & Fallback Mechanics**
> To ensure the project runs smoothly and reliably during hackathon demonstrations, the system includes a **High-Fidelity Mock Toggle** in the UI. If real `GEMINI_API_KEY` or `APIFY_API_TOKEN` are not supplied, the app will dynamically generate detailed, realistic listings and trace reasoning logs. When keys are supplied in the `.env` or Settings Panel, the app executes live API requests.

> [!NOTE]
> **Git-Native Trace Logger (entire.io simulation)**
> Since the `entire` CLI is not globally installed, we will build a custom, git-native auditing client in the FastAPI backend that logs trace files directly inside the repository under `.entire/checkpoints/` and auto-commits/pushes them to a dedicated git checkpoint branch (`entire/checkpoints/v1`). This preserves the absolute auditable core value.

---

## Open Questions

None at this time. The architecture is fully resolved.

---

## Proposed Changes

We will build the application in the `/Users/randyfong/Antigravity/SmartMove` directory.

### Backend Application

#### [NEW] [server.py](file:///Users/randyfong/Antigravity/SmartMove/server.py)
A lightweight Python FastAPI application that serves the frontend files and provides REST API endpoints:
- `POST /api/settings/save` - Save API credentials to the local `.env` file.
- `GET /api/settings/status` - Returns which API integrations are active/missing.
- `POST /api/agent/run` - Runs the relocation search pipeline (crawls mock/real data, evaluates constraints via Gemini, writes git-native checkpoints).
- `POST /api/agent/approve` - Simulates Scalekit-delegate Gmail/Calendar scheduling.
- `GET /api/agent/checkpoints` - Pulls git history checkpoints to render the interactive visual decision tree.

#### [NEW] [agent_core.py](file:///Users/randyfong/Antigravity/SmartMove/agent_core.py)
The core logic for the AI Agent:
- Interfaces with the Gemini API to filter listings based on complex user requests (budget, proximity to gyms/yoga, walkability, grocery density).
- Implements the Git-native Trace Logger that writes step-by-step reasoning checkpoints to `.entire/checkpoints/` and commits them to Git.

---

### Frontend Dashboard

#### [NEW] [public/index.html](file:///Users/randyfong/Antigravity/SmartMove/public/index.html)
A stunning Glassmorphic interface with:
- Outfit typography, vibrant HSL gradients, and dark mode theme.
- Input configuration panel (location, budget, amenities, target commute).
- Real-time pipeline status updates (Scraping -> Auditing -> Booking).
- Interactive tree visualizer for checking why listings were approved/rejected.
- Git audit checkpoint history table.

#### [NEW] [public/style.css](file:///Users/randyfong/Antigravity/SmartMove/public/style.css)
A custom stylesheet built from scratch featuring:
- CURATED harmonious colors: sleek dark slate background, glowing neon purple/cyan accents, and frosty glass borders.
- Smooth scale-up and fade-in animations for lists, progress pipelines, and modals.
- Responsive, screen-respectful bento grid container layout.

#### [NEW] [public/app.js](file:///Users/randyfong/Antigravity/SmartMove/public/app.js)
Frontend application logic:
- Handles Form inputs and saves API settings asynchronously.
- Manages pipeline execution state with real-time UI logs.
- Renders the interactive visual decision tree and audit logs.

---

### Configuration

#### [MODIFY] [.env](file:///Users/randyfong/Antigravity/SmartMove/.env)
Allows writing and loading `GEMINI_API_KEY`, `APIFY_API_TOKEN`, and `SCALEKIT_MOCK_MODE`.

---

## Verification Plan

### Automated Tests
1. **Backend Verification:**
   Run the FastAPI dev server:
   ```bash
   python3 -m uvicorn server:app --reload
   ```
2. Test API endpoints via cURL or local scripts to verify correct JSON response structure and mock data generation.

### Manual Verification
1. Open the dashboard in browser at `http://127.0.0.1:8000`.
2. Input relocation requirements (e.g. "Apartment in SF under $3500 near a climbing gym").
3. Inspect the live pipeline transition from Listing Scraping to AI Tracing.
4. Click on any rejected/approved listing in the visual decision tree to audit the agent's logic.
5. Click "Approve Relocation Outreach" to see calendar slot verification.
