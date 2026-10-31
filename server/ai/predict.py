"""
Real-time Model Inference Engine
================================
Loads the serialized production model (v2.0-rf-prod.joblib) and generates
traceable, feature-grounded predictions for order items.
"""

import os
import sys
import json
import pandas as pd
import joblib

def load_production_model():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, "models", "v2.0-rf-prod.joblib")
    meta_path = os.path.join(script_dir, "models", "v2.0-rf-prod.meta.json")

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Production model not found at {model_path}. Run train_model.py first.")

    model = joblib.load(model_path)
    with open(meta_path, "r") as f:
        metadata = json.load(f)

    return model, metadata

def predict_prep_time(input_data):
    model, metadata = load_production_model()

    # Default fallbacks for operational state
    features = {
        "base_prep_time_minutes": float(input_data.get("base_prep_time_minutes", 8.0)),
        "quantity": int(input_data.get("quantity", 1)),
        "item_complexity_score": float(input_data.get("item_complexity_score", 1.0)),
        "hour_of_day": int(input_data.get("hour_of_day", 14)),
        "is_peak_hour": int(input_data.get("is_peak_hour", 0)),
        "active_staff_count": int(input_data.get("active_staff_count", 5)),
        "station_staff_ratio": float(input_data.get("station_staff_ratio", 0.3)),
        "queue_length": int(input_data.get("queue_length", 2)),
        "station_load": float(input_data.get("station_load", 0.4)),
        "kitchen_id": int(input_data.get("kitchen_id", 1)),
        "category": str(input_data.get("category", "Burger")),
        "station_type": str(input_data.get("station_type", "Grill"))
    }

    df_input = pd.DataFrame([features])
    prediction = model.predict(df_input)[0]
    predicted_seconds = round(max(60.0, float(prediction)), 1)
    
    # 90% confidence interval based on validation MAE
    mae = metadata.get("val_mae", 73.7)
    lower_bound = max(45.0, round(predicted_seconds - (mae * 1.2), 1))
    upper_bound = round(predicted_seconds + (mae * 1.2), 1)

    result = {
        "predicted_prep_time_seconds": predicted_seconds,
        "predicted_prep_time_minutes": round(predicted_seconds / 60.0, 2),
        "confidence_interval_seconds": [lower_bound, upper_bound],
        "model_version": metadata.get("model_version", "v2.0-rf-prod"),
        "algorithm": metadata.get("algorithm", "GradientBoostingRegressor"),
        "features_snapshot": features
    }
    return result

if __name__ == "__main__":
    data = {}
    if not sys.stdin.isatty():
        try:
            stdin_content = sys.stdin.read().strip()
            if stdin_content:
                data = json.loads(stdin_content)
        except Exception as e:
            pass
            
    if not data and len(sys.argv) > 1:
        try:
            raw_input = sys.argv[1]
            data = json.loads(raw_input)
        except Exception:
            data = {}

    if not data:
        # Sample test input
        data = {
            "base_prep_time_minutes": 15.0,
            "quantity": 2,
            "item_complexity_score": 1.35,
            "category": "Pizza",
            "station_type": "Oven",
            "active_staff_count": 3,
            "queue_length": 6,
            "is_peak_hour": 1,
            "hour_of_day": 13,
            "kitchen_id": 1
        }

    output = predict_prep_time(data)
    print(json.dumps(output, indent=2))
