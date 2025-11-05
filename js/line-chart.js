/** Class representing the line chart view. */
class LineChart {
  /**
   * Creates a LineChart
   * @param globalApplicationState The shared global application state (has the data and map instance in it)
   */
  constructor(globalApplicationState) {

    this.globalApplicationState = globalApplicationState;

    this.svg = d3.select("#line-chart");
    if (!this.svg.attr("width"))  this.svg.attr("width", 900);
    if (!this.svg.attr("height")) this.svg.attr("height", 400);

    const width  = +this.svg.attr("width");
    const height = +this.svg.attr("height");

    this.margin = { top: 20, right: 20, bottom: 40, left: 80 };
    this.innerW = width  - this.margin.left - this.margin.right;
    this.innerH = height - this.margin.top  - this.margin.bottom;


    this.gX      = this.svg.select("#x-axis");
    this.gY      = this.svg.select("#y-axis");
    this.gLines  = this.svg.select("#lines");
    this.gOverlay= this.svg.select("#overlay");

    this.gX.attr("transform", `translate(${this.margin.left}, ${this.margin.top + this.innerH})`);
    this.gY.attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);
    this.gLines.attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);
    this.gOverlay.attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);





    this.parseDate = d3.timeParse("%Y-%m-%d");

    this.hoverLine = this.gOverlay.select("line")
      .attr("y1", 0)
      .attr("y2", this.innerH)
      .attr("stroke", "#555")
      .attr("stroke-dasharray", "3,3")
      .style("opacity", 0);

    this.capture = this.gOverlay.append("rect")
      .attr("width", this.innerW)
      .attr("height", this.innerH)
      .attr("fill", "transparent")
      .on("mousemove", (event) => this.onMouseMove_(event))
      .on("mouseleave", () => this.onMouseLeave_());

    this.labelG = this.gOverlay.append("g").attr("class", "hover-labels");


    this.x = d3.scaleTime().range([0, this.innerW]);
    this.y = d3.scaleLinear().range([this.innerH, 0]);


 
    this.parseDate = d3.timeParse("%Y-%m-%d");



    this.xAxis = d3.axisBottom(this.x).ticks(6).tickFormat(d3.timeFormat("%Y"));
    this.yAxis = d3.axisLeft(this.y).ticks(6).tickFormat(d3.format(".2s"));

    // --- Line generator ---
    this.line = d3.line()
      .x(d => this.x(d.date))
      .y(d => this.y(d.value));


    this.color = d3.scaleOrdinal(d3.schemeTableau10);


    this.svg.selectAll("text.x-label").data([null]).join("text")
      .attr("class", "x-label")
      .attr("x", this.margin.left + this.innerW / 2)
      .attr("y", this.margin.top + this.innerH + 32)
      .attr("text-anchor", "middle")
      .text("Date");

    this.svg.selectAll("text.y-label").data([null]).join("text")
      .attr("class", "y-label")
      .attr("transform", `translate(${this.margin.left - 56}, ${this.margin.top + this.innerH/2}) rotate(-90)`)
      .attr("text-anchor", "middle")
      .text("Total cases per million");

    this.renderContinents_();
  }

  renderContinents_() {
    const covid = this.globalApplicationState.covidData;
    if (!covid || !covid.length) return;
  

    const rows = covid.filter(d =>
      d.iso_code && d.iso_code.startsWith("OWID_") && d.location !== "World"
    );
  

    const grouped = d3.group(rows, d => d.location);
  

    const series = Array.from(grouped, ([key, rows]) => ({
      key,
      values: rows.map(r => ({
        date: this.parseDate(r.date),
        value: +r.total_cases_per_million || 0
      })).sort((a,b) => a.date - b.date)
    }));
  

    this.series = series;
  
    // Domains
    const xExtent = d3.extent(series.flatMap(s => s.values.map(v => v.date)));
    const yMax    = d3.max(series.flatMap(s => s.values.map(v => v.value))) || 0;
    this.x.domain(xExtent);
    this.y.domain([0, yMax]);
  
    // Axes
    this.gX.call(this.xAxis);
    this.gY.call(this.yAxis);
  
    // Colors
    this.color.domain(series.map(s => s.key));
  
    // Lines
    const update = this.gLines.selectAll("path.series").data(series, d => d.key);
    update.enter()
      .append("path")
      .attr("class", "series")
      .attr("fill", "none")
      .attr("stroke-width", 1.8)
      .merge(update)
      .attr("stroke", d => this.color(d.key))
      .attr("d", d => this.line(d.values));
    update.exit().remove();
  

    this.onMouseLeave_();
  }





  renderCountries_() {
    const covid = this.globalApplicationState.covidData;
    const selISO = new Set(this.globalApplicationState.selectedLocations || []);
    if (!covid || selISO.size === 0) return this.renderContinents_();
  

    const rows = covid.filter(d => selISO.has(d.iso_code));
  

    const grouped = d3.group(rows, d => d.location);
  

    const series = Array.from(grouped, ([key, rows]) => ({
      key, // country name
      values: rows.map(r => ({
        date: this.parseDate(r.date),
        value: +r.total_cases_per_million || 0
      })).sort((a,b) => a.date - b.date)
    }));
  
    // Save current series for hover
    this.series = series;
  

    const xExtent = d3.extent(series.flatMap(s => s.values.map(v => v.date)));
    const yMax    = d3.max(series.flatMap(s => s.values.map(v => v.value))) || 0;
    this.x.domain(xExtent);
    this.y.domain([0, yMax]);
  
    // Axes
    this.gX.call(this.xAxis);
    this.gY.call(this.yAxis);
  

    this.color.domain(series.map(s => s.key));
  
    // Lines
    const update = this.gLines.selectAll("path.series").data(series, d => d.key);
    update.enter()
      .append("path")
      .attr("class", "series")
      .attr("fill", "none")
      .attr("stroke-width", 2)
      .merge(update)
      .attr("stroke", d => this.color(d.key))
      .attr("d", d => this.line(d.values));
    update.exit().remove();
  
    this.onMouseLeave_();
  }
  


  
  
  updateSelectedCountries() {
    const sel = this.globalApplicationState.selectedLocations || [];
    if (sel.length === 0) {
      this.renderContinents_();
    } else {
      this.renderCountries_();
    }
  }
  


