# Predictive Analysis of LT Wheel & Rail Degradation for YZ Bay Billet Charging EOT Crane – A Business Analytics Approach

This document walks through every code block in `Crane_Analytics.ipynb` and explains, in plain language, what it does and why it matters. The notebook analyzes **YZ Bay Crane maintenance data** to predict wheel failures, rank rail-hardness risk, and suggest maintenance actions.

---

## 1. Imports

```python
import pandas as pd
import numpy as np
...
DATA_PATH = 'data/LT Wheel replacement data.xlsx'
uploaded_excel = None
```

**What it does:** Loads all the tools the notebook needs.

- `pandas` / `numpy` — handle tables and numbers.
- `matplotlib` / `seaborn` — draw charts.
- `re` — find patterns inside text (e.g., pull "SW", "NE" out of a description).
- `datetime`, `BytesIO` — work with dates and in-memory files.
- `sklearn` parts — the machine-learning models (Linear & Polynomial regression) and scoring metrics.
- `ipywidgets` — the file-upload button.

**Why it matters:** Sets the default data file path and creates an empty `uploaded_excel` holder for a file the user might upload later.

---

## 2. Upload Data (File Upload Widget)

```python
uploader = widgets.FileUpload(accept='.xlsx', multiple=False, ...)
def on_upload(change): ...
uploader.observe(on_upload, names='value')
display(uploader)
```

**What it does:** Shows an **"Upload Excel"** button. When you pick a file, it stores that file's contents in the `uploaded_excel` variable.

**Why it matters:** Lets you run the analysis on your *own* Excel file instead of only the built-in default one.

---

## 3. Load the Excel Sheets

```python
if uploaded_excel is not None:
    source = BytesIO(uploaded_excel)
else:
    source = DATA_PATH
xls = pd.ExcelFile(source)
df_wheels_raw = pd.read_excel(source, sheet_name='LT wheel replacement data')
df_hardness_raw = pd.read_excel(source, sheet_name='Rail Hardness data', header=None)
df_rail_raw = pd.read_excel(source, sheet_name='Rail Replacement data')
```

**What it does:** Decides which file to read (your upload if present, otherwise the default), then loads three separate sheets into three raw tables:

1. **Wheel replacement** records.
2. **Rail hardness** readings.
3. **Rail replacement** logs.

**Why it matters:** This is the entry point — all later analysis depends on these three tables. It also prints each table's size so you can confirm the data loaded correctly.

---

## 4. Clean the Wheel Replacement Data

```python
VALID_POSITIONS = {'SW', 'SE', 'NE', 'NW'}
def normalize_crane(crane): ...
def extract_position(row): ...
def parse_wheel_dataframe(df_raw): ...
df_wheels = parse_wheel_dataframe(df_wheels_raw)
```

**What it does:** Tidies up the messy wheel data so it's consistent:

- `normalize_crane` — turns any spelling like "LT West crane" into a clean label: **LT WEST** or **LT EAST**.
- `extract_position` — scans the text to find which corner wheel failed: **SW, SE, NE, NW**, otherwise "Other".
- `parse_wheel_dataframe` — trims column names, converts the Date column into real dates, fills blanks, and applies the two helpers above.

**Why it matters:** Real-world data is inconsistent. Cleaning it ensures grouping and counting later are accurate. It then prints missing-value counts and how many failures fall under each crane and position.

---

## 5. Clean the Rail Hardness Data

```python
sections = df_hardness_raw.iloc[1, 2:14].astype(str).tolist()
north = pd.to_numeric(df_hardness_raw.iloc[2, 2:14], errors='coerce').values
south = pd.to_numeric(df_hardness_raw.iloc[3, 2:14], errors='coerce').values
df_hardness = pd.DataFrame({'Section': sections, 'North': north, 'South': south})
```

**What it does:** The hardness sheet has an awkward layout, so this picks out specific rows/columns by position:

