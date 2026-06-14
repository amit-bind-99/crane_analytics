from flask import Flask, render_template, jsonify, request
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.metrics import r2_score
import warnings
import os
from datetime import datetime, timedelta
import json

warnings.filterwarnings('ignore')

app = Flask(__name__)

DATA_PATH = os.path.join('data', 'LT Wheel replacement data.xlsx')

# ============== MOCK DATA GENERATORS ==============

def generate_mock_wheel_data():
    """Generate realistic wheel replacement mock data"""
    np.random.seed(42)
    cranes = ['LT WEST', 'LT EAST']
    positions = ['SW', 'NE', 'NW', 'SE']
    remarks = [
        'Wheel damaged',
        'Flange worn out',
        'Bearing failure',
        'Tread wear beyond limit',
        'Crack detected',
        'Scheduled replacement',
        'Hot axle reported'
    ]

    data = []
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2025, 9, 30)

    # 87 replacement events
    for i in range(87):
        crane = np.random.choice(cranes, p=[0.58, 0.42])
        pos = np.random.choice(positions)
        num = np.random.randint(1, 6)
        equipment = f"{crane}-{num:02d} {pos}"

        # Bias failures toward later months and high-hardness period
        days_offset = int(np.random.beta(2, 1.2) * (end_date - start_date).days)
        date = start_date + timedelta(days=days_offset)

        data.append({
            'Date': date,
            'Crane': crane,
            'Equipment': equipment,
            'Position': pos,
            'Remarks': np.random.choice(remarks)
        })

    df = pd.DataFrame(data)
    df = df.sort_values('Date').reset_index(drop=True)
    return df

def generate_mock_hardness_data():
    """Generate realistic rail hardness data"""
    np.random.seed(7)
    sections = [f"{a}-{b}" for a, b in zip(range(21, 33), range(22, 34))]

    # North side: mostly high, some critical
    north = [312, 298, 355, 389, 422, 466, 445, 401, 378, 356, 334, 318]
    north = [h + np.random.randint(-8, 9) for h in north]

    # South side: slightly lower but still concerning
    south = [305, 288, 342, 378, 410, 438, 415, 389, 365, 344, 322, 298]
    south = [h + np.random.randint(-7, 8) for h in south]

    return pd.DataFrame({
        'Section': sections,
        'North': north,
        'South': south
    })

def generate_mock_rail_replacement_data():
    """Generate rail replacement log"""
    data = [
        {'Date': '2025-07-12', 'Section': '24-25 to 27-28', 'Side': 'North', 'Qty_Pieces': 8, 'Reason': 'Excessive hardness & cracks'},
        {'Date': '2025-07-18', 'Section': '25-26 to 28-29', 'Side': 'South', 'Qty_Pieces': 6, 'Reason': 'High hardness, flange wear'},
        {'Date': '2025-08-02', 'Section': '29-30 to 32-33', 'Side': 'North', 'Qty_Pieces': 5, 'Reason': 'Crack propagation'},
        {'Date': '2025-08-15', 'Section': '27-28 to 30-31', 'Side': 'South', 'Qty_Pieces': 4, 'Reason': 'Periodic replacement'},
        {'Date': '2025-08-22', 'Section': '23-24 to 25-26', 'Side': 'Both', 'Qty_Pieces': 7, 'Reason': 'Preventive replacement'},
    ]
    return pd.DataFrame(data)

# ============== DATA LOADER ==============

def load_data():
    """Try loading Excel; fall back to mock data if missing or corrupt"""
    if os.path.exists(DATA_PATH):
        try:
            xls = pd.ExcelFile(DATA_PATH)
            sheets = xls.sheet_names

            # Wheel replacement
            if 'LT wheel replacement data' in sheets:
                df_wheels = pd.read_excel(DATA_PATH, sheet_name='LT wheel replacement data')
            else:
                df_wheels = generate_mock_wheel_data()

            # Hardness data
            if 'Rail Hardness data' in sheets:
                df_hardness_raw = pd.read_excel(DATA_PATH, sheet_name='Rail Hardness data', skiprows=1)
                try:
                    sections = df_hardness_raw.columns[2:14].astype(str).tolist()
                    north = df_hardness_raw.iloc[0, 2:14].values
                    south = df_hardness_raw.iloc[1, 2:14].values
                    df_hardness = pd.DataFrame({'Section': sections, 'North': north, 'South': south})
                except Exception:
                    df_hardness = generate_mock_hardness_data()
            else:
                df_hardness = generate_mock_hardness_data()

            # Rail replacement
            if 'Rail Replacement data' in sheets:
                df_rail = pd.read_excel(DATA_PATH, sheet_name='Rail Replacement data')
            else:
                df_rail = generate_mock_rail_replacement_data()

            return df_wheels, df_hardness, df_rail, True
        except Exception as e:
            print(f"Error loading Excel: {e}. Using mock data.")

    return generate_mock_wheel_data(), generate_mock_hardness_data(), generate_mock_rail_replacement_data(), False

