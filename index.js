function readFile(file) {
  const rawFile = new XMLHttpRequest();
  rawFile.open("GET", file, false);
  let text = "";
  rawFile.onreadystatechange = function () {
    if (rawFile.readyState === 4) {
      if (rawFile.status === 200 || rawFile.status == 0) {
        text = rawFile.responseText;
      }
    }
  };
  rawFile.send(null);
  return text;
}

const infoURI = "info_df.csv";
const jhDataURI = "time_series_covid19_confirmed_US.csv";
const deathsURI = "deaths_US.csv";

const info_dfFile = readFile(infoURI);
const jhDataFile = readFile(jhDataURI);
const deathsFile = readFile(deathsURI);

const infoCSV = d3.csvParse(info_dfFile, d3.autoType);
const jhDataCSV = d3.csvParse(jhDataFile, d3.autoType);
const deathsCSV = d3.csvParse(deathsFile, d3.autoType);

console.log("jhDataCsv", jhDataCSV);
console.log("infoCSV", infoCSV);
console.log("deathsCSV", deathsCSV);

// Scatterplot data massaging

function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

// Just taking the raw CSV and parsing all fields. If the key is a valid date, we know that it
// represents a field that contains a number of cases. Otherwise, we know it's just metatdata
// that can be ignored for scatterplot purposes
const mergedJhData = jhDataCSV.reduce((acc, node) => {
  let total = 0;

  Object.keys(node).forEach((key) => {
    if (isValidDate(key)) {
      total += node[key];
    }
  });

  // FIPS is a unique county identification code
  acc[node.FIPS] = { cases: total, deaths: 0 };
  return acc;
}, {});

// Adding deaths to the mergedJhData
deathsCSV.forEach((node) => {
  let total = 0;

  Object.keys(node).forEach((key) => {
    if (isValidDate(key)) {
      total += node[key];
    }
  });

  mergedJhData[node.FIPS].deaths = total;
});

// Converting the list to a map with the same unique identifier as in mergedJhData so that we can easily
// create scatterplot points
const locationToInfoMap = infoCSV.reduce((acc, node) => {
  // info_df uses lowercase for fips
  acc[node.fips] = node;

  return acc;
}, {});

console.log("merged", mergedJhData);
console.log("mapped", locationToInfoMap);

// Creates an array of tuples containing [x, y] mapping of number of total cases to {variable}, where
// variable is a field in info_df.csv
function generateScatterplotPoints(variable) {
  return Object.entries(mergedJhData).reduce((acc, [key, value]) => {
    if (locationToInfoMap[key] && locationToInfoMap[key][variable] != null) {
      acc.push([locationToInfoMap[key][variable], value]);
    }

    return acc;
  }, []);
}

// Example case here
const casesToFemalePoints = generateScatterplotPoints("tot_female");
console.log("these are the scatterplot points", casesToFemalePoints);

// Running totals by state
const dateToStateCasesDeathsMap = jhDataCSV.reduce((acc, node) => {
  Object.keys(node).forEach((key) => {
    if (isValidDate(key)) {
      // Setting the date on the map
      if (!acc[key]) {
        acc[key] = {};
      }
      // If the state doesn't exist on this date, initialize it
      if (!acc[key][node.Province_State]) {
        acc[key][node.Province_State] = { cases: 0, deaths: 0 };
      }

      acc[key][node.Province_State].cases += node[key];
    }
  });

  return acc;
}, {});

deathsCSV.forEach((node) => {
  Object.keys(node).forEach((key) => {
    if (isValidDate(key)) {
      // Setting the date on the map
      if (!dateToStateCasesDeathsMap[key]) {
        dateToStateCasesDeathsMap[key] = {};
      }
      // If the state doesn't exist on this date, initialize it
      if (!dateToStateCasesDeathsMap[key][node.Province_State]) {
        dateToStateCasesDeathsMap[key][node.Province_State] = {
          cases: 0,
          deaths: 0,
        };
      }

      dateToStateCasesDeathsMap[key][node.Province_State].deaths += node[key];
    }
  });
});

console.log("running totals by state", dateToStateCasesDeathsMap);
