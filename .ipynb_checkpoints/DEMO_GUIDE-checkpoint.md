# YZ Bay Crane Analytics — Demo Guide

A step-by-step script for presenting the application live. Follow it top-to-bottom for a smooth ~10-minute demo.

---

## 1. Before You Start (Setup Checklist)

Do this **5 minutes before** the demo so nothing breaks live.

| # | Action | Command / Step |
|---|--------|----------------|
| 1 | Open a terminal in the project folder | `cd C:\Users\amit\dev\crane_analytics` |
| 2 | Start the app | `python -m streamlit run streamlit_app.py` |
| 3 | Confirm it opened | Browser tab at **http://localhost:8501** |
| 4 | Have the sample Excel ready | Download it from the app's **Upload Data** page (keep it on Desktop) |
| 5 | Log out so you can demo the login | Click **🚪 Logout** in the sidebar |

> 💡 If `streamlit` is "not recognized", always use `python -m streamlit run streamlit_app.py`.

**Demo login credentials:**
- Username: `admin`
- Password: `admin123`

---

## 2. The 30-Second Pitch (Say This First)

> "This is a predictive maintenance dashboard for the YZ Bay crane. It reads our wheel-replacement and rail-hardness records from a normal Excel file, automatically cleans the data, and turns it into interactive charts and failure forecasts. It's built entirely in Python — no separate website code — and it's secured behind a login so only authorised staff can see it."

---

## 3. Demo Flow (What to Click, In Order)

### Step 1 — Login Screen
**Say:** "Access is protected. Passwords are encrypted, never stored as plain text."
**Do:** Type `admin` / `admin123` → click **Sign In**.

---

### Step 2 — Dashboard (the headline screen)
**Say:** "This is the one-screen overview. These cards at the top are our key numbers — total replacements, failures per crane, and rail hardness."
**Do:** Point to the KPI cards, then scroll through the 4 charts.
**Highlight:**
- Monthly replacements trend
- Replacements split West vs East crane
- Rail hardness line with the **300 (warning)** and **400 (critical)** threshold lines
- Failures by wheel position (SW / SE / NE / NW)

---

### Step 3 — Hardness Analysis
**Say:** "Hard rail wears wheels out faster. This page flags the dangerous sections automatically."
**Do:** Show the risk count cards (Critical / High / Medium / Normal), the heatmap, and the colour-coded risk table.
**Highlight:** The red/critical zones are where maintenance should act first.

---

### Step 4 — Wheel Failure Analysis
**Say:** "This breaks down *what* is failing and *where*."
**Do:** Walk through failures by equipment, by position, by remark type, and the monthly trend.

---

### Step 5 — Failure Distribution
**Say:** "This is the same failures sliced different ways — by crane, by quarter, by day of week, and by severity."
**Do:** Point at the severity chart (Critical/High/Medium/Low).

---

### Step 6 — Rail Replacement Log
**Say:** "A clean record of every rail job — pieces replaced and welding work — pulled straight from the Excel sheet."
**Do:** Show the reason pie chart and the records table.

---

### Step 7 — Predictions (the "wow" moment)
**Say:** "This forecasts future wheel failures using two models, and it scales the forecast up when rail hardness is high."
**Do:**
1. Drag the **months-ahead slider** (e.g. to 12).
2. Point to the predicted 3-month and 6-month numbers.
3. Show the forecast chart (Linear vs Polynomial lines).
4. Read out the recommendation banner (e.g. "HIGH PRIORITY...").

**If asked how it works:** "One model draws a straight trend line, the other a curve that captures acceleration. We then multiply by a hardness-risk factor — the harder the rail, the higher the predicted failures."

---

### Step 8 — Upload Data (prove it's live, not hard-coded)
**Say:** "Nothing here is hard-coded. Watch — I'll upload a fresh Excel file and every chart updates instantly."
**Do:**
1. Click **📥 Download Sample File** (show the expected format).
2. Upload that file with the file picker.
3. See the success message + balloons.
4. Go back to **Dashboard** — note the badge switches from **Demo Data** to **Live Data**.

---

### Step 9 — Version History
**Say:** "Every upload is saved as a version. We can roll back to any previous file or download it."
**Do:** Expand a version, show **Activate** and **Download** buttons.

---

### Step 10 — User Management (admin only)
**Say:** "As an admin, I can add or remove who has access."
**Do:** Show the user list, the add-user form, and the delete option.

---

### Step 11 — Logout
**Say:** "And when we're done, one click logs out and locks it back down."
**Do:** Click **🚪 Logout**.

---

## 4. Likely Questions & Answers

| Question | Answer |
|----------|--------|
| **What is it built with?** | 100% Python — Streamlit for the interface, Plotly for charts, pandas for data, scikit-learn for predictions. No HTML/CSS/JS. |
| **Where is data stored?** | The uploaded Excel file and a small SQLite database for user accounts, both in a secure `data/` folder on the server. |
| **Are passwords safe?** | Yes — hashed with bcrypt (industry standard). Even we can't read them. |
| **Can multiple people use it?** | Yes — each gets their own login; admins manage access. |
| **What if no file is uploaded?** | It ships with realistic demo data so it always works, clearly marked with a "Demo Data" badge. |
| **How accurate are the predictions?** | They're trend-based estimates, not guarantees — meant to guide planning, not replace inspection. |
| **Can it go online?** | Yes — it's container-ready (Docker) and configured for Railway / Streamlit Cloud / Render. |

---

## 5. Emergency Fallbacks (If Something Breaks)

| Problem | Fix |
|---------|-----|
| App won't start | Run `pip install -r requirements.txt`, then `python -m streamlit run streamlit_app.py` |
| `streamlit not recognized` | Always use `python -m streamlit run streamlit_app.py` |
| Port already in use | `python -m streamlit run streamlit_app.py --server.port=8502` |
| Charts look empty after upload | Make sure the Excel has the sheet **LT wheel replacement data** |
| Forgot you're logged in | Click **Logout** in the sidebar to reset to the login screen |
| Want to reset everything | Stop the app, delete the `data/crane_analytics.db` file, restart (recreates default admin) |

---

## 6. One-Line Closing Statement

> "In short: drop in an Excel file, and within seconds you get a secure, interactive dashboard with trend analysis and failure forecasts — all in pure Python, ready to deploy to the cloud."

---

### Quick Reference Card (keep this visible during the demo)

```
START:   python -m streamlit run streamlit_app.py
URL:     http://localhost:8501
LOGIN:   admin / admin123
ORDER:   Login → Dashboard → Hardness → Wheel Failure →
         Distribution → Rail Log → Predictions → Upload →
         Versions → Users → Logout
```
