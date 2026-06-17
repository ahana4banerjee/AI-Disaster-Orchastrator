# EM-DAT Data Ingestion & Cleaning Detailed Report
**Date Generated**: 2026-06-18 01:12:48  
**Phase**: Phase 1: Data Ingestion & Pipeline  

---

## 1. Executive Ingestion Summary

| Metric | Record Count | Percentage of Total |
| :--- | :---: | :---: |
| **Total Raw CSV Rows Read** | 16,853 | 100.00% |
| **Cleaned & Ingested (MongoDB)** | 16,789 | 99.62% |
| **Skipped / Dropped Records** | 64 | 0.38% |

### Skipped Records Summary by Reason:
* **Pre-2000 Historical Record**: 4 record(s)
* **Chronologically Inverted Dates**: 60 record(s)

---

## 2. In-Depth Correction & Imputation Statistics

Historical emergency databases are highly sparse. The pipeline applied the following cleaning and imputation rules to standardise records:

| Imputation / Correction Type | Record Count | % of Ingested |
| :--- | :---: | :---: |
| Coordinate Fallback (ISO Country Centroid) | 14,938 | 88.97% |
| Deaths Zero-Imputation (`deaths_is_missing` = True) | 3,232 | 19.25% |
| Total Affected Calculated from Components | 0 | 0.00% |
| Start Month Imputed (to June / 6) | 66 | 0.39% |
| Start Day Imputed (to 1st) | 1,546 | 9.21% |
| End Month Imputed (to June / 6) | 128 | 0.76% |
| End Day Imputed (to 1st) | 1,448 | 8.62% |
| Start Day Clipped (invalid day of month) | 0 | 0.00% |
| End Day Clipped (invalid day of month) | 0 | 0.00% |

---

## 3. List of Skipped Records

Below is the complete list of all **64 skipped records** that were dropped or failed schema validation constraints during ingestion:

| Row # | DisNo. | Country | Year | Disaster Type | Reason for Dropping |
| :--- | :--- | :--- | :---: | :--- | :--- |
| 1 | `1988-0424-VEN` | Venezuela (Bolivarian Republic of) | 2026 | Storm | Pre-2000 Historical Record (Start Year: 2026) |
| 2 | `2024-0074-ZAF` | South Africa | 2024 | Storm | Chronologically Inverted Dates (Start: 2024-01-07, End: 2024-01-01) |
| 3 | `2014-0426-ZMB` | Zambia | 2014 | Flood | Chronologically Inverted Dates (Start: 2014-06-01, End: 2014-05-01) |
| 4 | `2013-0573-NAM` | Namibia | 2013 | Epidemic | Chronologically Inverted Dates (Start: 2013-11-01, End: 2013-06-01) |
| 5 | `1999-9388-SOM` | Somalia | 2000 | Drought | Pre-2000 Historical Record (Start Year: 2000) |
| 6 | `2025-0096-TZA` | United Republic of Tanzania | 2025 | Epidemic | Chronologically Inverted Dates (Start: 2025-01-13, End: 2025-01-01) |
| 7 | `2004-9577-TZA` | United Republic of Tanzania | 2004 | Drought | Chronologically Inverted Dates (Start: 2004-10-01, End: 2004-06-01) |
| 8 | `2007-9514-BRA` | Brazil | 2007 | Drought | Chronologically Inverted Dates (Start: 2007-10-01, End: 2007-06-01) |
| 9 | `2008-0633-DEU` | Germany | 2009 | Extreme temperature | Chronologically Inverted Dates (Start: 2009-01-05, End: 2009-01-01) |
| 10 | `2000-9495-AZE` | Azerbaijan | 2000 | Drought | Chronologically Inverted Dates (Start: 2000-10-01, End: 2000-06-01) |
| 11 | `2000-9860-NIC` | Nicaragua | 2000 | Drought | Chronologically Inverted Dates (Start: 2000-07-01, End: 2000-06-01) |
| 12 | `1999-9388-DJI` | Djibouti | 2001 | Drought | Pre-2000 Historical Record (Start Year: 2001) |
| 13 | `1999-9388-SDN` | Sudan | 2000 | Drought | Pre-2000 Historical Record (Start Year: 2000) |
| 14 | `2000-9626-CHN` | China | 2000 | Drought | Chronologically Inverted Dates (Start: 2000-09-01, End: 2000-06-01) |
| 15 | `2000-9712-USA` | United States of America | 2000 | Drought | Chronologically Inverted Dates (Start: 2000-11-01, End: 2000-06-01) |
| 16 | `2001-9383-GTM` | Guatemala | 2001 | Drought | Chronologically Inverted Dates (Start: 2001-09-01, End: 2001-06-01) |
| 17 | `2002-9349-IND` | India | 2002 | Drought | Chronologically Inverted Dates (Start: 2002-07-01, End: 2002-06-01) |
| 18 | `2002-9564-CHN` | China | 2002 | Drought | Chronologically Inverted Dates (Start: 2002-09-01, End: 2002-06-01) |
| 19 | `2002-9605-BRA` | Brazil | 2002 | Drought | Chronologically Inverted Dates (Start: 2002-09-01, End: 2002-06-01) |
| 20 | `2004-9288-KEN` | Kenya | 2004 | Drought | Chronologically Inverted Dates (Start: 2004-07-01, End: 2004-06-01) |
| 21 | `2004-9332-CUB` | Cuba | 2004 | Drought | Chronologically Inverted Dates (Start: 2004-08-01, End: 2004-06-01) |
| 22 | `2005-9746-CHN` | China | 2005 | Drought | Chronologically Inverted Dates (Start: 2005-07-07, End: 2005-06-01) |
| 23 | `2006-9554-AUS` | Australia | 2006 | Drought | Chronologically Inverted Dates (Start: 2006-10-01, End: 2006-06-01) |
| 24 | `2007-0604-ZWE` | Zimbabwe | 2007 | Flood | Chronologically Inverted Dates (Start: 2007-12-13, End: 2007-12-01) |
| 25 | `2007-0610-IDN` | Indonesia | 2007 | Flood | Chronologically Inverted Dates (Start: 2007-12-25, End: 2007-12-01) |
| 26 | `2007-9288-SWZ` | Eswatini | 2007 | Drought | Chronologically Inverted Dates (Start: 2007-07-01, End: 2007-06-01) |
| 27 | `2009-0087-MLI` | Mali | 2009 | Epidemic | Chronologically Inverted Dates (Start: 2009-06-01, End: 2009-04-05) |
| 28 | `2010-0131-NGA` | Nigeria | 2010 | Epidemic | Chronologically Inverted Dates (Start: 2010-06-01, End: 2010-03-24) |
| 29 | `2010-9556-BRA` | Brazil | 2010 | Drought | Chronologically Inverted Dates (Start: 2010-10-01, End: 2010-06-01) |
| 30 | `2011-9390-TUV` | Tuvalu | 2011 | Drought | Chronologically Inverted Dates (Start: 2011-09-01, End: 2011-06-01) |
| 31 | `2015-0412-IDN` | Indonesia | 2015 | Flood | Chronologically Inverted Dates (Start: 2015-07-15, End: 2015-07-01) |
| 32 | `2016-9495-FSM` | Micronesia (Federated States of) | 2016 | Drought | Chronologically Inverted Dates (Start: 2016-06-01, End: 2016-05-01) |
| 33 | `2019-0082-AFG` | Afghanistan | 2019 | Flood | Chronologically Inverted Dates (Start: 2019-03-02, End: 2019-03-01) |
| 34 | `2000-9860-HND` | Honduras | 2000 | Drought | Chronologically Inverted Dates (Start: 2000-07-01, End: 2000-06-01) |
| 35 | `2001-9383-NIC` | Nicaragua | 2001 | Drought | Chronologically Inverted Dates (Start: 2001-08-01, End: 2001-06-01) |
| 36 | `2002-9487-SEN` | Senegal | 2002 | Drought | Chronologically Inverted Dates (Start: 2002-08-01, End: 2002-06-01) |
| 37 | `2004-9363-HND` | Honduras | 2004 | Drought | Chronologically Inverted Dates (Start: 2004-07-01, End: 2004-06-01) |
| 38 | `2005-9734-PRY` | Paraguay | 2005 | Drought | Chronologically Inverted Dates (Start: 2005-10-14, End: 2005-06-01) |
| 39 | `2005-9745-CHN` | China | 2005 | Drought | Chronologically Inverted Dates (Start: 2005-10-01, End: 2005-06-01) |
| 40 | `2006-0480-BDI` | Burundi | 2006 | Flood | Chronologically Inverted Dates (Start: 2006-08-26, End: 2006-08-01) |
| 41 | `2006-9570-AFG` | Afghanistan | 2006 | Drought | Chronologically Inverted Dates (Start: 2006-07-01, End: 2006-06-01) |
| 42 | `2006-9723-NPL` | Nepal | 2006 | Drought | Chronologically Inverted Dates (Start: 2006-07-01, End: 2006-06-01) |
| 43 | `2007-0508-SOM` | Somalia | 2007 | Epidemic | Chronologically Inverted Dates (Start: 2007-07-01, End: 2007-06-01) |
| 44 | `2008-9550-PRY` | Paraguay | 2008 | Drought | Chronologically Inverted Dates (Start: 2008-09-01, End: 2008-06-01) |
| 45 | `2010-0131-GHA` | Ghana | 2010 | Epidemic | Chronologically Inverted Dates (Start: 2010-06-01, End: 2010-03-02) |
| 46 | `2010-0131-BEN` | Benin | 2010 | Epidemic | Chronologically Inverted Dates (Start: 2010-06-01, End: 2010-03-01) |
| 47 | `2012-9478-MDA` | Republic of Moldova | 2012 | Drought | Chronologically Inverted Dates (Start: 2012-11-01, End: 2012-06-01) |
| 48 | `2025-9788-MDG` | Madagascar | 2025 | Drought | Chronologically Inverted Dates (Start: 2025-09-01, End: 2025-06-01) |
| 49 | `2019-0630-TZA` | United Republic of Tanzania | 2020 | Infestation | Chronologically Inverted Dates (Start: 2020-02-03, End: 2020-02-01) |
| 50 | `2022-9254-NER` | Niger | 2022 | Drought | Chronologically Inverted Dates (Start: 2022-06-01, End: 2022-05-01) |
| 51 | `2024-0838-CAF` | Central African Republic | 2024 | Flood | Chronologically Inverted Dates (Start: 2024-08-18, End: 2024-08-01) |
| 52 | `2000-9327-JOR` | Jordan | 2000 | Drought | Chronologically Inverted Dates (Start: 2000-08-01, End: 2000-06-01) |
| 53 | `2000-9531-CHN` | China | 2000 | Drought | Chronologically Inverted Dates (Start: 2000-08-01, End: 2000-06-01) |
| 54 | `2000-9537-BIH` | Bosnia and Herzegovina | 2000 | Drought | Chronologically Inverted Dates (Start: 2000-08-01, End: 2000-06-01) |
| 55 | `2001-9525-KHM` | Cambodia | 2001 | Drought | Chronologically Inverted Dates (Start: 2001-09-01, End: 2001-06-01) |
| 56 | `2003-9360-CHN` | China | 2003 | Drought | Chronologically Inverted Dates (Start: 2003-07-01, End: 2003-06-01) |
| 57 | `2006-0728-PAN` | Panama | 2006 | Wildfire | Chronologically Inverted Dates (Start: 2006-12-20, End: 2006-06-01) |
| 58 | `2006-0729-MSR` | Montserrat | 2006 | Volcanic activity | Chronologically Inverted Dates (Start: 2006-12-26, End: 2006-06-01) |
| 59 | `2006-9411-LTU` | Lithuania | 2006 | Drought | Chronologically Inverted Dates (Start: 2006-08-01, End: 2006-06-01) |
| 60 | `2007-9499-MWI` | Malawi | 2007 | Drought | Chronologically Inverted Dates (Start: 2007-10-01, End: 2007-06-01) |
| 61 | `2008-0602-AFG` | Afghanistan | 2008 | Epidemic | Chronologically Inverted Dates (Start: 2008-10-06, End: 2008-06-01) |
| 62 | `2009-0128-BRA` | Brazil | 2009 | Epidemic | Chronologically Inverted Dates (Start: 2009-06-01, End: 2009-03-31) |
| 63 | `2013-0399-SSD` | South Sudan | 2013 | Epidemic | Chronologically Inverted Dates (Start: 2013-10-14, End: 2013-10-01) |
| 64 | `2015-0610-JPN` | Japan | 2015 | Extreme temperature | Chronologically Inverted Dates (Start: 2015-05-11, End: 2015-05-01) |