- Row of **section names**, row of **North** rail readings, row of **South** rail readings.
- Builds a neat 3-column table: Section / North / South.

**Why it matters:** Converts an irregular sheet into a clean table that's easy to chart and analyze. Prints the table plus basic statistics.

---

## 6. Clean the Rail Replacement Data

```python
def extract_rail_qty(job_description): ...
def extract_rail_section(job_description): ...
def extract_rail_reason(equipment, job_description): ...
df_rail = df_rail_raw.copy()
df_rail['Qty_Pieces'] = df_rail['Job Description'].apply(extract_rail_qty)
df_rail['Section'] = df_rail['Job Description'].apply(extract_rail_section)
df_rail['Reason'] = df_rail.apply(...)
```

**What it does:** Reads free-text job descriptions and pulls out structured facts:

- `extract_rail_qty` — finds the **number of rail pieces** (e.g., "3 no.").
- `extract_rail_section` — finds **which columns** the work covered (e.g., "Column 5 to 8").
- `extract_rail_reason` — classifies the work as **Thermit welding**, **Rail pieces replacement**, or general **Maintenance**.

**Why it matters:** Turns unstructured notes into countable data. Prints total events and total pieces replaced.

---

## 7. Key Performance Indicators (KPIs)

```python
df = df_wheels.dropna(subset=['Date']).copy()
total_replacements = len(df)
west_count = ...
east_count = ...
avg_north = ...
above_300_north = ...
```

**What it does:** Calculates headline numbers:

- Total wheel replacements.
- How many on the **West** vs **East** crane.
- Average hardness (North & South), max hardness.
- How many sections exceed the **300 HB** danger threshold.
- Total rail pieces replaced.

**Why it matters:** Gives a quick, at-a-glance summary of the whole dataset before diving into charts.

---

## 8. Chart — Monthly Wheel Replacements

```python
df['Month'] = df['Date'].dt.to_period('M').astype(str)
monthly = df.groupby('Month').size().reset_index(name='Count')
sns.barplot(data=monthly, x='Month', y='Count', ...)
```

**What it does:** Groups failures by month and draws a **bar chart** of replacements per month.

**Why it matters:** Reveals trends and busy periods — are failures rising over time or spiking in certain months?

---

## 9. Chart — Replacements by Crane

```python
crane_counts = df['Crane'].value_counts()
plt.pie(crane_counts, labels=..., autopct='%1.1f%%', ...)
max_crane = crane_counts.idxmax()
```

**What it does:** Draws a **pie chart** showing the share of failures for each crane and records which crane has the most (`max_crane`).

**Why it matters:** Quickly shows whether one crane is failing far more than the other.

---

## 10. Chart — Failures by Position

```python
pos_counts = df['Position'].value_counts().reset_index()
sns.barplot(data=pos_counts, x='Position', y='Count', ...)
```

**What it does:** Bar chart of how many failures happened at each wheel position (SW, SE, NE, NW, Other).

**Why it matters:** Pinpoints which corner of the crane is the weak spot.

---

## 11. Chart — Rail Hardness by Section

```python
plt.plot(df_hardness['Section'], df_hardness['North'], ...)
plt.plot(df_hardness['Section'], df_hardness['South'], ...)
plt.axhline(y=300, ...)  # warning line
plt.axhline(y=400, ...)  # critical line
high = df_hardness[(df_hardness['North']>300) | (df_hardness['South']>300)]['Section'].nunique()
```

**What it does:** Line chart of hardness across sections for both rails, with **300 HB (warning)** and **400 HB (critical)** reference lines. Counts how many sections are above 300 HB.

**Why it matters:** Hard rails wear out wheels faster — this highlights the danger zones visually.

---

## 12. Preprocessing — Cumulative Failure Time Series

```python
df['Days'] = (df['Date'] - df['Date'].min()).dt.days
time_series = df.groupby('Days').size().cumsum().reset_index()
time_series.columns = ['Days', 'Cumulative_Failures']
```

