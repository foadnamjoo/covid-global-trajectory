Global trajectory of COVID‑19
==============================

An interactive D3.js visualization that combines a **choropleth world map / 3D globe** with **time‑series and population plots** to show how COVID‑19 spread across countries.

https://user-images-placeholder/demo.gif  <!-- Replace with real GIF URL or local path -->

> Tip: Record a short GIF of you rotating the globe, switching map projections, searching/selecting a few countries, and clearing the view. Use that GIF in place of the placeholder above when you publish the repo.

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

Recording a GIF for your portfolio
----------------------------------

On macOS (your current setup):

1. **Record the screen**
   - Open QuickTime Player → `File` → `New Screen Recording`.
   - Select the browser window running `localhost:8000`.
   - Hit record, then:
     - Rotate and zoom the globe.
     - Switch map projections.
     - Use the **Select countries** search.
     - Show both the total‑cases and population plots updating.
     - Click **Clear Selected Countries**.
   - Stop the recording and save it (e.g. `assets/demo.mov`).

2. **Convert to GIF (via ffmpeg)**
   - Install `ffmpeg` once (if you don’t have it):

     ```bash
     brew install ffmpeg
     ```

   - From the project root, run:

     ```bash
     ffmpeg -i assets/demo.mov -vf "fps=12,scale=1200:-1:flags=lanczos" -loop 0 assets/demo.gif
     ```

   - This creates a reasonably sized, smooth GIF at `assets/demo.gif`.

3. **Embed the GIF in GitHub**
   - Replace the placeholder link at the top of this README with:

     ```markdown
     ![Interactive COVID‑19 visualization](assets/demo.gif)
     ```

   - Commit and push the changes (example):

     ```bash
     git add README.md assets/demo.gif
     git commit -m "Add demo GIF and documentation"
     git push origin main
     ```

Publishing the repo
-------------------

1. Create a **new public repository** on GitHub (e.g. `covid-global-trajectory`).
2. Point this local folder at it (once):

```bash
git remote add origin git@github.com:<your-username>/covid-global-trajectory.git
git branch -M main
git push -u origin main
```

You can now share the GitHub URL and the GIF in your portfolio or resume.

