"""
Historical Training Dataset Generator
====================================
Generates a realistic, operationally grounded dataset of historical cloud kitchen
order preparation records across multiple kitchens, staffing levels, station loads,
and item complexities.

This dataset embeds measurable operational relationships:
1. Understaffing during peak hours causes non-linear congestion delays.
2. Extra staff yields diminishing returns due to station capacity limits (Amdahl's Law).
3. Complex items (pizza, multi-step meals) show higher variance under station load.
"""

import os
import random
import numpy as np
import pandas as pd

np.random.seed(42)
random.seed(42)

def generate_historical_orders(num_samples=1800):
    menu_items = [
        {"name": "Gourmet Cheeseburger", "category": "Burger", "station_type": "Grill", "base_time": 8.0, "complexity": 1.15},
        {"name": "Crispy French Fries", "category": "Sides", "station_type": "Fryer", "base_time": 5.0, "complexity": 0.90},
        {"name": "Pepperoni Pizza", "category": "Pizza", "station_type": "Oven", "base_time": 15.0, "complexity": 1.35},
        {"name": "Fresh Caesar Salad", "category": "Salad", "station_type": "Salad_Bar", "base_time": 4.0, "complexity": 0.85},
        {"name": "Iced Chocolate Milkshake", "category": "Beverage", "station_type": "Beverage", "base_time": 3.0, "complexity": 0.70},
        {"name": "Spicy Chicken Wings", "category": "Sides", "station_type": "Fryer", "base_time": 10.0, "complexity": 1.10},
        {"name": "Veggie Delight Pizza", "category": "Pizza", "station_type": "Oven", "base_time": 14.0, "complexity": 1.30},
        {"name": "Double Smash Burger", "category": "Burger", "station_type": "Grill", "base_time": 9.5, "complexity": 1.25}
    ]

    kitchen_profiles = {
        1: {"name": "Central Kitchen - Downtown Hub", "efficiency": 1.00, "staff_mean": 6},
        2: {"name": "Express Kitchen - Tech Park", "efficiency": 1.08, "staff_mean": 4},
        3: {"name": "Suburban Cloud Kitchen - North Hub", "efficiency": 0.98, "staff_mean": 5}
    }

    records = []

    for i in range(1, num_samples + 1):
        kitchen_id = random.choice([1, 2, 3])
        k_profile = kitchen_profiles[kitchen_id]
        
        item = random.choice(menu_items)
        quantity = random.choices([1, 2, 3, 4], weights=[0.60, 0.25, 0.10, 0.05])[0]
        
        # Hour of day (simulating restaurant hours 10:00 to 23:00)
        hour = random.choices(
            list(range(10, 24)),
            weights=[2, 4, 10, 12, 6, 4, 3, 4, 8, 14, 16, 10, 5, 2] # Peaks at 12-14 and 19-21
        )[0]
        
        day_of_week = random.randint(0, 6) # 0=Monday, 6=Sunday
        is_peak_hour = 1 if (12 <= hour <= 14 or 19 <= hour <= 21) else 0

        # Staffing: vary around kitchen mean; peak hours occasionally face staff shortage
        base_staff = k_profile["staff_mean"]
        if is_peak_hour and random.random() < 0.25:
            active_staff_count = max(2, base_staff - random.randint(1, 2)) # Understaffed peak
        else:
            active_staff_count = max(2, min(9, int(np.random.normal(base_staff, 1.0))))
            
        station_staff_ratio = round(min(1.0, (1.0 / active_staff_count) * random.uniform(1.2, 2.0)), 3)

        # Operational queue and station load correlated with peak hour
        if is_peak_hour:
            queue_length = random.randint(4, 14)
            station_load = round(random.uniform(0.6, 1.4), 2)
        else:
            queue_length = random.randint(0, 5)
            station_load = round(random.uniform(0.1, 0.6), 2)

        equipment_condition = round(random.uniform(0.85, 1.00), 2)

        # Physics-based prep duration calculation (ground truth target)
        # 1. Base item time scaled by quantity (sub-linear due to batch prep)
        nominal_seconds = (item["base_time"] * 60.0) * (quantity ** 0.72)
        
        # 2. Staffing effect (Amdahl's law in kitchen):
        # Understaffing (<4 staff) severely slows down order processing (+25% to +60%)
        # Overstaffing (>5 staff) provides diminishing returns (max -12% benefit)
        if active_staff_count < 4:
            staff_multiplier = 1.0 + ((4 - active_staff_count) * 0.18)
        else:
            staff_multiplier = max(0.88, 1.0 - ((active_staff_count - 4) * 0.035))

        # 3. Queue and Station Congestion Delay
        congestion_multiplier = 1.0 + (queue_length * 0.032) + (station_load * 0.085)
        
        # 4. Diurnal Peak-Hour Pace & Kitchen Efficiency
        peak_multiplier = 1.12 if is_peak_hour else 0.94
        kitchen_factor = k_profile["efficiency"]
        equipment_factor = 1.0 + ((1.0 - equipment_condition) * 0.4)

        # Total calculated duration
        calculated_prep_seconds = (
            nominal_seconds *
            item["complexity"] *
            staff_multiplier *
            congestion_multiplier *
            peak_multiplier *
            kitchen_factor *
            equipment_factor
        )

        # Add realistic Gaussian execution noise (±5-8%)
        noise = np.random.normal(0, calculated_prep_seconds * 0.05)
        actual_prep_time_seconds = max(60.0, round(calculated_prep_seconds + noise, 1))

        records.append({
            "order_id": 1000 + i,
            "kitchen_id": kitchen_id,
            "menu_item_name": item["name"],
            "category": item["category"],
            "station_type": item["station_type"],
            "base_prep_time_minutes": item["base_time"],
            "quantity": quantity,
            "item_complexity_score": item["complexity"],
            "hour_of_day": hour,
            "day_of_week": day_of_week,
            "is_peak_hour": is_peak_hour,
            "active_staff_count": active_staff_count,
            "station_staff_ratio": station_staff_ratio,
            "queue_length": queue_length,
            "station_load": station_load,
            "equipment_condition": equipment_condition,
            "actual_prep_time_seconds": actual_prep_time_seconds
        })

    df = pd.DataFrame(records)
    output_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(output_dir, "data", "historical_kitchen_orders.csv")
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} historical order records -> {output_path}")
    print("\nSummary Statistics of Actual Preparation Times (seconds):")
    print(df["actual_prep_time_seconds"].describe())
    return output_path

if __name__ == "__main__":
    generate_historical_orders()
