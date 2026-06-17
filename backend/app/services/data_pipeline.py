import math
import calendar
import os
import json
from datetime import datetime
from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger(__name__)

from app.models.schemas.disaster import DisasterRecordCreate

# Load country centroids lookup
current_dir = os.path.dirname(os.path.abspath(__file__))
# current_dir is backend/app/services
app_dir = os.path.dirname(current_dir) # backend/app
centroids_path = os.path.join(app_dir, "core", "country_centroids.json")

centroids_data = {}
if os.path.exists(centroids_path):
    try:
        with open(centroids_path, 'r', encoding='utf-8') as f:
            centroids_data = json.load(f)
    except Exception:
        pass

class DisasterDataPipeline:
    """
    Data cleaning and validation pipeline for EM-DAT historical records.
    """
    def __init__(self, p25: float = 0.7199, p75: float = 1.8125, p95: float = 3.5907):
        self.p25 = p25
        self.p75 = p75
        self.p95 = p95

    def parse_int(self, val: Any) -> Optional[int]:
        if val is None or val == "":
            return None
        try:
            return int(float(val))
        except (ValueError, TypeError):
            return None

    def parse_float(self, val: Any) -> Optional[float]:
        if val is None or val == "":
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    def parse_date(self, year: Any, month: Any, day: Any) -> Optional[datetime]:
        try:
            y = int(float(year))
        except (ValueError, TypeError):
            return None

        # Impute month to 6 if missing or invalid
        m = 6
        if month and str(month).strip() != "":
            try:
                parsed_m = int(float(month))
                if 1 <= parsed_m <= 12:
                    m = parsed_m
            except (ValueError, TypeError):
                pass

        # Impute day to 1 if missing or invalid
        d = 1
        if day and str(day).strip() != "":
            try:
                parsed_d = int(float(day))
                if 1 <= parsed_d <= 31:
                    d = parsed_d
            except (ValueError, TypeError):
                pass

        # Adjust day if out of range for the year/month
        try:
            _, max_days = calendar.monthrange(y, m)
            if d > max_days:
                d = max_days
            return datetime(y, m, d)
        except Exception:
            return None

    def calculate_severity(self, deaths: int, total_affected: int, damage_thousands: float) -> tuple[float, str]:
        # Formula: S_i = 0.4*log10(deaths+1) + 0.3*log10(affected+1) + 0.3*log10(damage+1)
        log_deaths = math.log10(deaths + 1)
        log_affected = math.log10(total_affected + 1)
        log_damage = math.log10(damage_thousands + 1)

        score = 0.4 * log_deaths + 0.3 * log_affected + 0.3 * log_damage
        score = round(score, 4)

        if score <= self.p25:
            severity_class = "Low"
        elif score <= self.p75:
            severity_class = "Medium"
        elif score <= self.p95:
            severity_class = "High"
        else:
            severity_class = "Extreme"

        return score, severity_class

    def clean_row(self, row: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """
        Cleans and transforms a single CSV row.
        Returns a dictionary validated and parsed for DisasterRecordCreate.
        Returns None if the record is dropped.
        """
        # 1. Start Year filter (drop if < 2000)
        start_year_val = row.get("Start Year")
        if not start_year_val:
            return None
        try:
            start_year = int(float(start_year_val))
            if start_year < 2000:
                return None
        except (ValueError, TypeError):
            return None

        # Drop obvious anomalies where the DisNo prefix indicates a pre-2000 year
        dis_no = row.get("DisNo.", "").strip()
        if dis_no and "-" in dis_no:
            try:
                prefix_year = int(dis_no.split("-")[0])
                if prefix_year < 2000:
                    return None
            except (ValueError, TypeError):
                pass

        # 2. Extract Dates
        start_date = self.parse_date(row.get("Start Year"), row.get("Start Month"), row.get("Start Day"))
        if not start_date:
            return None

        end_date = None
        if row.get("End Year"):
            end_date = self.parse_date(row.get("End Year"), row.get("End Month"), row.get("End Day"))

        # Drop records where endDate is before startDate (typos)
        if end_date and end_date < start_date:
            return None

        # 3. Clean Impact Fields
        deaths_val = self.parse_int(row.get("Total Deaths"))
        deaths_for_calc = deaths_val if deaths_val is not None else 0
        injured = self.parse_int(row.get("No. Injured"))
        affected = self.parse_int(row.get("No. Affected"))
        homeless = self.parse_int(row.get("No. Homeless"))

        # Raw damage is in thousands
        damage_thousands = self.parse_float(row.get("Total Damage, Adjusted ('000 US$)")) or 0.0
        economic_damage_usd = damage_thousands * 1000.0 if damage_thousands > 0 else None

        calc_affected = (injured or 0) + (affected or 0) + (homeless or 0)
        total_affected = self.parse_int(row.get("Total Affected"))
        if total_affected is None or total_affected == 0:
            total_affected = calc_affected

        # 4. Calculate Severity
        severity_score, severity_class = self.calculate_severity(deaths_for_calc, total_affected, damage_thousands)

        # 5. Build cleaned document
        cleaned_doc = {
            "disNo": dis_no,
            "disasterGroup": row.get("Disaster Group", "").strip(),
            "disasterSubgroup": row.get("Disaster Subgroup", "").strip() or None,
            "disasterType": row.get("Disaster Type", "").strip(),
            "disasterSubtype": row.get("Disaster Subtype", "").strip() or None,
            "country": row.get("Country", "").strip(),
            "iso": row.get("ISO", "").strip().upper(),
            "region": row.get("Region", "").strip() or None,
            "subregion": row.get("Subregion", "").strip() or None,
            "location": row.get("Location", "").strip() or None,
            "magnitude": self.parse_float(row.get("Magnitude")),
            "magnitudeScale": row.get("Magnitude Scale", "").strip() or None,
            "startDate": start_date,
            "endDate": end_date,
            "impact": {
                "deaths": deaths_val,
                "injured": injured,
                "affected": affected,
                "homeless": homeless,
                "totalAffected": total_affected,
                "economicDamageUSD": economic_damage_usd,
            },
            "severityScore": severity_score,
            "severityClass": severity_class
        }

        # Include raw Lat/Long keys if present (for pre-validator centroid resolution)
        lat = row.get("Latitude")
        lon = row.get("Longitude")
        if lat and str(lat).strip() != "":
            cleaned_doc["Latitude"] = lat
        if lon and str(lon).strip() != "":
            cleaned_doc["Longitude"] = lon

        # 6. Validate with Pydantic
        try:
            record = DisasterRecordCreate(**cleaned_doc)
            return record.model_dump()
        except Exception as e:
            raise ValueError(f"Validation failed for record {dis_no}: {e}")

    def clean_batch(self, batch: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """
        Cleans and transforms a batch of raw CSV row dictionaries.
        Filters out any dropped records (which return None from clean_row)
        and skips records that fail Pydantic schema validation.
        """
        cleaned_batch = []
        for row in batch:
            try:
                cleaned = self.clean_row(row)
                if cleaned is not None:
                    cleaned_batch.append(cleaned)
            except Exception as e:
                # Log a warning for validation failure instead of failing the entire batch
                logger.warning(f"Skipping record {row.get('DisNo.')} due to validation error: {e}")
        return cleaned_batch