**What it does:** Converts each date into "days since the first record," then builds a **running total** of failures over time.

**Why it matters:** Prediction models need a smooth, increasing time series. This running total is exactly what the forecasting models are trained on.

---

## 13. Rail Hardness Risk Classification

```python
def get_risk_class(hb): ...   # Critical / High / Medium / Normal
risk_data = []
for _, row in df_hardness.iterrows():
    for side in ['North', 'South']:
        ...
risk_df = pd.DataFrame(risk_data)
```

**What it does:** Labels each rail section/side with a risk level based on hardness, and attaches a recommended action:

- **> 400 HB → Critical** → Immediate replacement
- **> 350 HB → High** → Schedule replacement
- **> 300 HB → Medium** → Monitor monthly
- **otherwise → Normal** → Normal operation

**Why it matters:** Turns raw numbers into clear, actionable maintenance priorities.

---

## 14. Predictive Modeling — Train the Models

```python
X = time_series['Days'].values.reshape(-1, 1)
y_vals = time_series['Cumulative_Failures'].values
lin_model = LinearRegression().fit(X, y_vals)
poly = PolynomialFeatures(degree=2); X_poly = poly.fit_transform(X)
poly_model = LinearRegression().fit(X_poly, y_vals)
```

**What it does:** Trains two forecasting models on the failure time series:

- **Linear Regression** — assumes failures grow at a steady straight-line rate.
- **Polynomial Regression (degree 2)** — allows a curved trend (accelerating or slowing).

It then prints accuracy scores (**R², MAE, RMSE**) and picks the **better** model.

**Why it matters:** Compares a simple vs. flexible model to see which fits the real failure pattern best.

> **Scoring terms:** R² = how well the line fits (closer to 1 is better); MAE/RMSE = average prediction error (lower is better).

---

## 15. Forecast Future Failures

```python
future_days = [last_day + (30 * i) for i in range(1, months_ahead + 1)]
future_linear = lin_model.predict(...)
future_poly = poly_model.predict(...)
hardness_risk = max(0, (avg_hb - 300) / 100)
adjusted_linear = future_linear * (1 + hardness_risk)
adjusted_poly = np.maximum.accumulate(future_poly * (1 + hardness_risk))
```

**What it does:** Projects failures forward month by month (default **12 months**), then **boosts** the prediction using a *hardness risk factor* — harder rails mean more expected failures. Computes predicted failures for the next **3 months**, **6 months**, and an **average monthly rate**, plus a written recommendation.

**Why it matters:** This is the core output — a realistic, risk-adjusted forecast for planning maintenance ahead of time.

---

## 16. Forecast Chart

```python
pred_df = pd.DataFrame({'Month': ..., 'Linear Forecast': ..., 'Polynomial Forecast': ...})
plt.plot(pred_df['Month'], pred_df['Linear Forecast'], ...)
plt.plot(pred_df['Month'], pred_df['Polynomial Forecast'], ...)
```

**What it does:** Plots both forecasts (Linear vs Polynomial) side by side over the coming months and prints the numbers in a table.

**Why it matters:** Lets you visually compare the two predictions and see the expected future workload.

---

## 17. Final Empty Cell

```python
# (empty)
```

**What it does:** Nothing — it's a blank scratch cell left for future additions.

---

## Summary of the Workflow

1. **Load** three Excel sheets (wheels, hardness, rail replacements).
2. **Clean** each one into tidy, consistent tables.
3. **Summarize** with KPIs and exploratory charts.
4. **Preprocess** into a cumulative failure time series and risk classes.
5. **Model** future failures with Linear & Polynomial regression.
6. **Forecast** 3/6/12 months ahead, adjusted for rail hardness risk.
7. **Recommend** maintenance actions based on the results.

The end goal: **predict crane wheel failures early and prioritize rail maintenance to reduce unplanned downtime.**
