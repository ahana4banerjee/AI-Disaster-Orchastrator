# AI Disaster Intelligence & Decision Support Platform

## UI/UX Design System & Experience Guidelines

---

# 1. Design Philosophy

This platform is not a consumer social app.

This is a Disaster Intelligence & Decision Support System.

The UI must communicate:

* Trust
* Authority
* Situational Awareness
* Operational Readiness
* Clarity Under Stress

The interface should feel like:

* Emergency Operations Center (EOC)
* FEMA Dashboard
* Government Intelligence Platform
* Military Situation Room
* Bloomberg Terminal (clean version)
* Modern Aviation Control Dashboard

It must NOT feel like:

* Startup SaaS template
* AI-generated dashboard
* Vibrant marketing website
* Crypto application
* Generic Tailwind admin panel

Every screen should feel deliberate, professional, and information-dense without becoming overwhelming.

---

# 2. Visual Design Language

## Design Keywords

* Operational
* Tactical
* Professional
* Minimal
* High Information Density
* Data First
* Map Centric
* Serious

---

# 3. Theme System

## Light Theme

### Backgrounds

| Element              | Color   |
| -------------------- | ------- |
| Primary Background   | #F7F9FC |
| Secondary Background | #FFFFFF |
| Card Background      | #FFFFFF |
| Sidebar              | #0F172A |
| Borders              | #E2E8F0 |

---

### Text

| Element   | Color   |
| --------- | ------- |
| Primary   | #0F172A |
| Secondary | #475569 |
| Muted     | #64748B |

---

## Dark Theme

### Backgrounds

| Element         | Color   |
| --------------- | ------- |
| Main Background | #020617 |
| Secondary       | #0F172A |
| Card            | #111827 |
| Elevated Card   | #1E293B |
| Border          | #334155 |

---

### Text

| Element   | Color   |
| --------- | ------- |
| Primary   | #F8FAFC |
| Secondary | #CBD5E1 |
| Muted     | #94A3B8 |

---

# 4. Operational Status Colors

These colors are reserved strictly for disaster severity and operational indicators.

### Low Risk

* Emerald 500
* #10B981

### Moderate Risk

* Amber 500
* #F59E0B

### High Risk

* Orange 500
* #F97316

### Extreme Risk

* Crimson
* #DC2626

### Critical Failure

* Dark Red
* #991B1B

---

# 5. Accent Colors

Avoid neon colors.

Use restrained intelligence-style accents.

### Primary Accent

Deep Indigo

#3B4CCA

### Secondary Accent

Steel Blue

#2563EB

### Analytics Accent

Teal

#0F766E

### AI Accent

Slate Purple

#6366F1

---

# 6. Typography

## Font Family

Primary:

Inter

Secondary:

IBM Plex Sans

Numeric:

JetBrains Mono

---

# 7. Global Layout Structure

Desktop First

---

## Sidebar

Width:

280px

Contains:

* Logo
* Navigation
* User Info
* Theme Toggle
* Logout

Always visible on desktop.

Collapsible.

---

## Top Navigation

Height:

72px

Contains:

* Search
* Global Notifications
* User Profile
* Breadcrumbs

Sticky.

---

## Content Area

Max Width:

1600px

Padding:

24px

Grid:

12 Column Layout

---

# 8. Routing Structure

## Public Portal

```text
/

├── /
│   ├── Hero
│   ├── Global Risk Snapshot
│   ├── Recent Events
│   └── CTA

├── /risk-checker

├── /preparedness

├── /readiness

├── /family-planner

├── /disaster-explorer

├── /awareness

├── /assistant

├── /about

└── /auth
```

---

## Admin Portal

```text
/admin

├── dashboard

├── analytics

├── records

├── predictor

├── similarity

├── risk-intelligence

├── cross-border

├── resources

├── scenarios

├── simulation

├── reports

├── audit-logs

├── settings

└── profile
```

---

# 9. Public Portal Pages

---

## Home Page

Purpose:

Public awareness.

Layout:

Hero Section

↓

Global Statistics

↓

Risk Snapshot Cards

↓

Recent Disasters Timeline

↓

Preparedness CTA

Cards:

* Total Events
* High Risk Regions
* Most Common Hazards
* Global Impact

---

## Risk Checker

Layout

Left:

Location Inputs

Right:

Results

Results Cards:

* Risk Score
* Risk Level
* Top Threats
* Historical Frequency

---

## Readiness Assessment

Multi-Step Form

Step 1

Family Details

Step 2

Resources

Step 3

Emergency Planning

Step 4

Assessment

Output:

Large Readiness Gauge

0-100

---

## Family Planner

Tabbed Interface

Tabs:

* Household
* Contacts
* Evacuation
* Medical

Output:

Generated PDF Plan

---

## Disaster Explorer

Layout

Filters Left

Map Right

Table Below

Supports:

* Country
* Type
* Year

---

# 10. Admin Dashboard

This is the flagship screen.