df_wheels, df_hardness, df_rail_replacement, using_real_data = load_data()

# ============== HELPERS ==============

def safe_float(value):
    if pd.isna(value):
        return None
    return float(value)

def get_risk_class(hb):
    if hb is None:
        return 'Unknown'
    if hb > 400:
        return 'Critical'
    if hb > 350:
        return 'High'
    if hb > 300:
        return 'Medium'
    return 'Normal'

def ensure_date_column(df):
    if 'Date' in df.columns:
        df['Date'] = pd.to_datetime(df['Date'], errors='coerce', dayfirst=True)
    return df

# ============== ROUTES ==============

@app.route('/')
def index():
    return render_template('index.html', using_real_data=using_real_data)

@app.route('/api/status')
def status():
    return jsonify({
        'using_real_data': using_real_data,
        'data_path': DATA_PATH,
        'data_path_exists': os.path.exists(DATA_PATH),
        'total_wheel_records': len(df_wheels),
        'hardness_sections': len(df_hardness)
    })

@app.route('/api/summary')
def get_summary():
    df = ensure_date_column(df_wheels.copy())

    total_replacements = len(df)
    west_count = int(df[df['Crane'].astype(str).str.contains('west', case=False, na=False)].shape[0])
    east_count = int(df[df['Crane'].astype(str).str.contains('East', case=False, na=False)].shape[0])

    # Monthly trend
    df['Month'] = df['Date'].dt.to_period('M')
    monthly = df.groupby('Month').size().reset_index(name='Count')
    monthly['Month_str'] = monthly['Month'].astype(str)
    monthly = monthly.drop(columns=['Month'])

    # Hardness stats
    north_vals = df_hardness['North'].dropna().tolist()
    south_vals = df_hardness['South'].dropna().tolist()
    all_hardness = [float(v) for v in (north_vals + south_vals) if pd.notna(v)]

    avg_north = float(np.mean(north_vals)) if north_vals else 0
    avg_south = float(np.mean(south_vals)) if south_vals else 0
    max_hb = float(max(all_hardness)) if all_hardness else 0
    above_300_north = sum(1 for h in north_vals if h > 300)
    above_300_south = sum(1 for h in south_vals if h > 300)

    # Failure by month/year
    df['Year'] = df['Date'].dt.year
    yearly = df.groupby('Year').size().to_dict()

    return jsonify({
        'total_replacements': total_replacements,
        'west_crane_failures': west_count,
        'east_crane_failures': east_count,
        'avg_hardness_north': round(avg_north, 1),
        'avg_hardness_south': round(avg_south, 1),
        'max_hardness': round(max_hb, 1),
        'above_threshold_north': above_300_north,
        'above_threshold_south': above_300_south,
        'threshold': 300,
        'monthly_trend': monthly.to_dict('records'),
        'yearly_trend': {str(k): int(v) for k, v in yearly.items()}
    })

@app.route('/api/hardness-data')
def get_hardness_data():
    sections = df_hardness['Section'].astype(str).tolist()
    north = [safe_float(v) for v in df_hardness['North'].values]
    south = [safe_float(v) for v in df_hardness['South'].values]

    return jsonify({
        'columns': sections,
        'north_side': north,
        'south_side': south,
        'threshold': 300,
        'critical_threshold': 400,
        'high_threshold': 350
    })

@app.route('/api/hardness-heatmap')
def hardness_heatmap():
    result = []
    for _, row in df_hardness.iterrows():
        section = str(row['Section'])
        for side in ['North', 'South']:
            hb = safe_float(row[side])
            result.append({
                'section': section,
                'side': side,
                'hardness': hb,
                'risk': get_risk_class(hb)
            })
    return jsonify(result)

