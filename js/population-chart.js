/** Horizontal bar chart for selected countries' population. */
class PopulationChart {
  constructor(globalApplicationState) {
    this.globalApplicationState = globalApplicationState;
    this.svg = d3.select("#population-chart");
    if (this.svg.empty()) return;

    const width = +this.svg.attr("width") || 860;
    const height = +this.svg.attr("height") || 220;
    this.margin = { top: 8, right: 80, bottom: 24, left: 120 };
    this.innerW = width - this.margin.left - this.margin.right;
    this.innerH = height - this.margin.top - this.margin.bottom;

    this.gBars = this.svg.select("#population-bars");
    this.gAxis = this.svg.select("#population-axis");

    this.gBars.attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);
    this.gAxis.attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);

    this.x = d3.scaleLinear().range([0, this.innerW]);
    this.y = d3.scaleBand().range([0, this.innerH]).padding(0.2);
    const colorblindPalette = [
      "#0173b2", "#de8f05", "#029e73", "#cc78bc", "#ca9161",
      "#fbafe4", "#949494", "#ece133", "#56b4e9", "#d55e00"
    ];
    this.color = d3.scaleOrdinal(colorblindPalette);
  }

  updateSelectedCountries() {
    const state = this.globalApplicationState;
    const sel = state.selectedLocations || [];
    const populationByIso = state.populationData || [];
    const popMap = new Map(
      populationByIso.map((d) => [String(d.iso_code).trim(), +d.population])
    );

    const nameByIso = new Map();
    (state.countryList || []).forEach((c) => nameByIso.set(c.iso_code, c.name));

    const data = sel
      .map((iso) => {
        const code = String(iso).trim();
        return {
          iso_code: code,
          name: nameByIso.get(code) || nameByIso.get(iso) || iso,
          population: popMap.get(code) || popMap.get(iso) || 0
        };
      })
      .filter((d) => d.name)
      .sort((a, b) => b.population - a.population);

    if (data.length === 0) {
      this.gBars.selectAll("*").remove();
      this.gAxis.selectAll("*").remove();
      return;
    }

    const maxPop = Math.max(d3.max(data, (d) => d.population) || 0, 1);
    this.x.domain([0, maxPop * 1.05]);
    this.y.domain(data.map((d) => d.name));
    this.color.domain(data.map((d) => d.name));

    const fmt = d3.format(".2s");

    const bars = this.gBars.selectAll("g.bar-group").data(data, (d) => d.iso_code);
    bars.exit().remove();
    const enter = bars.enter().append("g").attr("class", "bar-group");
    enter.append("rect").attr("class", "bar");
    enter.append("text").attr("class", "bar-label");
    const merge = enter.merge(bars);

    merge
      .attr("transform", (d) => `translate(0, ${this.y(d.name)})`)
      .select("rect.bar")
      .attr("height", this.y.bandwidth())
      .attr("width", (d) => (d.population > 0 ? this.x(d.population) : 0))
      .attr("fill", (d) => this.color(d.name));

    merge
      .select("text.bar-label")
      .attr("x", (d) => (d.population > 0 ? this.x(d.population) + 6 : 6))
      .attr("y", this.y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("font-size", 11)
      .attr("fill", "#334155")
      .text((d) => (d.population > 0 ? fmt(d.population) : "No data"));

    this.gAxis.selectAll("*").remove();
    this.gAxis
      .append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${this.innerH})`)
      .call(
        d3.axisBottom(this.x)
          .ticks(5)
          .tickFormat(fmt)
      );
    this.gAxis
      .append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(this.y).tickSize(0));
  }
}