onMouseMove_(event) {
  if (!this.series || this.series.length === 0) return;

  const [mx] = d3.pointer(event, this.gOverlay.node());
  const clampedX = Math.max(0, Math.min(this.innerW, mx));
  const date = this.x.invert(clampedX);


  const items = this.series.map(s => {
    const arr = s.values;
    const i = d3.bisector(d => d.date).center(arr, date);
    const pt = arr[Math.max(0, Math.min(arr.length - 1, i))];
    return { key: s.key, y: pt ? pt.value : 0, date: pt ? pt.date : date };
  }).sort((a, b) => d3.descending(a.y, b.y));

  const xPos = this.x(items[0]?.date || date);
  this.hoverLine
    .attr("x1", xPos)
    .attr("x2", xPos)
    .style("opacity", 1);


  const isRight = xPos > this.innerW - 140;
  const xLabel  = isRight ? xPos - 8 : xPos + 8;
  const anchor  = isRight ? "end" : "start";
  const fmt     = d3.format(".3s");

  const labels = this.labelG.selectAll("text.hover-label").data(items, d => d.key);
  labels.join(
    enter => enter.append("text")
      .attr("class", "hover-label")
      .attr("font-size", 11)
      .attr("fill", d => this.color(d.key))
      .attr("x", xLabel)
      .attr("y", (d, i) => 12 + i * 14)
      .attr("text-anchor", anchor)
      .text(d => `${d.key}: ${fmt(d.y)}`),
    update => update
      .attr("fill", d => this.color(d.key))
      .attr("x", xLabel)
      .attr("y", (d, i) => 12 + i * 14)
      .attr("text-anchor", anchor)
      .text(d => `${d.key}: ${fmt(d.y)}`),
    exit => exit.remove()
  );
}

onMouseLeave_() {
  this.hoverLine.style("opacity", 0);
  this.labelG.selectAll("text.hover-label").remove();
}
}