@app.route('/api/hardness-correlation')
def hardness_correlation():
    risk_zones = []
    for _, row in df_hardness.iterrows():
        section = str(row['Section'])
        for side in ['North', 'South']:
            hb = safe_float(row[side])
            if hb is not None:
                risk = get_risk_class(hb)
                action = 'Immediate replacement' if risk == 'Critical' else \
                         'Schedule replacement' if risk == 'High' else \
                         'Monitor monthly' if risk == 'Medium' else 'Normal operation'
                risk_zones.append({
                    'section': f'{side} {section}',
                    'side': side,
                    'hardness': hb,
                    'risk': risk,
                    'recommended_action': action
                })

    all_hbs = [z['hardness'] for z in risk_zones]
    return jsonify({
        'risk_zones': risk_zones,
        'critical_zones': sum(1 for z in risk_zones if z['risk'] == 'Critical'),
        'high_risk_zones': sum(1 for z in risk_zones if z['risk'] == 'High'),
        'medium_risk_zones': sum(1 for z in risk_zones if z['risk'] == 'Medium'),
        'normal_zones': sum(1 for z in risk_zones if z['risk'] == 'Normal'),
        'max_hardness': round(max(all_hbs), 1) if all_hbs else 0,
        'avg_hardness': round(float(np.mean(all_hbs)), 1) if all_hbs else 0,
        'recommendation': 'Execute complete rail replacement program across critical zones'
    })

@app.route('/api/wheel-failure-analysis')
def wheel_failure_analysis():
    df = ensure_date_column(df_wheels.copy())

    # Equipment failures
    equipment_counts = df['Equipment'].value_counts().head(10).to_dict()

    # Position failures
    if 'Position' in df.columns:
        positions = df['Position'].fillna('Other').tolist()
    else:
        positions = []
        for equip in df['Equipment'].astype(str):
            pos = 'Other'
            for p in ['SW', 'NE', 'NW', 'SE']:
                if p in equip:
                    pos = p
                    break
            positions.append(pos)

    position_counts = pd.Series(positions).value_counts().to_dict()

    # Remarks / job types
    job_counts = df['Remarks'].value_counts().head(8).to_dict()

    # Monthly totals
    df['Month'] = df['Date'].dt.to_period('M')
    monthly = df.groupby('Month').size().to_dict()

    return jsonify({
        'equipment_failures': {str(k): int(v) for k, v in equipment_counts.items()},
        'position_failures': {str(k): int(v) for k, v in position_counts.items()},
        'job_types': {str(k): int(v) for k, v in job_counts.items()},
        'total_by_month': {str(k): int(v) for k, v in monthly.items()}
    })

@app.route('/api/failure-distribution')
def failure_distribution():
    df = ensure_date_column(df_wheels.copy())

    # By crane
    crane_counts = df['Crane'].value_counts().to_dict()

    # By quarter
    df['Quarter'] = df['Date'].dt.to_period('Q')
    quarterly = df.groupby('Quarter').size().to_dict()

    # By day of week
    df['DayOfWeek'] = df['Date'].dt.day_name()
    dow = df['DayOfWeek'].value_counts().to_dict()

    # Failure severity simulation based on remarks keywords
    severity = {'Critical': 0, 'High': 0, 'Medium': 0, 'Low': 0}
    for remark in df['Remarks'].astype(str):
        r = remark.lower()
        if any(x in r for x in ['crack', 'hot axle', 'bearing failure']):
            severity['Critical'] += 1
        elif any(x in r for x in ['damaged', 'worn out']):
            severity['High'] += 1
        elif any(x in r for x in ['wear', 'limit']):
            severity['Medium'] += 1
        else:
            severity['Low'] += 1

    return jsonify({
        'by_crane': {str(k): int(v) for k, v in crane_counts.items()},
        'by_quarter': {str(k): int(v) for k, v in quarterly.items()},
        'by_day_of_week': dow,
        'by_severity': severity
    })

@app.route('/api/rail-replacement')
def rail_replacement():
    df = df_rail_replacement.copy()
    df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
    records = df.fillna('').to_dict('records')
    for r in records:
        for k in r:
            if isinstance(r[k], pd.Timestamp):
                r[k] = r[k].strftime('%Y-%m-%d')
    return jsonify({
        'records': records,
        'total_pieces': int(df['Qty_Pieces'].sum()) if 'Qty_Pieces' in df.columns else 0,
        'total_events': len(df)
    })

