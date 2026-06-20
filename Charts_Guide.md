# Crane Analytics Notebook — Charts & Graphs Guide

This document explains every chart and graph in `Crane_Analytics.ipynb` in simple terms.

---

## 1. Monthly Wheel Replacements

**Where it appears:** Cell after "### Monthly Wheel Replacements"  
**Code:** `Crane_Analytics.ipynb` lines 491-501

**What it shows:**
A bar chart showing how many LT crane wheels were replaced in each month.

**How it is generated:**
- The Date column is converted to a month label (e.g., `2024-01`).
- The rows are grouped by month and counted.
- `seaborn.barplot()` draws a bar for each month with the count on the y-axis.

**Why it is useful:**
Shows failure trends over time — helps identify whether failures are increasing, decreasing, or seasonal.

---

## 2. Replacements by Crane

**Where it appears:** Cell after "### Replacements by Crane"  
**Code:** `Crane_Analytics.ipynb` lines 538-544

**What it shows:**
A pie chart showing what percentage of wheel replacements came from LT West vs LT East crane.

**How it is generated:**
- Crane names are normalized to `LT WEST` or `LT EAST`.
- `value_counts()` counts how many replacements each crane had.
- `matplotlib.pyplot.pie()` draws the pie chart and shows percentage labels.

**Why it is useful:**
Highlights if one crane is failing much more than the other, indicating uneven wear or load issues.

---

## 3. Failures by Position

**Where it appears:** Cell after "### Failures by Position"  
**Code:** `Crane_Analytics.ipynb` lines 582-591

**What it shows:**
A bar chart showing how many failures occurred at each wheel position: NE, NW, SE, SW.

**How it is generated:**
- Position names are extracted from the Equipment and Job Description columns using a search.
- `value_counts()` counts failures per position.
- `seaborn.barplot()` draws the bars.

**Why it is useful:**
Helps identify which corner or side of the crane wears out faster.

---

## 4. Rail Hardness by Section

**Where it appears:** Cell after "### Rail Hardness by Section"  
**Code:** `Crane_Analytics.ipynb` lines 628-639

**What it shows:**
A line chart showing rail hardness values (in HB) for the North and South rails across each section.
It also includes horizontal threshold lines at 300 HB and 400 HB.

**How it is generated:**
- `plt.plot()` draws one line for North hardness values and another for South hardness values.
- `plt.axhline()` adds dashed horizontal lines at 300 and 400 to show warning/critical limits.
- Section names are shown on the x-axis.

**Why it is useful:**
Shows which rail sections are too hard (risk of cracking/brittleness) and which are within safe limits.

---

## 5. Cumulative Failure Forecast

**Where it appears:** Cell after "### Forecast Chart"  
**Code:** `Crane_Analytics.ipynb` lines 990-1006

**What it shows:**
A line chart showing predicted additional wheel failures for the next 12 months.
Two lines are shown: one from a Linear regression model and one from a Polynomial regression model.

**How it is generated:**
- The cumulative number of failures is calculated over time (Days since first failure).
- A Linear Regression model is trained on Days vs Cumulative Failures.
- A Polynomial Regression model (degree 2) is also trained.
- Future months are converted into days and fed into both models.
- Predictions are adjusted by a hardness risk factor.
- `plt.plot()` draws both forecast lines.

**Why it is useful:**
Predicts how many wheel failures may happen in the future so maintenance teams can plan spare parts and labour.

---

## Summary Table

| Chart | Chart Type | Purpose |
|---|---|---|
| Monthly Wheel Replacements | Bar chart | Shows failure count per month |
| Replacements by Crane | Pie chart | Compares failure share between cranes |
| Failures by Position | Bar chart | Shows which wheel positions fail most |
| Rail Hardness by Section | Line chart | Shows hardness across rail sections with safe limits |
| Cumulative Failure Forecast | Line chart | Predicts future wheel failures |

---

## Libraries Used

- **matplotlib.pyplot** — core plotting library for bar charts, pie charts, line charts, and labels.
- **seaborn** — used for nicer-looking bar charts with built-in styles and color palettes.
