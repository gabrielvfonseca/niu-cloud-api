/*
 * Dev by Gabriel
 * 19/03/2022
 */

require("dotenv").config();
const express = require("express");
const crypto = require('crypto');
const api = require("./api");

const app = express();
const port = process.env.PORT;
const key = crypto.createHash('sha256').update(process.env.API_KEY, 'utf8').digest('hex');

/* Access data */
const account = process.env.API_ACCOUNT;
const password = process.env.API_PWD;
const countryCode = process.env.API_COUNTRY_CODE;

/** Cloud init */
var client = new api.Client();
var vehicles = [];

var data = {
  vehicle: {
    sn: String,
    type: String,
    name: String,
  },
  position: {
    latitude: String,
    longitude: String,
  },
  battery: {
    estimated_milage: Number,
    batteries: [
      {
        bms: String,
        capacity: Number,
        grade: Number,
      },
      {
        bms: String,
        capacity: Number,
        grade: Number,
      },
    ],
  },
  current_speed: Number,
  total_mileage: Number,
  firmware_version: String,
  track: {
    id: String,
    start_time: String,
    end_time: String,
    distance: Number,
    average_speed: Number,
    riding_time: Number,
  },
};

client
  .createSessionToken({
    account: account,
    password: password,
    countryCode: countryCode,
  })
  .then((result) => {
    console.log("\tSession token created: " + result.result);
    console.log("\tToken key created: " + key);
    return result.client.getVehicles();
  })
  .then((result) => {
    var index = 0;
    var nextPromise = Promise.resolve({
      client: result.client,
      index: 0,
    });

    vehicles = result;

    if (0 === vehicles.length) {
      console.log("\tNo vehicles found.");
      return Promise.reject(new Error("Aborted."));
    }

    for (index = 0; index < 1; ++index) {
      nextPromise = nextPromise.then((vehicleResult) => {
        var vehicleIndex = vehicleResult.index;

        ++vehicleResult.index;

        data.vehicle.sn = vehicles.result[vehicleIndex].sn;
        data.vehicle.type = vehicles.result[vehicleIndex].type;
        data.vehicle.name = vehicles.result[vehicleIndex].name;

        return result.client
          .getVehiclePos({
            sn: vehicles.result[vehicleIndex].sn,
          })
          .then((vehiclePosResult) => {
            data.position.latitude = vehiclePosResult.result.lat;
            data.position.longitude = vehiclePosResult.result.lng;

            return Promise.resolve({
              client: vehiclePosResult.client,
              index: vehicleResult.index,
            });
          });
      });
    }

    nextPromise = nextPromise.then(() => {
      return result.client.getBatteryInfo({
        sn: vehicles.result[0].sn,
      });
    });

    return nextPromise;
  })
  .then((result) => {
    var batteries = result.result.batteries;

    if ("object" === typeof batteries.compartmentA) {
      data.battery.batteries[0].bms = batteries.compartmentA.bmsId;
      data.battery.batteries[0].capacity =
        batteries.compartmentA.batteryCharging;
    }

    if ("object" === typeof batteries.compartmentB) {
      data.battery.batteries[1].bms = batteries.compartmentA.bmsId;
      data.battery.batteries[1].capacity =
        batteries.compartmentA.batteryCharging;
    }

    data.battery.estimated_milage = result.result.estimatedMileage;

    return result.client.getBatteryHealth({
      sn: vehicles.result[0].sn,
    });
  })
  .then((result) => {
    var batteries = result.result.batteries;

    if ("object" === typeof batteries.compartmentA) {
      data.battery.batteries[0].grade = Number(
        batteries.compartmentA.gradeBattery
      );
    }

    if ("object" === typeof batteries.compartmentB) {
      data.battery.batteries[1].grade = Number(
        batteries.compartmentA.gradeBattery
      );
    }

    return result.client.getMotorInfo({
      sn: vehicles.result[0].sn,
    });
  })
  .then((result) => {
    return result.client.getOverallTally({
      sn: vehicles.result[0].sn,
    });
  })
  .then((result) => {
    data.total_mileage = result.result.totalMileage;
    return result.client.getFirmwareVersion({
      sn: vehicles.result[0].sn,
    });
  })
  .then((result) => {
    data.firmware_version = result.result.version;
    return result.client.getTracks({
      sn: vehicles.result[0].sn,
      index: 0,
      pageSize: 1,
    });
  })
  .then((result) => {
    if (0 === result.result.length) {
      console.log("\tNo tracks available.");
    } else {
      var track = result.result.items[0];
      var startTime = new Date(track.startTime);
      var endTime = new Date(track.endTime);

      data.track.id = track.trackId;
      data.track.start_time = startTime.toString();
      data.track.end_time = endTime.toString();
      data.track.distance = track.distance / 1000;
      data.track.average_speed = track.avespeed;
      data.track.riding_time = track.ridingtime / 60;
    }
  })
  .catch((error) => {
    if ("object" === typeof error) {
      if ("object" === typeof error.debug) {
        console.log("Debug: " + error.debug.date + " " + error.debug.funcName);
      }

      if ("object" === typeof error.error) {
        if (null === error.error) {
          console.log("Error: Unknown");
        } else if ("string" === typeof error.error.message) {
          console.log("Error: " + error.error.message);
        } else {
          console.log("Error: ");
          console.log(JSON.stringify(error.error, null, 4));
        }
      } else if ("string" === typeof error.message) {
        console.log("Error:");
        console.log(error.message);
      } else {
        console.log("Internal error: Unsupported error");
        console.log(JSON.stringify(error, null, 4));
      }
    } else {
      console.log("Error: Unknown");
    }
  });

app.get("/api", (req, res) => {
  if (key == req.body.key) res.send(data);
});

app.listen(port);
