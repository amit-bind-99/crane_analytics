# YZ Bay — Crane LT Wheel Failure Reduction Dashboard

A **Flask-based predictive maintenance dashboard** that analyses crane wheel failures in relation to rail hardness data, forecasts future failures using machine learning, and recommends maintenance actions.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [How It Works](#how-it-works)
   - [Data Layer](#data-layer)
   - [Analytics Engine](#analytics-engine)
   - [API Endpoints](#api-endpoints)
   - [Frontend Dashboard](#frontend-dashboard)
4. [Local Development](#local-development)
   - [Without Docker](#without-docker)
   - [With Docker Compose](#with-docker-compose)
5. [Deploy to Railway](#deploy-to-railway)
6. [Using Real Excel Data](#using-real-excel-data)
7. [Environment Variables](#environment-variables)
8. [Tech Stack](#tech-stack)

---

## Project Overview

The dashboard targets the **YZ Bay** facility and tracks two overhead travelling cranes — **LT WEST** and **LT EAST**. It correlates wheel replacement frequency with rail hardness readings (Brinell Hardness / HB) to:

- Identify which rail sections are causing accelerated wheel wear
- Forecast how many wheel replacements are expected in the next 1–12 months
- Recommend maintenance priority (Normal → Medium → High → Critical)

---

## Project Structure

```
crane_analytics/
├── app.py                  # Flask application — routes, data loading, ML predictions
├── requirements.txt        # Python dependencies
│
├── templates/
│   └── index.html          # Single-page dashboard (Jinja2 template)
│
├── static/
│   ├── script.js           # Chart.js chart rendering and API calls
│   └── style.css           # Dashboard styling (CSS variables, responsive grid)
│
├── data/                   # Drop your Excel file here (see below)
│   └── LT Wheel replacement data.xlsx   ← optional; mock data used if absent
│
├── Dockerfile              # Multi-stage Docker image (builder + slim runtime)
├── docker-compose.yml      # Local development stack
├── .dockerignore           # Files excluded from the Docker build context
├── railway.toml            # Railway deployment configuration
├── .env.example            # Environment variable template
└── README.md               # This file
```

---

## How It Works

### Data Layer

`app.py` calls `load_data()` at startup:

1. If `data/LT Wheel replacement data.xlsx` exists it reads three sheets:
   - **LT wheel replacement data** — date, crane, equipment, position, remarks
   - **Rail Hardness data** — HB values per section (North & South sides)
   - **Rail Replacement data** — logged rail replacement events
2. If the file is missing or corrupt, three `generate_mock_*()` functions produce realistic synthetic data so the dashboard is always runnable.

### Analytics Engine

| Function | Description |
|---|---|
| `get_risk_class(hb)` | Classifies HB into Normal / Medium / High / Critical |
| `/api/predict/<months>` | Fits both a **Linear** and **Polynomial (degree 2)** regression on cumulative failures over time, then multiplies by a *hardness risk factor* derived from average rail HB |
| `/api/scatter-hardness-failures` | Simulates a per-section failure count proportional to average HB for the scatter chart |
| `/api/hardness-correlation` | Computes recommended action per section based on risk class |
| `/api/failure-distribution` | Breaks down failures by crane, quarter, day-of-week, and derived severity |

The **hardness risk factor** is calculated as:

$$\text{risk factor} = \max\left(0,\ \frac{\overline{HB} - 300}{100}\right)$$

A value of 0 = normal operation; 1.0 = hardness is 100 HB above the threshold.

### API Endpoints

| Method | Path | Returns |
|---|---|---|
| GET | `/` | HTML dashboard |
| GET | `/api/status` | Data source status and record counts |
| GET | `/api/summary` | KPIs, monthly trend, hardness stats |
| GET | `/api/hardness-data` | Per-section HB values for chart |
| GET | `/api/hardness-heatmap` | Section × side risk classification |
| GET | `/api/hardness-correlation` | Risk zones and recommended actions |
| GET | `/api/wheel-failure-analysis` | Equipment, position, remark breakdowns |
| GET | `/api/failure-distribution` | Crane, quarter, DoW, severity |
| GET | `/api/rail-replacement` | Rail replacement log |
| GET | `/api/predict/<int:months>` | ML failure forecast for N months |
| GET | `/api/scatter-hardness-failures` | Hardness vs estimated failures (scatter) |

### Frontend Dashboard

`static/script.js` calls all APIs in parallel on load and renders 12 Chart.js charts plus three data tables:

| Chart | Type | Data source |
|---|---|---|
| Monthly Wheel Replacement Trend | Line | `/api/summary` |
| Failure by Wheel Position | Doughnut | `/api/wheel-failure-analysis` |
| Rail Hardness Distribution | Grouped bar + threshold line | `/api/hardness-data` |
| Hardness Risk Gauge | Half-doughnut | `/api/hardness-correlation` |
| Hardness vs Failure Risk | Scatter | `/api/scatter-hardness-failures` |
| Top Failed Equipment | Horizontal bar | `/api/wheel-failure-analysis` |
| Failure Distribution by Crane | Pie | `/api/failure-distribution` |
| Failure Severity Breakdown | Polar area | `/api/failure-distribution` |
| Failures by Day of Week | Bar | `/api/failure-distribution` |
| Failure Forecast | Dual line (linear + polynomial) | `/api/predict/<N>` |
| Rail Hardness Table | HTML table | `/api/hardness-data` |
| Risk Assessment | Card grid | `/api/hardness-correlation` |
| Rail Replacement Log | Timeline | `/api/rail-replacement` |

The **Forecast horizon slider** (1–12 months) re-fetches `/api/predict/<N>` on change and updates the prediction panel and forecast chart in real time.

---

## Local Development

### Without Docker

```bash
# 1. Clone / navigate to project
cd crane_analytics

# 2. Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the development server
python app.py
```

Open **http://localhost:5000** in your browser.

### With Docker Compose

```bash
# Build and start
docker compose up --build

# Run in background
docker compose up --build -d

# Stop
docker compose down
```

The `data/` folder is mounted as a volume — drop your Excel file there without rebuilding the image.

---

## Deploy to Railway

### Step-by-step

1. **Push your code to GitHub**

   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin https://github.com/<your-username>/crane_analytics.git
   git push -u origin main
   ```

2. **Create a Railway project**

   - Go to [railway.app](https://railway.app) and sign in with GitHub
   - Click **New Project → Deploy from GitHub repo**
   - Select your `crane_analytics` repository

3. **Railway auto-detects the Dockerfile** and builds it. No manual configuration needed.

4. **Add environment variables** (optional)

   In the Railway dashboard → your service → **Variables**:

   | Key | Value |
   |---|---|
   | `FLASK_ENV` | `production` |

   (`PORT` is set automatically by Railway.)

5. **Generate a public domain**

   Railway dashboard → your service → **Settings → Networking → Generate Domain**

   Your app will be live at `https://<your-app>.up.railway.app`.

### Updating the deployment

```bash
git add .
git commit -m "your change"
git push
```

Railway automatically rebuilds and redeploys on every push to `main`.

### Adding real Excel data on Railway

Because Railway doesn't support persistent disk by default on the free tier, the recommended approach is to **commit the Excel file** to a private GitHub repository, or use Railway's persistent volume (paid) mounted at `/app/data`.

---

## Using Real Excel Data

Place your Excel file at `data/LT Wheel replacement data.xlsx`. It must contain these sheets:

| Sheet name | Required columns |
|---|---|
| `LT wheel replacement data` | `Date`, `Crane`, `Equipment`, `Position`, `Remarks` |
| `Rail Hardness data` | Columns 3–14 = sections 21-22 through 32-33; row 1 = North values, row 2 = South values |
| `Rail Replacement data` | `Date`, `Section`, `Side`, `Qty_Pieces`, `Reason` |

If any sheet is missing or the file is absent, the app silently falls back to mock data — the badge in the header shows **"Demo Mock Data"** vs **"Live Excel Data"**.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Port the server listens on (auto-set by Railway) |
| `FLASK_ENV` | `production` | Set to `development` to enable Flask debug mode |

Copy `.env.example` to `.env` for local overrides.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | Flask 3.0 |
| Data processing | pandas, NumPy |
| Machine learning | scikit-learn (LinearRegression, PolynomialFeatures) |
| Excel parsing | openpyxl |
| WSGI server | Gunicorn |
| Frontend charting | Chart.js 4.4 |
| Containerisation | Docker (multi-stage build) |
| Deployment | Railway |
