/** Class representing the map view. */
class MapVis {
  
  /**
   * Creates a Map Visualization
   * @param {object} globalApplicationState - shared state with data + refs
   */
  constructor(globalApplicationState) {
    console.log("[MapVis] constructor start");
    // d3.select("#map").append("circle").attr("cx", 50).attr("cy", 50).attr("r", 10).attr("fill", "red");

    this.globalApplicationState = globalApplicationState;


    this.svg = d3.select("#map");

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

    if (!this.svg.attr("width"))  this.svg.attr("width", 900);
    if (!this.svg.attr("height")) this.svg.attr("height", 520);
    const width  = +this.svg.attr("width");
    const height = +this.svg.attr("height");


    const projection = d3.geoWinkel3()
      .scale(150)                // map size
      .translate([width / 2, height / 2]); // center in SVG

    this.projection = projection;
    this.path = d3.geoPath(projection);


    const grat = d3.geoGraticule(); // generator (not geometry)
    // Draw the graticule lines
    this.graticuleLayer.append("path")
      .attr("class", "graticule-lines")
      .attr("d", this.path(grat()))     // graticule() returns MultiLineString
      .attr("fill", "none")
      .attr("stroke", "#bbb")
      .attr("stroke-width", 0.5)
      .attr("opacity", 0.7);


    this.outlineLayer.append("path")
      .attr("class", "graticule-outline")
      .attr("d", this.path(grat.outline()))
      .attr("fill", "none")
      .attr("stroke", "#333")
      .attr("stroke-width", 1.2);


    const topo = this.globalApplicationState.mapData;

    const objKey = topo.objects
      ? Object.keys(topo.objects)[0]
      : null;

    if (!objKey) {
      console.error("world.json TopoJSON missing 'objects' key");
      return;
    }

    const worldFC = topojson.feature(topo, topo.objects[objKey]); // FeatureCollection
    const countryFeatures = worldFC.features || [];


    const covid = this.globalApplicationState.covidData;


    const maxByISO = d3.rollup(
      covid,
      rows => d3.max(rows, r => {
        const v = +r.total_cases_per_million;
        return Number.isFinite(v) ? v : 0;
      }),
      r => r.iso_code
    );

    const globalMax = d3.max([...maxByISO.values()].map(v => v || 0)) || 0;


    this.color = d3.scaleSequential()
      .domain([0, globalMax || 1]) // avoid [0,0] domain
      .interpolator(d3.interpolateYlOrRd);


    const self = this;

    const countryPaths = this.countriesLayer.selectAll("path.country")
      .data(countryFeatures, d => d.id || d.properties?.iso_a3 || d.properties?.name);

    countryPaths.enter()
      .append("path")
      .attr("class", "country")
      .attr("d", d => self.path(d))
      .attr("fill", d => {
        const iso3 = d.id || d.properties?.iso_a3; // prefer feature.id
        const maxVal = maxByISO.get(iso3) || 0;
        return self.color(maxVal);
      })
      .attr("stroke", "#333")
      .attr("stroke-width", 0.5)
      .style("cursor", "pointer")
      .on("click", function (event, d) {
        const iso3 = d.id || d.properties?.iso_a3;
        if (!iso3) return;

        const sel = self.globalApplicationState.selectedLocations;
        const idx = sel.indexOf(iso3);
        if (idx === -1) {
          sel.push(iso3);
        } else {
          sel.splice(idx, 1);
        }


        self.updateSelectedCountries();


        if (self.globalApplicationState.lineChart &&
            typeof self.globalApplicationState.lineChart.updateSelectedCountries === "function") {
          self.globalApplicationState.lineChart.updateSelectedCountries();
        }
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
      .attr("fill", `url(#${gradId})`)
      .attr("stroke", "#333")
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
      .text(d3.format(".2~s"));

    this.legendLayer.selectAll("text.legend-title")
      .data([null])
      .join("text")
      .attr("class", "legend-title")
      .attr("x", legendX)
      .attr("y", legendY - 6)
      .attr("font-size", 12)
      .attr("font-weight", 600)
      .text("Max total cases per million");
  }


  updateSelectedCountries () {
    const sel = new Set(this.globalApplicationState.selectedLocations || []);
    this.countriesLayer.selectAll("path.country")
      .classed("selected", d => sel.has(d.id || d.properties?.iso_a3))
      .attr("stroke-width", d => (sel.has(d.id || d.properties?.iso_a3) ? 2 : 0.5))
      .attr("opacity", d => (sel.size === 0 || sel.has(d.id || d.properties?.iso_a3)) ? 1.0 : 0.35);
  }
}