@app.route('/api/predict/<int:months_ahead>')
def predict_failures(months_ahead):
    df = ensure_date_column(df_wheels.copy())
    df = df.dropna(subset=['Date'])

    if len(df) < 2:
        return jsonify({'error': 'Insufficient data'})

    # Cumulative failures over days
    df['Days'] = (df['Date'] - df['Date'].min()).dt.days
    time_series = df.groupby('Days').size().cumsum().reset_index()
    time_series.columns = ['Days', 'Cumulative_Failures']

    X = time_series['Days'].values.reshape(-1, 1)
    y = time_series['Cumulative_Failures'].values

    # Linear model
    lin_model = LinearRegression()
    lin_model.fit(X, y)

    # Polynomial model (degree 2)
    poly = PolynomialFeatures(degree=2)
    X_poly = poly.fit_transform(X)
    poly_model = LinearRegression()
    poly_model.fit(X_poly, y)

    last_day = int(time_series['Days'].max())
    future_days = [last_day + (30 * i) for i in range(1, months_ahead + 1)]

    future_linear = lin_model.predict(np.array(future_days).reshape(-1, 1))
    future_poly = poly_model.predict(poly.transform(np.array(future_days).reshape(-1, 1)))

    # Hardness risk factor
    all_hb = []
    for col in ['North', 'South']:
        all_hb.extend([float(v) for v in df_hardness[col].values if pd.notna(v)])
    avg_hb = float(np.mean(all_hb)) if all_hb else 300
    hardness_risk = max(0, (avg_hb - 300) / 100)

    # Adjusted predictions
    adjusted_linear = future_linear * (1 + hardness_risk)
    adjusted_poly = np.maximum.accumulate(future_poly * (1 + hardness_risk))

    current_failures = int(y[-1])
    pred_3mo = int(adjusted_poly[2] - current_failures) if months_ahead >= 3 else 0
    pred_6mo = int(adjusted_poly[5] - current_failures) if months_ahead >= 6 else 0
    monthly_rate = (adjusted_poly[-1] - current_failures) / months_ahead

    # Recommendation
    if avg_hb > 400:
        recommendation = 'URGENT: Critical hardness levels - immediate rail replacement required'
    elif avg_hb > 350:
        recommendation = 'HIGH PRIORITY: Schedule comprehensive rail replacement program'
    elif avg_hb > 300:
        recommendation = 'MODERATE: Monitor hardness monthly and plan targeted replacement'
    else:
        recommendation = 'NORMAL: Continue standard inspection intervals'

    return jsonify({
        'current_failures': current_failures,
        'predicted_failures_next_3mo': pred_3mo,
        'predicted_failures_next_6mo': pred_6mo,
        'avg_hardness': round(avg_hb, 1),
        'hardness_risk_factor': round(hardness_risk, 2),
        'monthly_failure_rate': round(monthly_rate, 1),
        'recommendation': recommendation,
        'months_ahead': months_ahead,
        'future_predictions': [
            {
                'month_index': i + 1,
                'linear': round(float(adjusted_linear[i] - current_failures), 1),
                'polynomial': round(float(adjusted_poly[i] - current_failures), 1)
            }
            for i in range(months_ahead)
        ]
    })

@app.route('/api/scatter-hardness-failures')
def scatter_hardness_failures():
    """Simulated correlation: hardness vs failure count by section"""
    df = ensure_date_column(df_wheels.copy())
    points = []
    for _, row in df_hardness.iterrows():
        section = str(row['Section'])
        north_hb = safe_float(row['North']) or 300
        south_hb = safe_float(row['South']) or 300
        avg_hb = (north_hb + south_hb) / 2

        # Simulated failures scale with hardness
        base_failures = max(0, (avg_hb - 280) / 10 + np.random.normal(0, 1))
        points.append({
            'section': section,
            'avg_hardness': round(avg_hb, 1),
            'estimated_failures': round(base_failures, 1),
            'north': north_hb,
            'south': south_hb
        })
    return jsonify(points)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV', 'production') != 'production'
    app.run(host='0.0.0.0', port=port, debug=debug)
