# AI Disaster Intelligence & Decision Support Platform

## Enterprise Design System Specification

Version: 1.0

Status: Implementation Standard

---

# 1. Purpose

This document defines all visual, interaction, layout, accessibility, responsiveness, and component standards used throughout the platform.

No page, component, card, chart, table, modal, form, or dashboard should be implemented without following this specification.

The objective is to ensure:

* Visual consistency
* Enterprise-grade appearance
* Operational dashboard feel
* High information density
* Excellent usability under stress
* Professional government-grade aesthetics

---

# 2. UX Principles

## Principle 1 — Information First

Users are here to make decisions.

Not admire animations.

Every screen must prioritize:

1. Critical information
2. Situational awareness
3. Actionable insights

before aesthetics.

---

## Principle 2 — Zero Decoration

Every visual element must serve a purpose.

Avoid:

* decorative gradients
* floating shapes
* random illustrations
* marketing style graphics

---

## Principle 3 — Severity Driven Design

Severity colors communicate operational state.

Never use severity colors for decoration.

Red means danger.

Always.

---

## Principle 4 — Scanability

Users should understand:

* risk
* severity
* shortages
* failures

within 3 seconds.

---

# 3. Layout System

---

## Page Width

```css
max-width: 1600px;
margin: auto;
padding: 24px;
```

---

## Grid System

12 Column Grid

Desktop:

```text
|1|2|3|4|5|6|7|8|9|10|11|12|
```

Tablet:

6 Columns

Mobile:

1 Column

---

# 4. Spacing System

Only use:

```text
4px
8px
12px
16px
24px
32px
48px
64px
```

Never invent spacing values.

---

# 5. Border Radius

Cards:

```css
16px
```

Buttons:

```css
12px
```

Inputs:

```css
12px
```

Tables:

```css
12px
```

Modals:

```css
20px
```

Never exceed 20px.

---

# 6. Elevation System

Level 0

No Shadow

Used:

Tables

---

Level 1

```css
0 2px 6px rgba(0,0,0,.08)
```

Used:

Cards

---

Level 2

```css
0 8px 24px rgba(0,0,0,.12)
```

Used:

Dropdowns

Modals

---

# 7. Typography System

---

## Font Stack

Primary

```text
Inter
```

Fallback

```text
system-ui
```

Monospace

```text
JetBrains Mono
```

---

## Font Sizes

### H1

40px

Weight 700

---

### H2

32px

Weight 700

---

### H3

24px

Weight 600

---

### H4

20px

Weight 600

---

### Body

16px

Weight 400

---

### Small

14px

Weight 400

---

### Caption

12px

Weight 400

---

# 8. Color System

---

## Light Theme

### Background

```css
--bg-primary: #F7F9FC;
--bg-secondary: #FFFFFF;
```

---

### Text

```css
--text-primary: #0F172A;
--text-secondary: #475569;
```

---

## Dark Theme

### Background

```css
--bg-primary: #020617;
--bg-secondary: #0F172A;
```

---

### Text

```css
--text-primary: #F8FAFC;
--text-secondary: #CBD5E1;
```

---

# 9. Severity Scale

These colors are globally reserved.

---

## Low

```css
#10B981
```

Label

LOW

---

## Moderate

```css
#F59E0B
```

Label

MODERATE

---

## High

```css
#F97316
```

Label

HIGH

---

## Extreme

```css
#DC2626
```

Label

EXTREME

---

## Critical

```css
#991B1B
```

Label

CRITICAL

---

# 10. Navigation Design

---

## Sidebar Width

Expanded

```css
280px
```

Collapsed

```css
80px
```

---

## Sidebar Sections

### Admin

Dashboard

Analytics

Records

Predictor

Similarity Search

Risk Intelligence

Resources

Scenarios

Simulation Center

Reports

Audit Logs

Settings

---

### Public

Risk Checker

Preparedness

Readiness

Emergency Planner

Explorer

Awareness Hub

Assistant

---

# 11. Card System

---

## KPI Card

Contains:

```text
Title
Value
Trend
Sparkline
```

Example:

```text
Total Events

16,842

↑ 8.4%

Mini Trend
```

Height

140px

---

## Intelligence Card

Used:

Predictions

Alerts

Reports

Contains:

```text
Severity Badge
Title
Summary
Timestamp
Action
```

---

## Statistic Card

Used:

Regional Analytics

Contains:

```text
Metric
Value
Description
```

---

# 12. Table Design

Enterprise-style tables.

