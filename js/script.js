// ******* DATA LOADING *******
// We took care of that for you
async function loadData () {
  const covidData = await d3.csv('data/owid-covid.csv');
  const mapData = await d3.json('data/world.json');
  return { covidData, mapData };
}

const globalApplicationState = {
  selectedLocations: [],
  covidData: null,
  mapData: null,
  worldMap: null,
  lineChart: null,
};


loadData().then((loadedData) => {
  console.log('Here is the imported data:', loadedData.covidData);

  globalApplicationState.covidData = loadedData.covidData;
  globalApplicationState.mapData = loadedData.mapData;

  const worldMap = new MapVis(globalApplicationState);
  const lineChart = new LineChart(globalApplicationState);

  globalApplicationState.worldMap = worldMap;
  globalApplicationState.lineChart = lineChart;



document.getElementById("clear-button").addEventListener("click", () => {
  globalApplicationState.selectedLocations = [];

  if (globalApplicationState.worldMap &&
      typeof globalApplicationState.worldMap.updateSelectedCountries === "function") {
    globalApplicationState.worldMap.updateSelectedCountries();
  }

  if (globalApplicationState.lineChart &&
      typeof globalApplicationState.lineChart.updateSelectedCountries === "function") {
    globalApplicationState.lineChart.updateSelectedCountries();
  }
});



});