---

## Dashboard Layout

Top:

KPI Row

Middle:

Charts

Bottom:

Operational Intelligence

---

### KPI Cards

4 Column Grid

Cards:

* Total Events
* Extreme Events
* Avg Damage
* Avg Fatalities

Card Design:

Large Number

Small Trend Indicator

Mini Sparkline

---

### Analytics Section

Row 1

* Disaster Trend Chart
* Severity Distribution

Row 2

* Country Risk Ranking
* Regional Heatmap

---

### Intelligence Feed

Latest:

* Simulations
* Predictions
* Reports

Displayed as timeline.

---

# 11. Prediction Page

Route:

```text
/admin/predictor
```

Layout

Left Panel

Input Form

Right Panel

Prediction Results

---

## Result Cards

Severity Card

Large Badge

Confidence Meter

Risk Score Gauge

Predicted:

* Deaths
* Affected
* Damage

---

## Explainability Section

SHAP Contribution Bars

Top Drivers

Historical Similar Matches

Cards

---

# 12. Similarity Search Page

Route

```text
/admin/similarity
```

Top:

Input Filters

Below:

5 Similar Event Cards

Each Card:

* Year
* Country
* Magnitude
* Deaths
* Similarity %

---

# 13. Resource Planning Page

Route

```text
/admin/resources
```

Main View

Resource Table

Columns:

* Resource
* Required
* Available
* Deficit
* Status

Deficit Rows:

Highlighted automatically.

---

# 14. Scenario Comparison Page

Route

```text
/admin/scenarios
```

Supports

2–4 Scenarios

Displayed side-by-side.

Columns:

Scenario A

Scenario B

Scenario C

Scenario D

Rows:

* Severity
* Deaths
* Affected
* Damage
* Resources

---

# 15. Simulation Center

Route

```text
/admin/simulation
```

Most important page.

Should feel like mission control.

---

## Layout

Left

Simulation Controls

Center

Timeline

Right

Infrastructure Status

---

## Timeline

Hour 0

↓

Hour 6

↓

Hour 12

↓

Hour 24

↓

Hour 48

Animated progression.

---

## Status Cards

Power Grid

Transportation

Hospitals

Communications

Water Supply

Each:

Green

Amber

Red

States

---

## Live Feed

WebSocket updates.

Terminal-style event stream.

Example:

```text
[22:10]
Power Grid Failure Detected

[22:11]
Road Network Degraded

[22:13]
Hospital Capacity Critical
```

---

# 16. AI Situation Reports

Route

```text
/admin/reports
```

Layout

Reports Table

Preview Panel

Export Buttons

Preview resembles:

Government Briefing Document.

---

# 17. Skeleton Loading Design

Never show spinners for large pages.

Use skeletons.

---

## KPI Skeleton

Rectangle placeholders

Animated shimmer.

---

## Table Skeleton

10 fake rows.

---

## Chart Skeleton

Graph outline placeholders.

---

## Map Skeleton

Grey geographic placeholder.

---

## Simulation Skeleton

Timeline placeholders.

Status cards placeholders.

---

# 18. Card Design System

### Standard Card

```text
┌─────────────────┐
│ Title           │
│                 │
│ Main Content    │
│                 │
│ Footer          │
└─────────────────┘
```

Properties:

* Radius 16px
* Border 1px
* Soft Shadow
* Hover Elevation

---

## Intelligence Card

Used for:

Predictions

Reports

Alerts

Includes:

* Severity Strip
* Status Icon
* Metadata

---

# 19. Maps

Maps are a core experience.

Use:

Leaflet or Mapbox

Layers:

* Disaster Density
* Risk Clusters
* Event Markers
* Heatmaps

Dark theme maps preferred.

---

# 20. Animations

Use sparingly.

Allowed:

* Page fade
* Card hover
* Skeleton shimmer
* Timeline progression

Avoid:

* Bouncy animations
* Excessive motion
* Fancy transitions

---

# 21. Mobile Design

Public Portal:

Fully Responsive.

Admin Portal:

Tablet Supported.

Desktop First.

Simulation Center optimized for:

1440p and 4K displays.

---

# 22. Premium Feel Guidelines

To avoid "AI-generated dashboard" appearance:

### Do

* Consistent spacing system
* Data-first layouts
* Meaningful whitespace
* Rich maps
* Dense but readable tables
* Subtle shadows
* Serious iconography

### Avoid

* Glassmorphism everywhere
* Neon gradients
* Random colors
* Huge rounded corners
* Cartoon illustrations
* Generic SaaS cards
* Excessive AI branding

---

# 23. Design Inspiration References

Visual Inspiration:

* Palantir Gotham
* FEMA Emergency Dashboard
* ArcGIS Operations Dashboard
* Bloomberg Terminal
* NATO Situational Awareness Systems
* Modern Air Traffic Control Interfaces

Target Feeling:

**"Government-grade operational intelligence platform powered by AI, not an AI toy."**