---

## Row Height

56px

---

## Header Height

60px

---

## Features

Mandatory:

* sorting
* filtering
* pagination
* sticky headers

---

## Admin Records Table

Columns:

* Event ID
* Disaster Type
* Country
* Region
* Magnitude
* Deaths
* Damage
* Date

---

# 13. Chart Standards

Only use:

Recharts

---

## Allowed Charts

### Line Chart

Trends

---

### Bar Chart

Comparisons

---

### Area Chart

Time progression

---

### Pie Chart

ONLY

Severity distribution

No other use.

---

### Treemap

Disaster type dominance

---

# 14. Map Standards

Maps are primary UI elements.

---

## Base Style

Dark Map Preferred

---

## Layers

Heatmap Layer

Event Layer

Risk Layer

Simulation Layer

---

## Marker Colors

Severity Based

Low

Green

Moderate

Amber

High

Orange

Extreme

Red

---

# 15. Forms

---

## Input Height

48px

---

## Label Position

Top

Always

Never use floating labels.

---

## Required Field

```text
*
```

after label

---

# 16. Prediction Result Design

Most important component.

---

Layout

```text
Severity
Confidence
Risk Score

↓

Deaths
Affected
Damage

↓

SHAP Explainability

↓

Similar Events
```

---

## Severity Badge

Size

Large

Example

```text
EXTREME
```

Red background

White text

---

## Confidence Meter

Progress bar

0–100%

---

## Risk Score

Circular Gauge

0–100

---

# 17. Simulation Center Design

Highest priority screen.

---

Layout

```text
-------------------------------------------------
Controls | Timeline | Infrastructure Status
-------------------------------------------------
```

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

---

## Infrastructure Status

Cards

Power Grid

Road Network

Hospitals

Water

Telecommunications

Fuel Supply

---

State Colors

Operational

Green

Degraded

Amber

Failed

Red

---

## Live Event Feed

Terminal-inspired.

Monospace.

Scrollable.

Newest first.

---

# 18. Report Viewer

Government briefing style.

---

Sections

Executive Summary

Situation Overview

Predicted Impact

Resource Analysis

Deficit Analysis

Recommendations

Appendix

---

# 19. Skeleton Loading

Never use full-screen spinners.

---

Use:

* card skeletons
* table skeletons
* chart skeletons
* map skeletons

---

Animation

Subtle shimmer

Duration

1.5s

---

# 20. Empty States

Every page must have empty states.

Example:

No Scenarios Found

Create your first scenario to begin simulation planning.

---

# 21. Toast Notifications

Top Right

---

Success

Green

---

Warning

Amber

---

Error

Red

---

Duration

4 seconds

---

# 22. Accessibility

Required WCAG AA compliance.

---

Contrast

Minimum 4.5:1

---

Keyboard Navigation

Required

---

Focus States

Required

---

Screen Reader Labels

Required

---

# 23. Mobile Rules

Public Portal

Fully Responsive

---

Admin Portal

Desktop First

Tablet Supported

---

Simulation Center

Desktop Only Experience

---

# 24. Icon System

Use:

Lucide React

Only.

---

Categories

Analytics

Maps

Resources

Reports

Risk

Simulation

Users

Settings

---

# 25. Animation Guidelines

Allowed

* fade
* slide
* skeleton shimmer
* timeline progression

---

Not Allowed

* bounce
* zoom explosions
* floating objects
* parallax
* flashy AI effects

---

# 26. Premium Feel Checklist

Every page must satisfy:

✓ Clear hierarchy

✓ High information density

✓ Professional spacing

✓ Consistent cards

✓ Operational colors

✓ Fast loading

✓ Map integration where relevant

✓ No marketing aesthetics

✓ No AI-generated appearance

✓ Looks suitable for emergency management authorities

---

# 27. Component Library (Must Build)

### Core

* Button
* Input
* Select
* MultiSelect
* DatePicker
* TextArea
* Checkbox
* Radio
* Switch

### Feedback

* Alert
* Toast
* Loader
* Skeleton

### Data

* DataTable
* KPI Card
* Stat Card
* Severity Badge
* Trend Indicator

### Maps

* Risk Map
* Event Map
* Simulation Map

### Simulation

* Timeline
* Event Feed
* Infrastructure Status Card
* Resource Deficit Card

### Reports

* Report Preview
* PDF Export Button

### AI

* SHAP Feature Card
* Similar Event Card
* Confidence Meter
* Risk Gauge