---

## 4. Sample of Corrected / Imputed Records

A total of **15,427** records required one or more corrections. Below is a sample of **the first 50 corrected records** with details of modifications applied:

| DisNo. | Country | Year | Disaster Type | Corrections / Imputations Applied |
| :--- | :--- | :---: | :--- | :--- |
| `2025-0303-ECU` | Ecuador | 2025 | Earthquake | Imputed missing deaths to 0 |
| `2026-0153-KEN` | Kenya | 2026 | Flood | Resolved missing coordinates via country centroid fallback |
| `2026-0305-AFG` | Afghanistan | 2026 | Flood | Resolved missing coordinates via country centroid fallback |
| `2024-0962-AGO` | Angola | 2025 | Epidemic | Resolved missing coordinates via country centroid fallback; Imputed missing end day to 1 |
| `2025-9122-SOM` | Somalia | 2025 | Drought | Imputed missing deaths to 0; Resolved missing coordinates via country centroid fallback; Imputed missing start day to 1; Imputed missing end day to 1 |
| `2026-0174-SYR` | Syrian Arab Republic | 2026 | Storm | Resolved missing coordinates via country centroid fallback |
| `2025-0272-KGZ` | Kyrgyzstan | 2025 | Epidemic | Resolved missing coordinates via country centroid fallback |
| `2026-0227-BGD` | Bangladesh | 2026 | Epidemic | Resolved missing coordinates via country centroid fallback |
| `2026-0271-MYS` | Malaysia | 2026 | Fire (Miscellaneous) | Imputed missing deaths to 0; Resolved missing coordinates via country centroid fallback |
| `2026-0310-COD` | Democratic Republic of the Congo | 2026 | Flood | Resolved missing coordinates via country centroid fallback |
| `2026-0356-PAK` | Pakistan | 2026 | Road | Resolved missing coordinates via country centroid fallback |
| `2026-0358-PHL` | Philippines | 2026 | Collapse (Industrial) | Resolved missing coordinates via country centroid fallback |
| `2026-0360-KEN` | Kenya | 2026 | Fire (Miscellaneous) | Resolved missing coordinates via country centroid fallback |
| `2025-0694-SOM` | Somalia | 2025 | Epidemic | Resolved missing coordinates via country centroid fallback; Imputed missing start month to 6; Imputed missing start day to 1; Imputed missing end month to 6; Imputed missing end day to 1 |
| `2025-0647-GNQ` | Equatorial Guinea | 2025 | Flood | Imputed missing deaths to 0; Resolved missing coordinates via country centroid fallback |
| `2026-0313-CHN` | China | 2026 | Explosion (Industrial) | Resolved missing coordinates via country centroid fallback |
| `2026-0351-LKA` | Sri Lanka | 2026 | Fire (Miscellaneous) | Resolved missing coordinates via country centroid fallback |
| `2026-0355-CHN` | China | 2026 | Explosion (Industrial) | Resolved missing coordinates via country centroid fallback |
| `2026-0363-USA` | United States of America | 2026 | Chemical spill | Resolved missing coordinates via country centroid fallback |
| `2026-0320-IDN` | Indonesia | 2026 | Road | Resolved missing coordinates via country centroid fallback |
| `2026-0343-CHN` | China | 2026 | Flood | Resolved missing coordinates via country centroid fallback |
| `2026-0347-MLT` | Malta | 2026 | Water | Resolved missing coordinates via country centroid fallback |
| `2026-0350-IND` | India | 2026 | Fire (Miscellaneous) | Resolved missing coordinates via country centroid fallback |
| `2026-0354-MAR` | Morocco | 2026 | Collapse (Miscellaneous) | Resolved missing coordinates via country centroid fallback |
| `2026-0357-AGO` | Angola | 2026 | Collapse (Industrial) | Resolved missing coordinates via country centroid fallback |
| `2026-0359-CHN` | China | 2026 | Road | Resolved missing coordinates via country centroid fallback |
| `2026-0337-CAF` | Central African Republic | 2026 | Collapse (Industrial) | Resolved missing coordinates via country centroid fallback |
| `2026-0361-AFG` | Afghanistan | 2026 | Road | Resolved missing coordinates via country centroid fallback |
| `2026-0346-IRQ` | Iraq | 2026 | Road | Resolved missing coordinates via country centroid fallback |
| `2025-1089-MDG` | Madagascar | 2025 | Epidemic | Resolved missing coordinates via country centroid fallback; Imputed missing start day to 1 |
| `2025-0161-ARG` | Argentina | 2025 | Flood | Resolved missing coordinates via country centroid fallback |
| `2026-0353-AFG` | Afghanistan | 2026 | Flood | Resolved missing coordinates via country centroid fallback |
| `2026-0338-MYS` | Malaysia | 2026 | Water | Resolved missing coordinates via country centroid fallback |
| `2000-0237-CHN` | China | 2000 | Road | Resolved missing coordinates via country centroid fallback |
| `2005-0795-SOM` | Somalia | 2005 | Water | Resolved missing coordinates via country centroid fallback |
| `2005-0799-NGA` | Nigeria | 2005 | Water | Resolved missing coordinates via country centroid fallback |
| `2006-0375-MLI` | Mali | 2006 | Road | Resolved missing coordinates via country centroid fallback |
| `2006-0454-HUN` | Hungary | 2006 | Storm | Resolved missing coordinates via country centroid fallback |
| `2000-0703-NGA` | Nigeria | 2000 | Road | Resolved missing coordinates via country centroid fallback |
| `2006-0467-IND` | India | 2006 | Road | Resolved missing coordinates via country centroid fallback |
| `2007-0481-IND` | India | 2007 | Road | Resolved missing coordinates via country centroid fallback |
| `2007-0588-SOM` | Somalia | 2007 | Road | Resolved missing coordinates via country centroid fallback |
| `2007-0631-TUR` | Türkiye | 2007 | Water | Resolved missing coordinates via country centroid fallback |
| `2000-0704-NGA` | Nigeria | 2000 | Water | Resolved missing coordinates via country centroid fallback |
| `2000-0707-TWN` | Taiwan (Province of China) | 2000 | Air | Resolved missing coordinates via country centroid fallback |
| `2002-0222-GRC` | Greece | 2002 | Water | Resolved missing coordinates via country centroid fallback |
| `2002-0346-UGA` | Uganda | 2002 | Water | Resolved missing coordinates via country centroid fallback |
| `2003-0409-BRA` | Brazil | 2003 | Air | Resolved missing coordinates via country centroid fallback |
| `2003-0410-CHN` | China | 2003 | Road | Resolved missing coordinates via country centroid fallback |
| `2005-0800-BGD` | Bangladesh | 2005 | Water | Resolved missing coordinates via country centroid fallback |

*(Note: The full list of corrections is saved in JSON format under `reports/ingestion_details.json`)*
