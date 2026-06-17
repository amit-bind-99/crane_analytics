# YZ Bay Crane Analytics — How It Works
### A Plain-English Guide for Non-Technical Stakeholders

---

## The Big Picture

Think of this application like a **smart maintenance logbook** that lives on the internet.

Instead of engineers flipping through paper records or Excel sheets on their desktops, they open a website, log in, upload their maintenance file, and instantly see charts, trends, and predictions — all without touching a single formula.

```
Your Excel File  →  Upload to App  →  App reads & analyses  →  Charts & Predictions shown on screen
```

---

## What the App Does (in plain English)

| Feature | What it means for you |
|---|---|
| **Login** | Only authorised people can see the data |
| **Dashboard** | One-screen summary of all key numbers |
| **Hardness Analysis** | Shows which sections of the rail are dangerously hard (hard rail = faster wheel wear) |
| **Wheel Failure Analysis** | Shows which wheels fail most, where, and how often |
| **Failure Distribution** | Breaks down failures by crane, season, day of week, severity |
| **Rail Replacement Log** | A clean table of every rail replacement job done |
| **Predictions** | Estimates how many wheel failures to expect in the next 3–24 months |
| **Upload Data** | Drop in a new Excel file — all charts update automatically |
| **Version History** | Every upload is saved; you can roll back to any previous file |
| **User Management** | Admins can add or remove who has access |

---

## The Journey of Your Data — Step by Step

### Step 1 — You Upload an Excel File

The engineer uploads a standard `.xlsx` file with 3 sheets:

- **LT Wheel Replacement Data** — every wheel that was replaced (date, crane, position, reason)
- **Rail Hardness Data** — hardness measurements (in HB units) for each section of rail
- **Rail Replacement Data** — log of rail pieces replaced and Thermit welding jobs

The app checks the file is valid, then saves it to a secure folder on the server.

---

### Step 2 — The App Reads and Cleans the Data

Raw data from Excel is messy. The app automatically:

- Removes blank rows
- Fixes inconsistent date formats (e.g. `02.04.2024` → a proper date the computer understands)
- Standardises crane names (e.g. `"YZ bay west crane"` and `"yz bay WEST crane"` both become `LT WEST`)
- Extracts the wheel position (SW / SE / NE / NW) from free-text job descriptions
- Categorises failures by severity based on keywords in the remarks

**No manual work needed — this all happens automatically in under a second.**

---

### Step 3 — The Data is Stored Safely

Two things are stored on the server:

1. **The Excel file itself** — kept in a `data/` folder, with every upload saved as a numbered version (v1, v2, v3…)
2. **User accounts** — stored in a small database file (`crane_analytics.db`) that holds usernames, encrypted passwords, and upload history

> 🔒 Passwords are **never stored as plain text**. They are scrambled using an industry-standard encryption method (bcrypt) so that even if someone accessed the database file, they could not read any password.

---

### Step 4 — Charts are Built on the Fly

When you click on any page (Dashboard, Hardness Analysis, etc.), the app:

1. Reads the latest uploaded Excel data from the server
2. Runs calculations in Python (counts, averages, groupings)
3. Builds interactive charts using a library called **Plotly**
4. Sends those charts to your browser

There is **no pre-made chart image** stored anywhere. Every chart is freshly calculated from your current data every time you visit the page.

---

### Step 5 — Predictions are Calculated Using Machine Learning

The **Predictions** page uses two mathematical models:

#### Model 1 — Linear Regression
Draws a straight trend line through past failure data and extends it into the future.
> *"If failures kept increasing at the same steady rate, here is where we'd be in 6 months."*

#### Model 2 — Polynomial Regression
Fits a curved line that better captures acceleration or deceleration in failure rates.
> *"If the failure rate is speeding up (as hardness increases), here is a more realistic forecast."*

#### Hardness Risk Adjustment
The predicted failure count is then **scaled up** based on how far above normal (300 HB) the current average hardness is.

```
Hardness Risk Factor = (Average HB - 300) ÷ 100
Adjusted Prediction  = Raw Prediction × (1 + Hardness Risk Factor)
```

**Example:** If average hardness is 380 HB:
- Risk factor = (380 - 300) ÷ 100 = **0.8**
- Predictions are scaled up by **80%** to reflect the faster wear rate

---

## Who Can Do What — User Roles

| Action | Regular User | Admin |
|---|---|---|
| View all dashboards | ✅ | ✅ |
| Upload new Excel file | ✅ | ✅ |
| Download sample template | ✅ | ✅ |
| View own version history | ✅ | ✅ |
| View **all** users' version history | ❌ | ✅ |
| Add / remove users | ❌ | ✅ |

The default admin login is `admin` / `admin123` — this should be changed before going live.

---

## Where Everything Lives on the Server

```
crane_analytics/
│
├── streamlit_app.py        ← The entire application (Python code)
├── requirements.txt        ← List of software libraries the app needs
├── Dockerfile              ← Instructions for packaging the app for deployment
├── railway.toml            ← Deployment settings for Railway cloud hosting
│
└── data/
    ├── crane_analytics.db          ← User accounts & version history database
    ├── LT Wheel replacement data.xlsx   ← Currently active Excel data
    ├── version_1.xlsx              ← Saved version 1
    ├── version_2.xlsx              ← Saved version 2
    └── ...
```

---

## How the App is Deployed (Runs on the Internet)

```
Your code (GitHub)
       ↓
   Railway.app  ← cloud hosting platform
       ↓
   Docker container  ← a sealed, self-contained box with Python + all libraries
       ↓
   Streamlit runs on port 8080
       ↓
   Railway gives it a public URL (e.g. https://crane-analytics.up.railway.app)
       ↓
   Anyone with the URL + login can access it from any browser, anywhere
```

**Docker** is like a shipping container — it packages the entire app (Python, all libraries, all settings) into one unit that runs identically on any computer or cloud server.

---

## Technology Stack — One-Line Explanations

| Technology | What it is |
|---|---|
| **Python** | The programming language the entire app is written in |
| **Streamlit** | Python library that turns Python code into a website — no HTML needed |
| **Plotly** | Python library that creates interactive, zoomable charts |
| **Pandas** | Python library for reading, cleaning, and analysing tabular data (like Excel) |
| **scikit-learn** | Python library that provides the regression models used for predictions |
| **SQLite** | A lightweight database — a single file that stores user accounts |
| **bcrypt** | Encryption algorithm used to securely hash passwords |
| **Docker** | Packages the app into a container for consistent deployment |
| **Railway** | Cloud platform that hosts the Docker container and gives it a public URL |

---

## What Happens if No Excel File is Uploaded?

The app ships with **built-in demo data** that is automatically generated. This means:

- The app works out of the box with realistic sample numbers
- New users can explore all features before uploading real data
- Charts show a `ℹ️ Displaying demo data` banner so it's always clear

---

## Summary for the Client

> "The application reads your maintenance Excel file, cleans the data automatically, and displays it as interactive charts and trend predictions — all in a secure, login-protected website. Every upload is versioned so you can always go back. Predictions are calculated using two mathematical models that factor in both historical failure rates and current rail hardness levels. The whole system runs on a cloud server and requires nothing to be installed on your computer."
