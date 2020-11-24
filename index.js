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
const info_dfFile = readFile(infoURI);
const jhDataFile = readFile(jhDataURI);

const infoCSV = d3.csvParse(info_dfFile, d3.autoType);
const jhDataCSV = d3.csvParse(jhDataFile, d3.autoType);

console.log("jhDataCsv", jhDataCSV);
console.log("infoCSV", infoCSV);

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

  // Admin2 represents county. Creating unique identifier here so we can map later
  acc[`${node.Admin2}, ${node.Province_State}`] = total;
  return acc;
}, {});

// Converting the list to a map with the same unique identifier as in mergedJhData so that we can easily
// create scatterplot points
const locationToInfoMap = infoCSV.reduce((acc, node) => {
  const idString = `${node.county}, ${node.state}`;
  acc[idString] = node;

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
const dateToStateCasesMap = jhDataCSV.reduce((acc, node) => {
  Object.keys(node).forEach((key) => {
    if (isValidDate(key)) {
      // Setting the date on the map
      if (!acc[key]) {
        acc[key] = {};
      }
      // If the state doesn't exist on this date, initialize it
      if (!acc[key][node.Province_State]) {
        acc[key][node.Province_State] = 0;
      }

      acc[key][node.Province_State] += node[key];
    }
  });

  return acc;
}, {});

console.log("running totals by state", dateToStateCasesMap);
