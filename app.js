const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "covid19India.db");
const app = express();

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictDbObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

const convertStatsDbObjectToResponseObject = (dbObject) => {
  return {
    totalCases: dbObject.cases,
    totalCured: dbObject.cured,
    totalActive: dbObject.active,
    totalDeaths: dbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const statesQuery = `SELECT * FROM state;`;
  const statesArray = await db.all(statesQuery);
  const result = statesArray.map((eachArray) => {
    return convertStateDbObjectToResponseObject(eachArray);
  });
  response.send(result);
});
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const statesQuery = `SELECT * FROM state WHERE state_id = ${stateId} ;`;
  const state = await db.get(statesQuery);
  const newState = convertStateDbObjectToResponseObject(state);
  response.send(newState);
});

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const districtQuery = `
           INSERT INTO 
           district (district_name,state_id,cases,cured,active,deaths)
           VALUES
               ('${districtName}',
                ${stateId},
                ${cases},
                ${cured},
                ${active},
                ${deaths});`;
  const addDistrict = await db.run(districtQuery);
  //const districtId = addDistrict.lastId;
  //console.log(addDistrict);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrict = `SELECT * FROM district WHERE district_id=${districtId};`;
  const newDistrict = await db.get(getDistrict);
  const districtResult = convertDistrictDbObjectToResponseObject(newDistrict);
  response.send(districtResult);
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrict = `DELETE FROM district WHERE district_id = ${districtId};`;
  await db.run(deleteDistrict);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const updateDistricts = `
        UPDATE 
           district
        SET 
          district_name = '${districtName}',
          state_id = ${stateId},
          cases = ${cases},
          cured = ${cured},
          active = ${active},
          deaths = ${deaths}
        WHERE district_id = ${districtId};`;
  await db.run(updateDistricts);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStateReport = `
            SELECT
              SUM(cases) AS cases,
              SUM(cured) AS cured,
              SUM(active) AS active,
              SUM(deaths) AS deaths
            FROM district WHERE state_id=${stateId};`;
  const stateReport = await db.get(getStateReport);
  const resultReport = convertStatsDbObjectToResponseObject(stateReport);
  response.send(resultReport);
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const stateDetails = `SELECT state_name FROM state JOIN district ON state.state_id = district.state_id  WHERE district.district_id=${districtId};`;
  const stateName = await db.get(stateDetails);
  response.send({ stateName: stateName.state_name });
});
module.exports = app;
