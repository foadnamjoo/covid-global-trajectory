Global trajectory of COVID‑19
==============================

An interactive D3.js visualization that combines a **choropleth world map / 3D globe** with **time‑series and population plots** to show how COVID‑19 spread across countries.

![Interactive COVID‑19 visualization](assets/demo.gif)

Features
--------

- **Interactive map / globe**
  - Choropleth colored by peak cases per million (colorblind‑aware, but left unchanged per assignment).
  - Projections: Natural Earth, Equirectangular, and an orthographic **Earth globe**.
  - Globe supports drag‑to‑rotate, smooth zoom (with sensible min/max limits), and country click selection.
  - Clean layout that keeps the entire visualization visible without scroll.

- **Country selection UX**
  - Search box with type‑ahead dropdown for country names.
  - Quick **Select all / Clear Selected Countries** controls and a live “_N selected_” counter.
  - Selections stay in sync between the map/globe, the line chart, and the population chart.

- **Charts**
  - **Total cases per million** (time series) for all selected countries.
  - **Country population** horizontal bar chart for the same selection.
  - Colorblind‑friendly, consistent palette across both charts.

- **Help & instructions**
  - “How to use” button opens a concise overlay that explains interaction patterns.

How to run locally
------------------

From the project root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

