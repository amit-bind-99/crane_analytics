# YZ Bay — Crane LT Wheel Failure Reduction Dashboard

A **Flask-based predictive maintenance dashboard** that analyses crane wheel failures in relation to rail hardness data, forecasts future failures using machine learning, and recommends maintenance actions. The app now includes **user authentication**, **SQLite-backed Excel version history**, and **admin user management**.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [How It Works](#how-it-works)
   - [Data Layer](#data-layer)
   - [Authentication & Users](#authentication--users)
   - [Excel Version History](#excel-version-history)
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
9. [Database](#database)

---

## Project Overview

The dashboard targets the **YZ Bay** facility and tracks two overhead travelling cranes — **LT WEST** and **LT EAST**. It correlates wheel replacement frequency with rail hardness readings (Brinell Hardness / HB) to:

- Identify which rail sections are causing accelerated wheel wear
- Forecast how many wheel replacements are expected in the next 1–12 months
- Recommend maintenance priority (Normal → Medium → High → Critical)

New capabilities include secure login, per-user Excel uploads, and the ability to view or reactivate previously uploaded Excel files.

---

## Project Structure

```
crane_analytics/
├── app.py                  # Flask application — routes, data loading, ML predictions, auth, DB
├── requirements.txt        # Python dependencies
│
├── templates/
│   ├── index.html          # Single-page dashboard (Jinja2 template)
│   └── login.html          # Login page
│
├── static/
│   ├── script.js           # Chart.js rendering, upload, auth, version history
│   ├── style.css           # Dashboard styling
│   └── auth.css            # Login / modal / history styling
│
├── data/                   # SQLite DB, active Excel, and version files
│   ├── crane_analytics.db
│   ├── LT Wheel replacement data.xlsx   ← active data file
│   └── version_*.xlsx                   ← previous uploaded versions
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
   - **LT wheel replacement data** — date, crane, equipment, job description, remarks
   - **Rail Hardness data** — HB values per section (North & South sides)
   - **Rail Replacement data** — rail replacement events (old or new format)
2. If the file is missing or corrupt, three `generate_mock_*()` functions produce realistic synthetic data so the dashboard is always runnable.

### Authentication & Users

- The app uses **Flask sessions** for authentication and **flask-bcrypt** for password hashing.
- On first run, a default admin is created:
  - **Username:** `admin`
  - **Password:** `admin123`
- Admins can create/delete users via the **Manage Users** modal.
- Only logged-in users can access the dashboard or API.
- All dashboard and API routes (except `/login` and `/logout`) require login.

### Excel Version History

- Every uploaded Excel file is validated, saved as the active `data/LT Wheel replacement data.xlsx`, and stored as a version record in the database (`excel_versions` table).
- Users can open the **History** modal to:
  - See all their past uploads (admins see everyone's)
  - Download any previous version
  - Reactivate an older version, which copies it back to the active data file and reloads the dashboard

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

#### Public
| Method | Path | Description |
|---|---|---|
| GET/POST | `/login` | Login page |
| GET | `/logout` | Clear session |

#### Authenticated
| Method | Path | Returns |
|---|---|---|
| GET | `/` | HTML dashboard |
| GET | `/api/me` | Current user info |
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
| GET | `/api/sample` | Download a sample Excel workbook |
| POST | `/api/upload` | Upload and validate a new Excel file |
| GET | `/api/versions` | List Excel upload history |
| POST | `/api/versions/<id>/activate` | Reactivate a previous version |
| GET | `/api/versions/<id>/download` | Download a previous version |

#### Admin only
| Method | Path | Description |
|---|---|---|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create a new user |
| DELETE | `/api/users/<id>` | Delete a user |

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

**Default login:**
- Username: `admin`
- Password: `admin123`

### With Docker Compose

```bash
# Build and start
docker compose up --build

# Run in background
docker compose up --build -d

# Stop
docker compose down
```

The `data/` folder is mounted as a volume — uploaded Excel files and the SQLite database persist across restarts.

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

3. **Railway auto-detects the Dockerfile** and builds it.

4. **Add environment variables**

   In the Railway dashboard → your service → **Variables**:

   | Key | Value |
   |---|---|
   | `FLASK_ENV` | `production` |
   | `SECRET_KEY` | `<generate-a-long-random-string>` |

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

### Important: persistent storage on Railway

Railway's free tier does **not** guarantee persistent disk. If you want uploaded Excel files and the SQLite database to survive redeploys, enable a **persistent volume** mounted at `/app/data`, or migrate to **Supabase PostgreSQL** (see [Database](#database)).

---

## Using Real Excel Data

Upload your Excel file through the dashboard's drag-and-drop area, or place it at `data/LT Wheel replacement data.xlsx`. It must contain these sheets:

| Sheet name | Required columns |
|---|---|
| `LT wheel replacement data` | `Date`, `Crane`, `Equipment`, `Remarks` (optional: `S.no.`, `Job Description`) |
| `Rail Hardness data` | Row 1 = section names (cols C–N); row 2 = North HB; row 3 = South HB |
| `Rail Replacement data` | New format: `S.no.`, `Date`, `Crane`, `Notification no.`, `Equipment`, `Job Description`, `Remarks` |

If any sheet is missing or the file is absent, the app falls back to mock data — the badge in the header shows **"Demo Mock Data"** vs **"Live Excel Data"**.

Click **Sample File** to download a validated template with dropdown lists.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Port the server listens on (auto-set by Railway) |
| `FLASK_ENV` | `production` | Set to `development` to enable Flask debug mode |
| `SECRET_KEY` | *(built-in)* | Flask session secret — **change in production** |

Copy `.env.example` to `.env` for local overrides.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | Flask 3.0 |
| Authentication | Flask sessions + flask-bcrypt |
| Database | SQLite (free forever, file-based) |
| Data processing | pandas, NumPy |
| Machine learning | scikit-learn (LinearRegression, PolynomialFeatures) |
| Excel parsing | openpyxl |
| WSGI server | Gunicorn |
| Frontend charting | Chart.js 4.4 |
| Containerisation | Docker (multi-stage build) |
| Deployment | Railway |

---

## Database

This project uses **SQLite** by default because it is:

- **Free forever** — no hosting cost, no usage limits
- **Zero setup** — a single `.db` file
- **Portable** — works locally and inside Docker without extra services
- **Sufficient** for this app's workload (users, Excel metadata, version history)

The database file is created automatically at `data/crane_analytics.db` when the app first starts.

### Tables

| Table | Purpose |
|---|---|
| `users` | Login accounts, password hashes, roles (`admin` / `user`) |
| `excel_versions` | Metadata for every uploaded Excel file (filename, version number, record count, active flag) |

### Upgrade path

If you later need multi-server deployment or cloud syncing, you can migrate to **Supabase PostgreSQL** or **PostgreSQL on Railway** by replacing the `get_db_connection()` function and connection string. The table schema remains compatible.

### Security note

The default admin password is `admin123`. **Change it immediately after first login** by creating a new admin user and deleting the default one, or by updating the password hash directly in the database.
