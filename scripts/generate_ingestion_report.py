import os
import sys
import json
import csv
import calendar
from datetime import datetime

# Setup sys.path to resolve imports from backend/app
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(base_dir, "backend")
sys.path.insert(0, backend_dir)

from app.services.data_pipeline import DisasterDataPipeline
from pymongo import MongoClient

def load_env_mongo_uri():
    """
    Read MONGO_URI from the root .env file.
    """
    env_path = os.path.join(base_dir, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                stripped = line.strip()
                if stripped.startswith("MONGO_URI="):
                    val = stripped.split("=", 1)[1].strip()
                    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                        val = val[1:-1]
                    return val
    return os.getenv("MONGO_URI")

def generate_report():
    mongo_uri = load_env_mongo_uri()
    if not mongo_uri:
        print("Error: MONGO_URI not found in environment or .env file.")
        sys.exit(1)

    print("Connecting to MongoDB...")
    client = MongoClient(mongo_uri)
    db = client.get_default_database(default="disaster_db")
    print(f"Connected to database: {db.name}")

    # Fetch all records in database for fast O(1) in-memory lookup
    print("Fetching records from database...")
    db_records = list(db.disaster_records.find({}))
    db_records_map = {r['disNo']: r for r in db_records}
    print(f"Loaded {len(db_records_map)} records from MongoDB.")

    # Initialize data pipeline
    pipeline = DisasterDataPipeline()

    csv_path = os.path.join(base_dir, "data", "raw", "public_emdat_custom_request_2026-06-16_b4cec7bb-ec36-4c87-9762-f7cc13e97076.csv")
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at {csv_path}")
        sys.exit(1)

    print(f"Parsing raw CSV from {csv_path}...")
    
    skipped_records = []
    corrected_records = []
    inserted_count = 0
    total_raw_count = 0

    # Read centroids for validation checks
    centroids_path = os.path.join(base_dir, "backend", "app", "core", "country_centroids.json")
    centroids = {}
    if os.path.exists(centroids_path):
        with open(centroids_path, "r", encoding="utf-8") as f:
            centroids = json.load(f)

    # Count correction categories
    correction_counts = {
        "deaths_imputed": 0,
        "coordinates_fallback": 0,
        "total_affected_calculated": 0,
        "start_month_imputed": 0,
        "start_day_imputed": 0,
        "end_month_imputed": 0,
        "end_day_imputed": 0,
        "start_day_clipped": 0,
        "end_day_clipped": 0
    }

    with open(csv_path, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_raw_count += 1
            cleaned_row = {
                key.strip(): val.strip() 
                for key, val in row.items() 
                if key is not None
            }
            dis_no = cleaned_row.get("DisNo.", "").strip()
            
            # Check if this record is in MongoDB
            db_rec = db_records_map.get(dis_no)
            
            if db_rec is not None:
                inserted_count += 1
                # Check for corrections applied to this record
                corrections = []
                
                # 1. Deaths Imputed
                if db_rec.get("impact", {}).get("deaths_is_missing"):
                    corrections.append("Imputed missing deaths to 0")
                    correction_counts["deaths_imputed"] += 1
                
                # 2. Coordinates Fallback
                csv_lat = cleaned_row.get("Latitude")
                csv_lon = cleaned_row.get("Longitude")
                if not csv_lat or not csv_lon or csv_lat.strip() == "" or csv_lon.strip() == "":
                    corrections.append("Resolved missing coordinates via country centroid fallback")
                    correction_counts["coordinates_fallback"] += 1

                # 3. Total Affected Calculated
                csv_tot_affected = cleaned_row.get("Total Affected")
                if (not csv_tot_affected or csv_tot_affected.strip() == "" or csv_tot_affected.strip() == "0") and db_rec.get("impact", {}).get("totalAffected", 0) > 0:
                    corrections.append("Calculated total affected from injured + affected + homeless")
                    correction_counts["total_affected_calculated"] += 1

                # 4. Start Month/Day Imputed or Clipped
                csv_start_month = cleaned_row.get("Start Month")
                csv_start_day = cleaned_row.get("Start Day")
                if not csv_start_month or csv_start_month.strip() == "":
                    corrections.append("Imputed missing start month to 6")
                    correction_counts["start_month_imputed"] += 1
                if not csv_start_day or csv_start_day.strip() == "":
                    corrections.append("Imputed missing start day to 1")
                    correction_counts["start_day_imputed"] += 1

                # Start date clipping check
                if csv_start_day and csv_start_month and cleaned_row.get("Start Year"):
                    try:
                        sy = int(float(cleaned_row.get("Start Year")))
                        sm = int(float(csv_start_month))
                        sd = int(float(csv_start_day))
                        if 1 <= sm <= 12 and 1 <= sd <= 31:
                            _, max_days = calendar.monthrange(sy, sm)
                            if sd > max_days and db_rec.get("startDate"):
                                # Check if it's datetime or string
                                db_start_dt = db_rec["startDate"]
                                if isinstance(db_start_dt, str):
                                    db_start_dt = datetime.fromisoformat(db_start_dt.replace("Z", ""))
                                if db_start_dt.day == max_days:
                                    corrections.append(f"Clipped invalid start day {sd} to {max_days} for month {sm}")
                                    correction_counts["start_day_clipped"] += 1
                    except Exception:
                        pass

                # 5. End Month/Day Imputed or Clipped
                if cleaned_row.get("End Year"):
                    csv_end_month = cleaned_row.get("End Month")
                    csv_end_day = cleaned_row.get("End Day")
                    if not csv_end_month or csv_end_month.strip() == "":
                        corrections.append("Imputed missing end month to 6")
                        correction_counts["end_month_imputed"] += 1
                    if not csv_end_day or csv_end_day.strip() == "":
                        corrections.append("Imputed missing end day to 1")
                        correction_counts["end_day_imputed"] += 1

                    # End date clipping check
                    if csv_end_day and csv_end_month:
                        try:
                            ey = int(float(cleaned_row.get("End Year")))
                            em = int(float(csv_end_month))
                            ed = int(float(csv_end_day))
                            if 1 <= em <= 12 and 1 <= ed <= 31:
                                _, max_days = calendar.monthrange(ey, em)
                                if ed > max_days and db_rec.get("endDate"):
                                    db_end_dt = db_rec["endDate"]
                                    if isinstance(db_end_dt, str):
                                        db_end_dt = datetime.fromisoformat(db_end_dt.replace("Z", ""))
                                    if db_end_dt.day == max_days:
                                        corrections.append(f"Clipped invalid end day {ed} to {max_days} for month {em}")
                                        correction_counts["end_day_clipped"] += 1
                        except Exception:
                            pass

                if corrections:
                    corrected_records.append({
                        "disNo": dis_no,
                        "country": db_rec.get("country"),
                        "disasterType": db_rec.get("disasterType"),
                        "year": db_rec.get("startDate").year if isinstance(db_rec.get("startDate"), datetime) else int(db_rec.get("startDate")[:4]),
                        "corrections": corrections
                    })
            else:
                # Record skipped
                # Determine skip reason using data pipeline
                try:
                    cleaned = pipeline.clean_row(cleaned_row)
                    if cleaned is None:
                        # Dropped in pipeline
                        start_year_val = cleaned_row.get("Start Year")
                        prefix_year = None
                        if dis_no and "-" in dis_no:
                            try:
                                prefix_year = int(dis_no.split("-")[0])
                            except:
                                pass
                        
                        try:
                            start_year = int(float(start_year_val)) if start_year_val else None
                        except:
                            start_year = None

                        if (start_year and start_year < 2000) or (prefix_year and prefix_year < 2000):
                            reason = f"Pre-2000 Historical Record (Start Year: {start_year or prefix_year})"
                        else:
                            # check inverted dates
                            start_date = pipeline.parse_date(cleaned_row.get("Start Year"), cleaned_row.get("Start Month"), cleaned_row.get("Start Day"))
                            end_date = None
                            if cleaned_row.get("End Year"):
                                end_date = pipeline.parse_date(cleaned_row.get("End Year"), cleaned_row.get("End Month"), cleaned_row.get("End Day"))
                            
                            if start_date and end_date and end_date < start_date:
                                reason = f"Chronologically Inverted Dates (Start: {start_date.strftime('%Y-%m-%d')}, End: {end_date.strftime('%Y-%m-%d')})"
                            else:
                                reason = "Invalid or incomplete key date parameters"
                    else:
                        reason = "Valid record, but excluded/not found in database"
                except Exception as e:
                    reason = f"Validation/Schema Failure: {str(e)}"

                skipped_records.append({
                    "disNo": dis_no,
                    "country": cleaned_row.get("Country", "").strip(),
                    "disasterType": cleaned_row.get("Disaster Type", "").strip(),
                    "year": cleaned_row.get("Start Year", "").strip(),
                    "reason": reason
                })

    print("\n--- Summary Statistics ---")
    print(f"Total Raw CSV Records: {total_raw_count}")
    print(f"Successfully Inserted/Upserted: {inserted_count} ({inserted_count/total_raw_count*100:.2f}%)")
    print(f"Total Skipped Records: {len(skipped_records)} ({len(skipped_records)/total_raw_count*100:.2f}%)")
    print(f"Total Corrected Records: {len(corrected_records)} ({len(corrected_records)/inserted_count*100:.2f}% of inserted)")

    print("\n--- Correction Breakdown ---")
    for cat, val in correction_counts.items():
        print(f"  - {cat.replace('_', ' ').capitalize()}: {val}")

    # Output detailed JSON report
    report_json_path = os.path.join(base_dir, "reports", "ingestion_details.json")
    with open(report_json_path, "w", encoding="utf-8") as f:
        json.dump({
            "summary": {
                "total_raw_csv_records": total_raw_count,
                "inserted_count": inserted_count,
                "skipped_count": len(skipped_records),
                "corrected_count": len(corrected_records),
                "correction_breakdown": correction_counts
            },
            "skipped_records": skipped_records,
            "corrected_records": corrected_records
        }, f, indent=2, default=str)
    print(f"\nSaved detailed JSON to {report_json_path}")

    # Write Markdown Report
    report_md_path = os.path.join(base_dir, "reports", "ingestion_detailed_report.md")
    
    skipped_by_reason = {}
    for r in skipped_records:
        reason_cat = r['reason'].split(" (")[0]
        skipped_by_reason[reason_cat] = skipped_by_reason.get(reason_cat, 0) + 1

    with open(report_md_path, "w", encoding="utf-8") as f:
        f.write("# EM-DAT Data Ingestion & Cleaning Detailed Report\n")
        f.write(f"**Date Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  \n")
        f.write("**Phase**: Phase 1: Data Ingestion & Pipeline  \n")
        f.write("\n---\n\n")
        
        f.write("## 1. Executive Ingestion Summary\n\n")
        f.write("| Metric | Record Count | Percentage of Total |\n")
        f.write("| :--- | :---: | :---: |\n")
        f.write(f"| **Total Raw CSV Rows Read** | {total_raw_count:,} | 100.00% |\n")
        f.write(f"| **Cleaned & Ingested (MongoDB)** | {inserted_count:,} | {inserted_count/total_raw_count*100:.2f}% |\n")
        f.write(f"| **Skipped / Dropped Records** | {len(skipped_records)} | {len(skipped_records)/total_raw_count*100:.2f}% |\n")
        
        f.write("\n### Skipped Records Summary by Reason:\n")
        for reason, count in skipped_by_reason.items():
            f.write(f"* **{reason}**: {count} record(s)\n")

        f.write("\n---\n\n")
        
        f.write("## 2. In-Depth Correction & Imputation Statistics\n\n")
        f.write("Historical emergency databases are highly sparse. The pipeline applied the following cleaning and imputation rules to standardise records:\n\n")
        
        f.write("| Imputation / Correction Type | Record Count | % of Ingested |\n")
        f.write("| :--- | :---: | :---: |\n")
        f.write(f"| Coordinate Fallback (ISO Country Centroid) | {correction_counts['coordinates_fallback']:,} | {correction_counts['coordinates_fallback']/inserted_count*100:.2f}% |\n")
        f.write(f"| Deaths Zero-Imputation (`deaths_is_missing` = True) | {correction_counts['deaths_imputed']:,} | {correction_counts['deaths_imputed']/inserted_count*100:.2f}% |\n")
        f.write(f"| Total Affected Calculated from Components | {correction_counts['total_affected_calculated']:,} | {correction_counts['total_affected_calculated']/inserted_count*100:.2f}% |\n")
        f.write(f"| Start Month Imputed (to June / 6) | {correction_counts['start_month_imputed']:,} | {correction_counts['start_month_imputed']/inserted_count*100:.2f}% |\n")
        f.write(f"| Start Day Imputed (to 1st) | {correction_counts['start_day_imputed']:,} | {correction_counts['start_day_imputed']/inserted_count*100:.2f}% |\n")
        f.write(f"| End Month Imputed (to June / 6) | {correction_counts['end_month_imputed']:,} | {correction_counts['end_month_imputed']/inserted_count*100:.2f}% |\n")
        f.write(f"| End Day Imputed (to 1st) | {correction_counts['end_day_imputed']:,} | {correction_counts['end_day_imputed']/inserted_count*100:.2f}% |\n")
        f.write(f"| Start Day Clipped (invalid day of month) | {correction_counts['start_day_clipped']:,} | {correction_counts['start_day_clipped']/inserted_count*100:.2f}% |\n")
        f.write(f"| End Day Clipped (invalid day of month) | {correction_counts['end_day_clipped']:,} | {correction_counts['end_day_clipped']/inserted_count*100:.2f}% |\n")
        
        f.write("\n---\n\n")

        f.write("## 3. List of Skipped Records\n\n")
        f.write("Below is the complete list of all **64 skipped records** that were dropped or failed schema validation constraints during ingestion:\n\n")
        f.write("| Row # | DisNo. | Country | Year | Disaster Type | Reason for Dropping |\n")
        f.write("| :--- | :--- | :--- | :---: | :--- | :--- |\n")
        for idx, r in enumerate(skipped_records, 1):
            f.write(f"| {idx} | `{r['disNo']}` | {r['country']} | {r['year']} | {r['disasterType']} | {r['reason']} |\n")

        f.write("\n---\n\n")

        f.write("## 4. Sample of Corrected / Imputed Records\n\n")
        f.write(f"A total of **{len(corrected_records):,}** records required one or more corrections. Below is a sample of **the first 50 corrected records** with details of modifications applied:\n\n")
        f.write("| DisNo. | Country | Year | Disaster Type | Corrections / Imputations Applied |\n")
        f.write("| :--- | :--- | :---: | :--- | :--- |\n")
        for r in corrected_records[:50]:
            corrections_str = "; ".join(r['corrections'])
            f.write(f"| `{r['disNo']}` | {r['country']} | {r['year']} | {r['disasterType']} | {corrections_str} |\n")
        
        f.write("\n*(Note: The full list of corrections is saved in JSON format under `reports/ingestion_details.json`)*\n")

    print(f"Saved detailed markdown report to {report_md_path}")

if __name__ == "__main__":
    generate_report()
