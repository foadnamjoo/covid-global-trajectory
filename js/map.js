/** Class representing the map view. */
class MapVis {
  
  /**
   * Creates a Map Visualization
   * @param {object} globalApplicationState - shared state with data + refs
   */
  constructor(globalApplicationState) {
    this.globalApplicationState = globalApplicationState;


    this.svg = d3.select("#map");
    this.tooltip = d3.select("#tooltip");

    this.oceanLayer = this.svg.select("#ocean-layer").empty()
      ? this.svg.insert("g", ":first-child").attr("id", "ocean-layer")
      : this.svg.select("#ocean-layer");

    this.graticuleLayer = this.svg.select("#graticules").empty()
      ? this.svg.append("g").attr("id", "graticules")
      : this.svg.select("#graticules");

    this.countriesLayer = this.svg.select("#countries").empty()
      ? this.svg.append("g").attr("id", "countries")
      : this.svg.select("#countries");

    this.outlineLayer = this.svg.select("#outline-layer").empty()
      ? this.svg.append("g").attr("id", "outline-layer")
      : this.svg.select("#outline-layer");

    this.legendLayer = this.svg.select("#legend-layer").empty()
      ? this.svg.append("g").attr("id", "legend-layer")
      : this.svg.select("#legend-layer");

    if (!this.svg.attr("width"))  this.svg.attr("width", 720);
    if (!this.svg.attr("height")) this.svg.attr("height", 720);
    const width  = +this.svg.attr("width");
    const height = +this.svg.attr("height");

    const topo = this.globalApplicationState.mapData;
    const objKey = topo.objects ? Object.keys(topo.objects)[0] : null;
    if (!objKey) {
      console.error("world.json TopoJSON missing 'objects' key");
      return;
    }

    const worldFC = topojson.feature(topo, topo.objects[objKey]);
    const countryFeatures = worldFC.features || [];
    this.worldFC = worldFC;
    this.width = width;
    this.height = height;

    const projection = d3.geoNaturalEarth1().fitSize([width, height], worldFC);
    this.projection = projection;
    this.path = d3.geoPath(projection);
    this.projectionType = "naturalEarth";
    this.rotation = [0, 0, 0];
    this.wasDrag = false;

    const grat = d3.geoGraticule();
    this.grat = grat;
    this.graticuleLayer.append("path")
      .attr("class", "graticule-lines")
      .attr("d", this.path(grat()))
      .attr("fill", "none")
      .attr("stroke-width", 0.35)
      .attr("opacity", 0.45);

    this.outlineLayer.append("path")
      .attr("class", "graticule-outline")
      .attr("d", this.path(grat.outline()))
      .attr("fill", "none")
      .attr("stroke-width", 0.8);


    const covid = this.globalApplicationState.covidData;


    const maxByISO = d3.rollup(
      covid,
      rows => d3.max(rows, r => {
        const v = +r.total_cases_per_million;
        return Number.isFinite(v) ? v : 0;
      }),
      r => r.iso_code
    );

    const nameByISO = new Map();
    if (covid) {
      covid.forEach((r) => {
        if (r.iso_code && r.location && !nameByISO.has(r.iso_code)) {
          nameByISO.set(r.iso_code, r.location);
        }
      });
    }
    this.nameByISO = nameByISO;

    const globalMax = d3.max([...maxByISO.values()].map(v => v || 0)) || 0;


    this.color = d3.scaleSequential()
      .domain([0, globalMax || 1])
      .interpolator(d3.interpolateYlGnBu);


    const self = this;

    const countryPaths = this.countriesLayer.selectAll("path.country")
      .data(countryFeatures, d => d.properties?.iso_a3 || d.id || d.properties?.name);

    countryPaths.enter()
      .append("path")
      .attr("class", "country")
      .attr("d", d => self.path(d))
      .attr("fill", d => {
        const iso3 = d.properties?.iso_a3 || d.id;
        const maxVal = maxByISO.get(iso3) || 0;
        return self.color(maxVal);
      })
      .attr("stroke-width", 0.25)
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        const iso3 = d.properties?.iso_a3 || d.id;
        const maxVal = iso3 ? maxByISO.get(iso3) || 0 : 0;
        const name = self.nameByISO.get(iso3) || self.nameByISO.get(String(iso3)) || d.properties?.name || iso3 || "Unknown";
        const fmt = d3.format(",.0f");

        self.tooltip
          .classed("visible", true)
          .style("left", (event.pageX + 18) + "px")
          .style("top", (event.pageY - 18) + "px")
          .html(
            `<strong>${name}</strong><br/>` +
            `Max total cases per million:<br/><span>${fmt(maxVal)}</span>`
          );
      })
      .on("mousemove", function (event) {
        self.tooltip
          .style("left", (event.pageX + 18) + "px")
          .style("top", (event.pageY - 18) + "px");
      })
      .on("mouseleave", function () {
        self.tooltip.classed("visible", false);
      })
      .on("click", function (event, d) {
        if (self.projectionType === "globe" && self.wasDrag) return;
        const iso3 = d.properties?.iso_a3 || d.id;
        if (!iso3) return;
        const iso = typeof iso3 === "string" ? iso3 : String(iso3);

        const sel = self.globalApplicationState.selectedLocations;
        const idx = sel.indexOf(iso);
        if (idx === -1) {
          sel.push(iso);
        } else {
          sel.splice(idx, 1);
        }


        self.updateSelectedCountries();

        if (self.globalApplicationState.lineChart &&
            typeof self.globalApplicationState.lineChart.updateSelectedCountries === "function") {
          self.globalApplicationState.lineChart.updateSelectedCountries();
        }
        if (self.globalApplicationState.populationChart &&
            typeof self.globalApplicationState.populationChart.updateSelectedCountries === "function") {
          self.globalApplicationState.populationChart.updateSelectedCountries();
        }
        try {
          window.dispatchEvent(new CustomEvent("countrySelectionChanged"));
        } catch (_) {}
      });


    const legendW = 240;
    const legendH = 10;
    const padding = 12;
    const legendX = 20;
    const legendY = height - legendH - 40;


    const defs = this.svg.select("defs").empty()
      ? this.svg.append("defs")
      : this.svg.select("defs");

    const gradId = "map-legend-gradient";
    const gradient = defs.select(`#${gradId}`).empty()
      ? defs.append("linearGradient").attr("id", gradId)
      : defs.select(`#${gradId}`);

    gradient
      .attr("x1", "0%").attr("x2", "100%")
      .attr("y1", "0%").attr("y2", "0%");

    const stops = d3.range(0, 1.0001, 0.1);
    const legendDomain = [0, globalMax || 1];
    gradient.selectAll("stop")
      .data(stops)
      .join("stop")
      .attr("offset", d => `${d * 100}%`)
      .attr("stop-color", d => this.color(d3.interpolateNumber(legendDomain[0], legendDomain[1])(d)));


    this.legendLayer.selectAll("rect.legend-bar").data([null]).join("rect")
      .attr("class", "legend-bar")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendW)
      .attr("height", legendH)
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("fill", `url(#${gradId})`)
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 0.5);


    const legendScale = d3.scaleLinear().domain(legendDomain).range([legendX, legendX + legendW]);
    const ticks = [legendDomain[0], legendDomain[1] / 2, legendDomain[1]];

    this.legendLayer.selectAll("text.legend-tick")
      .data(ticks)
      .join("text")
      .attr("class", "legend-tick")
      .attr("x", d => legendScale(d))
      .attr("y", legendY + legendH + padding)
      .attr("text-anchor", (d, i) => (i === 0 ? "start" : i === 2 ? "end" : "middle"))
      .attr("font-size", 11)
      .attr("fill", "#64748b")
      .text(d3.format(".2~s"));

    this.legendLayer.selectAll("text.legend-title")
      .data([null])
      .join("text")
      .attr("class", "legend-title")
      .attr("x", legendX)
      .attr("y", legendY - 8)
      .attr("font-size", 12)
      .attr("font-weight", 600)
      .attr("fill", "#475569")
      .text("Peak cases per million");
  }

  updateSelectedCountries () {
    const sel = new Set(this.globalApplicationState.selectedLocations || []);
    const getIso = (d) => d.properties?.iso_a3 || d.id;
    this.countriesLayer.selectAll("path.country")
      .classed("selected", d => sel.has(getIso(d)) || sel.has(String(getIso(d))))
      .attr("stroke-width", d => (sel.has(getIso(d)) || sel.has(String(getIso(d))) ? 1.5 : 0.25))
      .attr("opacity", d => (sel.size === 0 || sel.has(getIso(d)) || sel.has(String(getIso(d)))) ? 1.0 : 0.35);
  }

  redrawGlobe (skipGraticule) {
    if (!skipGraticule) {
      this.graticuleLayer.select(".graticule-lines").attr("d", this.path(this.grat()));
      this.outlineLayer.select(".graticule-outline").attr("d", this.path(this.grat.outline()));
    }
    this.countriesLayer.selectAll("path.country").attr("d", d => this.path(d));
  }

  setupGlobeDrag () {
    const self = this;
    let startRotate;
    let startXY;
    let rafId = null;
    let lastRedraw = 0;
    const minRedrawInterval = 24;

    const scheduleRedraw = (skipGraticule) => {
      const now = Date.now();
      if (rafId != null) return;
      if (now - lastRedraw < minRedrawInterval) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        lastRedraw = Date.now();
        self.redrawGlobe(skipGraticule);
      });
    };

    this.svg
      .style("cursor", "grab")
      .on("mousedown.glove", function (event) {
        if (event.button !== 0) return;
        self.wasDrag = false;
        startRotate = self.rotation.slice();
        startXY = [event.clientX, event.clientY];
      });

    this.svg
      .on("mousemove.glove", function (event) {
        if (startXY == null) return;
        self.wasDrag = true;
        event.preventDefault();
        const dx = event.clientX - startXY[0];
        const dy = event.clientY - startXY[1];
        const sensitivity = 0.4;
        self.rotation = [startRotate[0] + dx * sensitivity, startRotate[1] - dy * sensitivity, startRotate[2]];
        self.projection.rotate(self.rotation);
        scheduleRedraw(true);
        self.svg.style("cursor", "grabbing");
      });

    this.svg
      .on("mouseup.glove", function () {
        if (startXY != null) self.redrawGlobe(false);
        startXY = null;
        self.svg.style("cursor", "grab");
      })
      .on("mouseleave.glove", function () {
        if (startXY != null) self.redrawGlobe(false);
        startXY = null;
        self.svg.style("cursor", "grab");
      });

    this.svg.on("wheel.glove", function (event) {
      event.preventDefault();
      if (self.globeBaseScale == null || !self.zoomGroup) return;
      const k = event.deltaY > 0 ? 0.92 : 1.08;
      self.globeScale = Math.max(self.globeBaseScale * 0.5, Math.min(self.globeBaseScale * 2, self.globeScale * k));
      self.applyGlobeZoomTransform();
    }, { passive: false });
  }

  applyGlobeZoomTransform () {
    if (!this.zoomGroup || !this.globeCenter) return;
    const s = this.globeScale / this.globeBaseScale;
    const [cx, cy] = this.globeCenter;
    this.zoomGroup.attr("transform", `translate(${cx},${cy}) scale(${s}) translate(${-cx},${-cy})`);
  }

  removeGlobeDrag () {
    this.svg
      .style("cursor", null)
      .on("mousedown.glove", null)
      .on("mousemove.glove", null)
      .on("mouseup.glove", null)
      .on("mouseleave.glove", null)
      .on("wheel.glove", null);
  }

  setProjection (type) {
    this.removeGlobeDrag();

    if (this.zoomGroup) {
      const svg = this.svg.node();
      const legendNode = this.legendLayer.node();
      this.zoomGroup.selectAll("*").each(function () {
        svg.insertBefore(this, legendNode);
      });
      this.zoomGroup.remove();
      this.zoomGroup = null;
    }

    if (type === "globe") {
      const p = d3.geoOrthographic()
        .clipAngle(90)
        .fitSize([this.width, this.height], this.worldFC);
      this.globeBaseScale = p.scale();
      this.globeScale = this.globeBaseScale;
      this.rotation = [0, 0, 0];
      this.projection = p.rotate(this.rotation).scale(this.globeScale);
      this.path = d3.geoPath(this.projection);

      const r = Math.min(this.width, this.height) / 2;
      const cx = this.width / 2;
      const cy = this.height / 2;
      this.globeCenter = [cx, cy];
      this.oceanLayer.selectAll("*").remove();
      this.oceanLayer.append("circle")
        .attr("class", "globe-ocean")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", r)
        .attr("fill", "#a5d0ed");

      this.projectionType = "globe";
      this.redrawGlobe();

      this.zoomGroup = this.svg.insert("g", ":first-child").attr("id", "globe-zoom-group");
      [this.oceanLayer, this.graticuleLayer, this.countriesLayer, this.outlineLayer].forEach((l) => {
        if (l && l.node()) this.zoomGroup.node().appendChild(l.node());
      });
      this.graticuleLayer.style("opacity", 0);
      this.outlineLayer.style("opacity", 0);
      this.applyGlobeZoomTransform();

      this.setupGlobeDrag();
      return;
    }

    this.graticuleLayer.style("opacity", null);
    this.outlineLayer.style("opacity", null);
    this.oceanLayer.selectAll("*").remove();

    let p;
    switch (type) {
      case "equirectangular": p = d3.geoEquirectangular(); break;
      default: p = d3.geoNaturalEarth1();
    }
    this.projection = p.fitSize([this.width, this.height], this.worldFC);
    this.path = d3.geoPath(this.projection);
    this.projectionType = type;
    this.graticuleLayer.select(".graticule-lines").attr("d", this.path(this.grat()));
    this.outlineLayer.select(".graticule-outline").attr("d", this.path(this.grat.outline()));
    this.countriesLayer.selectAll("path.country").attr("d", d => this.path(d));
  }
}
