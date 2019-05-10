/* MIT License
 *
 * Copyright (c) 2019 Andreas Merkle <web@blue-andi.de>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/** Simplified http client */
var request = require("request");

/**
 * NIU cloud connector
 * @namespace
 */
var niuCloudConnector = {};

module.exports = niuCloudConnector;

/**
 * URL to NIU login, used for retrieving an access token.
 */
niuCloudConnector.AccountBaseUrl    = "https://account.niu.com";

/**
 * URL to the NIU app API.
 */
niuCloudConnector.AppApiBaseUrl     = "https://app-api.niu.com";

/**
 * NIU cloud connector client.
 * 
 * @class
 */
niuCloudConnector.Client = function() {  
    
    /** Session token */
    this._token = "";
};

/**
 * Utility function which returns the current time in the format hh:mm:ss.us.
 * 
 * @private
 * 
 * @returns {string} Current time in the format hh:mm:ss.us.
 */
niuCloudConnector.Client.prototype._getTime = function() {

    var now = new Date();

    var paddingHead = function(num, size) {
        var str = num + "";

        while (str.length < size) {
            str = "0" + str;
        }

        return str;
    };

    var paddingTail = function(num, size) {
        var str = num + "";

        while (str.length < size) {
            str = str + "0";
        }

        return str;
    };

    return "" + paddingHead(now.getHours(), 2) + ":" +
        paddingHead(now.getMinutes(), 2) + ":" +
        paddingHead(now.getSeconds(), 2) + "." +
        paddingTail(now.getMilliseconds(), 3);
};

/**
 * @typedef {Object} Error
 * @property {Object}   error
 * @property {string}   [error.message]
 */

/**
 * Build error object.
 * 
 * @private
 * 
 * @param {string | Object} errorInfo   - Error information.
 * @param {string}          funcName    - Name of the function, in which the error happened.
 * 
 * @returns {Object} Error object.
 */
niuCloudConnector.Client.prototype._error = function(errorInfo, funcName) {
    var error = {
        client: this,
        debug: {
            date: this._getTime(),
            funcName: funcName
        }
    };

    if ("string" === typeof errorInfo) {
        error.error = {
            message: errorInfo
        };
    } else if ("object" === typeof errorInfo) {
        error.error = errorInfo;
    } else {
        error.error = {
            message: "Invalid error info."
        };
    }

    return error;
};

/**
 * @typedef {Promise} Token
 * @property {niuCloudConnector.Client} client  - Client
 * @property {string}                   result  - Session token
 */

/**
 * Create a session token, to get access to the cloud API.
 * 
 * @param {Object}  options             - Options.
 * @param {string}  options.account     - EMail address or mobile phone number or username.
 * @param {string}  options.password    - Account password.
 * @param {string}  options.countryCode - Telephone country count without leading zeros or + sign, e.g. 49 instead of 0049 or +49.
 * 
 * @returns {Token} Session token.
 */
niuCloudConnector.Client.prototype.createSessionToken = function(options) {
    var funcName    = "createSessionToken()";
    var _this       = this;

    if ("object" !== typeof options) {
        return Promise.reject(this._error("Options is missing.", funcName));
    }

    if ("string" !== typeof options.account) {
        return Promise.reject(this._error("Account is missing.", funcName));
    }

    if ("string" !== typeof options.password) {
        return Promise.reject(this._error("Password is missing.", funcName));
    }

    if ("string" !== typeof options.countryCode) {
        return Promise.reject(this._error("Country code is missing.", funcName));
    }

    return new Promise(function(resolve, reject) {

        request({
            method: "POST",
            url: niuCloudConnector.AccountBaseUrl + "/appv2/login",
            form: options,
            json: true
        }, function(error, response, body) {

            /* Check for any error */
            if (null !== error) {
                reject(_this._error(error, funcName));
            } else if ("object" !== typeof response) {
                reject(_this._error("Invalid response.", funcName));
            } else if ("number" !== typeof response.statusCode) {
                reject(_this._error("Status code is missing.", funcName));
            } else if (200 != response.statusCode) {
                reject(_this._error("Bad request.", funcName));
            } else {

                /* Response successful received.
                 * Check body now.
                 */

                if ("object" !== typeof body) {
                    reject(_this._error("No body received.", funcName));
                } else if (("number" === typeof body.status) &&
                           (0 !== body.status)) {
                    reject(_this._error("Invalid login data.", funcName));
                } else if ("object" !== typeof body.data) {
                    reject(_this._error("Data is missing in response.", funcName));
                } else if ("string" !== typeof body.data.token) {
                    reject(_this._error("Token is missing in response.", funcName));
                } else if (0 === body.data.token.length) {
                    reject(_this._error("Token is empty in response.", funcName));
                } else {
                    /* Successful response with valid content received. */

                    _this._token = body.data.token;

                    resolve({
                        client: _this,
                        result: body.data.token
                    });
                }
            }

            return;
        });

    });
};

/**
 * Set a previous created session token, to get access to the cloud API.
 * 
 * @param {Object}  options         - Options.
 * @param {string}  options.token   - Session token.
 * 
 * @returns {Promise} Nothing.
 */
niuCloudConnector.Client.prototype.setSessionToken = function(options) {
    var funcName    = "setSessionToken()";

    if ("object" !== typeof options) {
        return Promise.reject(this._error("Options is missing.", funcName));
    }

    if ("string" !== typeof options.token) {
        return Promise.reject(this._error("Token is missing.", funcName));
    }

    this._token = options.token;

    return Promise.resolve({
        client: this,
        result: null
    });
};

/**
 * Make specific http/https request. Default is a GET request.
 * For a POST request, add postData to the options.
 * 
 * @private
 * 
 * @param {Object}  options             - Options.
 * @param {Object}  [options.postData]  - If available, a POST request will be executed.
 * 
 * @returns {Promise} Requested data.
 */
niuCloudConnector.Client.prototype._makeRequest = function(options) {
    var funcName    = "_makeRequest()";
    var _this       = this;
    var reqData     = null;
    
    if ("object" !== typeof options) {
        return Promise.reject(this._error("Options is missing.", funcName));
    }

    if ("string" !== typeof options.path) {
        return Promise.reject(this._error("Path is missing.", funcName));
    }

    reqData = {
        method: "GET",
        url: niuCloudConnector.AppApiBaseUrl + options.path,
        headers: {
            "accept-language": "en-US",
            "token": _this._token
        },
        json: true
    };

    if ("object" === typeof options.postData) {
        reqData.method  = "POST";
        reqData.form    = options.postData;
    }

    return new Promise(function(resolve, reject) {

        request(reqData, function(error, response, body) {

            /* Check for any error */
            if (null !== error) {
                reject(_this._error(error, funcName));
            } else if ("object" !== typeof response) {
                reject(_this._error("Unknown error.", funcName));
            } else if ("number" !== typeof response.statusCode) {
                reject(_this._error("Status code is missing.", funcName));
            } else if (200 != response.statusCode) {
                reject(_this._error("Bad request.", funcName));
            } else {

                /* Response successful received.
                 * Check body now.
                 */

                if ("object" !== typeof body) {
                    reject(_this._error("No body received.", funcName));
                } else if (("number" === typeof body.status) &&
                           (0 !== body.status)) {
                    reject(_this._error(body, funcName));
                } else {
                    resolve({
                        client: _this,
                        result: body
                    });
                }
            }

            return;
        });

    });
};

/**
 * @typedef {Promise} Vehicles
 * @property {niuCloudConnector.Client} client          - Client
 * @property {Object}   result                          - Received response
 * @property {string}   result.sn                       - Vehicle serial number
 * @property {string}   result.specialEdition           - ?
 * @property {string}   result.vehicleColorImg          - URL to vehicle color image
 * @property {string}   result.vehicleLogoImg           - URL to vehicle logo image
 * @property {string}   result.vehicleTypeId            - Vehicle type id
 * @property {string}   result.indexHeaderBg            - URL to background image
 * @property {string}   result.scootorImg               - URL to vehicle image
 * @property {string}   result.batteryInfoBg            - URL to battery info background image
 * @property {string}   result.myPageHeaderBg           - URL to my page header background
 * @property {string}   result.listScooterImg           - URL to scooter list background image
 * @property {string}   result.name                     - Vehicle name, given by the user
 * @property {string}   result.frameNo                  - Vehicle identification number (VIN)
 * @property {string}   result.engineNo                 - Engine identification number
 * @property {boolean}  result.isSelected               - ?
 * @property {boolean}  result.isMaster                 - ?
 * @property {number}   result.bindNum                  - ?
 * @property {boolean}  result.renovated                - ?
 * @property {number}   result.bindDate                 - ? timestamp in epoch unix timestamp format (13 digits)
 * @property {boolean}  result.isShow                   - ?
 * @property {boolean}  result.isLite                   - ?
 * @property {number}   result.gpsTimestamp             - GPS timestamp in epoch unix timestamp format (13 digits)
 * @property {number}   result.infoTimestamp            - Info timestamp in epoch unix timestamp format (13 digits)
 * @property {string}   result.productType              - Product type, e.g. "native"
 * @property {string}   result.process                  - ?
 * @property {string}   result.brand                    - ?
 * @property {boolean}  result.isDoubleBattery          - Vehicle has one or two batteries
 * @property {Object[]} result.features                 - List of features
 * @property {string}   result.features.featureName     - Feature name
 * @property {boolean}  result.features.isSupport       - ?
 * @property {string}   result.features.switch_status   - ?
 * @property {string}   result.type                     - Vehicle model, e.g. "NGT  Black with Red Stripes"
 */

/**
 * Get vehicles.
 * 
 * @returns {Vehicles[]} Vehicles.
 */
niuCloudConnector.Client.prototype.getVehicles = function() {
    var funcName = "getVehicles()";

    if (0 === this._token.length) {
        return Promise.reject(this._error("No valid token available.", funcName));
    }

    return this._makeRequest({
        path: "/motoinfo/list",
        postData: {}
    });
};

/**
 * @typedef {Promise} BatteryInfo
 * @property {niuCloudConnector.Client} client                              - Client
 * @property {Object}   result                                              - Received response
 * @property {Object}   result.batteries                                    - Batteries
 * @property {Object}   result.batteries.compartmentA                       - Battery of compartment A
 * @property {Object[]} result.batteries.compartmentA.items                 - ?
 * @property {number}   result.batteries.compartmentA.items.x               - ?
 * @property {number}   result.batteries.compartmentA.items.y               - ?
 * @property {number}   result.batteries.compartmentA.items.z               - ?
 * @property {number}   result.batteries.compartmentA.totalPoint            - Number of items
 * @property {string}   result.batteries.compartmentA.bmsId                 - Battery management identification number
 * @property {boolean}  result.batteries.compartmentA.isConnected           - Is battery connected or not
 * @property {number}   result.batteries.compartmentA.batteryCharging       - State of charge in percent
 * @property {string}   result.batteries.compartmentA.chargedTimes          - Charging cycles
 * @property {number}   result.batteries.compartmentA.temperature           - Battery temperature in degree celsius
 * @property {string}   result.batteries.compartmentA.temperatureDesc       - Battery temperature status
 * @property {number}   result.batteries.compartmentA.energyConsumedTody    - Energey consumption of today
 * @property {string}   result.batteries.compartmentA.gradeBattery          - Battery grade points
 * @property {Object}   result.[batteries.compartmentB]
 * @property {Object[]} result.batteries.compartmentB.items                 - ?
 * @property {number}   result.batteries.compartmentB.items.x               - ?
 * @property {number}   result.batteries.compartmentB.items.y               - ?
 * @property {number}   result.batteries.compartmentB.items.z               - ?
 * @property {number}   result.batteries.compartmentB.totalPoint            - Number of items
 * @property {string}   result.batteries.compartmentB.bmsId                 - Battery management identification number
 * @property {boolean}  result.batteries.compartmentB.isConnected           - Is battery connected or not
 * @property {number}   result.batteries.compartmentB.batteryCharging       - State of charge in percent
 * @property {string}   result.batteries.compartmentB.chargedTimes          - Charging cycles
 * @property {number}   result.batteries.compartmentB.temperature           - Battery temperature in degree celsius
 * @property {string}   result.batteries.compartmentB.temperatureDesc       - Battery temperature status
 * @property {number}   result.batteries.compartmentB.energyConsumedTody    - Energey consumption of today
 * @property {string}   result.batteries.compartmentB.gradeBattery          - Battery grade points
 * @property {number}   result.isCharging                                   - Is charging
 * @property {string}   result.centreCtrlBattery                            - Centre control battery
 * @property {boolean}  result.batteryDetail                                - Battery detail
 * @property {number}   result.estimatedMileage                             - Estimated mileage in km
 */

/**
 * Get battery info of vehicle.
 *
 * @param {Object}  options     - Options.
 * @param {string}  options.sn  - Vehicle serial number.
 * 
 * @returns {BatteryInfo} Battery info.
 */
niuCloudConnector.Client.prototype.getBatteryInfo = function(options) {
    var funcName = "getBatteryInfo()";

    if (0 === this._token.length) {
        return Promise.reject(this._error("No valid token available.", funcName));
    }

    if ("object" !== typeof options) {
        return Promise.reject(this._error("Options is missing.", funcName));
    }

    if ("string" !== typeof options.sn) {
        return Promise.reject(this._error("Vehicle serial number is missing.", funcName));
    }

    return this._makeRequest({
        path: "/v3/motor_data/battery_info?sn=" + options.sn
    });
};

/**
 * @typedef {Promise} BatteryInfoHealth
 * @property {niuCloudConnector.Client} client                                  - Client
 * @property {Object}   result                                                  - Received response
 * @property {Object}   result.batteries                                        - Batteries
 * @property {Object}   result.batteries.compartmentA                           - Battery compartment A
 * @property {string}   result.batteries.compartmentA.bmsId                     - Battery management system identification number
 * @property {boolean}  result.batteries.compartmentA.isConnected               - Is connected or not
 * @property {string}   result.batteries.compartmentA.gradeBattery              - Battery grade points
 * @property {Object[]} result.batteries.compartmentA.faults                    - List of faults
 * @property {Object[]} result.batteries.compartmentA.healthRecords             - List of health records
 * @property {string}   result.batteries.compartmentA.healthRecords.result      - Battery lost grade points
 * @property {string}   result.batteries.compartmentA.healthRecords.chargeCount - Charging cycles
 * @property {string}   result.batteries.compartmentA.healthRecords.color       - HTML color in #RGB format
 * @property {number}   result.batteries.compartmentA.healthRecords.time        - Timestamp in unix timstamp epoch format (13 digits)
 * @property {string}   result.batteries.compartmentA.healthRecords.name        - Name
 * @property {Object}   result.[batteries.compartmentB]                         - Battery compratment B
 * @property {string}   result.batteries.compartmentB.bmsId                     - Battery management system identification number
 * @property {boolean}  result.batteries.compartmentB.isConnected               - Is connected or not
 * @property {string}   result.batteries.compartmentB.gradeBattery              - Battery grade points
 * @property {Object[]} result.batteries.compartmentB.faults                    - List of faults
 * @property {Object[]} result.batteries.compartmentB.healthRecords             - List of health records
 * @property {string}   result.batteries.compartmentB.healthRecords.result      - Battery lost grade points
 * @property {string}   result.batteries.compartmentB.healthRecords.chargeCount - Charging cycles
 * @property {string}   result.batteries.compartmentB.healthRecords.color       - HTML color in #RGB format
 * @property {number}   result.batteries.compartmentB.healthRecords.time        - Timestamp in unix timstamp epoch format (13 digits)
 * @property {string}   result.batteries.compartmentB.healthRecords.name        - Name
 * @property {boolean}  result.isDoubleBattery                                  - Vehicle has one or two batteries
 */

/**
 * Get battery health of vehicle.
 * 
 * @param {Object}  options     - Options.
 * @param {string}  options.sn  - Vehicle serial number.
 * 
 * @returns {BatteryInfoHealth} Battery info health.
 */
niuCloudConnector.Client.prototype.getBatteryHealth = function(options) {
    var funcName = "getBatteryInfo()";

    if (0 === this._token.length) {
        return Promise.reject(this._error("No valid token available.", funcName));
    }

    if ("object" !== typeof options) {
        return Promise.reject(this._error("Options is missing.", funcName));
    }

    if ("string" !== typeof options.sn) {
        return Promise.reject(this._error("Vehicle serial number is missing.", funcName));
    }

    return this._makeRequest({
        path: "/v3/motor_data/battery_info/health?sn=" + options.sn
    });
};

/**
 * @typedef {Promise} MotorData
 * @property {niuCloudConnector.Client} client                          - Client
 * @property {Object}   result                                          - Received response
 * @property {number}   result.isCharging                               - Is charging
 * @property {number}   result.lockStatus                               - Lock status
 * @property {number}   result.isAccOn                                  - Is adaptive cruise control on or not
 * @property {string}   result.isFortificationOn                        - Is fortification on or not
 * @property {boolean}  result.isConnected                              - Is connected or not
 * @property {Object}   result.postion                                  - Current position
 * @property {number}   result.postion.lat                              - Latitude
 * @property {number}   result.postion.lng                              - Longitude
 * @property {number}   result.hdop                                     - Horizontal dilution of precision [0; 50]. A good HDOP is up to 2.5. For navigation a value up to 8 is acceptable.
 * @property {number}   result.time                                     - Time in unix timestamp epoch format (13 digits)
 * @property {Object}   result.batteries                                - Batteries
 * @property {Object}   result.batteries.compartmentA                   - Battery compartment A
 * @property {string}   result.batteries.compartmentA.bmsId             - Battery management system identification number
 * @property {boolean}  result.batteries.compartmentA.isConnected       - Battery is connected or not
 * @property {number}   result.batteries.compartmentA.batteryCharging   - Battery is charging or not
 * @property {string}   result.batteries.compartmentA.gradeBattery      - Battery grade points
 * @property {Object}   result.[batteries.compartmentB]                 - Battery compartment B
 * @property {string}   result.batteries.compartmentB.bmsId             - Battery management system identification number
 * @property {boolean}  result.batteries.compartmentB.isConnected       - Battery is connected or not
 * @property {number}   result.batteries.compartmentB.batteryCharging   - Battery is charging or not
 * @property {string}   result.batteries.compartmentB.gradeBattery      - Battery grade points
 * @property {string}   result.leftTime                                 - Left time
 * @property {number}   result.estimatedMileage                         - Estimated mileage in km
 * @property {number}   result.gpsTimestamp                             - GPS timestamp in unix timestamp epoch format (13 digits)
 * @property {number}   result.infoTimestamp                            - Info timestamp in unix timestamp epoch format (13 digits)
 * @property {number}   result.nowSpeed                                 - Current speed in km/h
 * @property {boolean}  result.batteryDetail                            - Battery detail
 * @property {number}   result.centreCtrlBattery                        - Centre control battery
 * @property {number}   result.ss_protocol_ver                          - SS protocol version
 * @property {string}   result.ss_online_sta                            - SS online status
 * @property {number}   result.gps                                      - GPS signal strength
 * @property {number}   result.gsm                                      - GSM signal strength
 * @property {Object}   result.lastTrack                                - Last track information
 * @property {number}   result.lastTrack.ridingTime                     - Riding time in s
 * @property {number}   result.lastTrack.distance                       - Distance in m
 * @property {number}   result.lastTrack.time                           - Timestamp in unix timestamp epoch format (13 digits)
 */

/**
 * Get motor info of vehicle.
 * 
 * @param {Object}  options     - Options.
 * @param {string}  options.sn  - Vehicle serial number.
 * 
 * @returns {MotorData} Motor data.
 */
niuCloudConnector.Client.prototype.getMotorInfo = function(options) {
    var funcName = "getMotorInfo()";

    if (0 === this._token.length) {
        return Promise.reject(this._error("No valid token available.", funcName));
    }

    if ("object" !== typeof options) {
        return Promise.reject(this._error("Options is missing.", funcName));
    }

    if ("string" !== typeof options.sn) {
        return Promise.reject(this._error("Vehicle serial number is missing.", funcName));
    }

    return this._makeRequest({
        path: "/v3/motor_data/index_info?sn=" + options.sn
    });
};

/**
 * @typedef {Promise} OverallTally
 * @property {niuCloudConnector.Client} client  - Client
 * @property {Object}   result                  - Received response
 * @property {number}   result.bindDaysCount    - Number of days the vehicle is at the customer
 * @property {number}   result.totalMileage     - Total mileage in km
 */

/**
 * Get overall tally of vehicle.
 * 
 * @param {Object}  options     - Options.
 * @param {string}  options.sn  - Vehicle serial number.
 * 
 * @returns {OverallTally} Overall tally.
 */
niuCloudConnector.Client.prototype.getOverallTally = function(options) {
    var funcName = "getOverallTally()";

    if (0 === this._token.length) {
        return Promise.reject(this._error("No valid token available.", funcName));
    }

    if ("object" !== typeof options) {
        return Promise.reject(this._error("Options is missing.", funcName));
    }

    if ("string" !== typeof options.sn) {
        return Promise.reject(this._error("Vehicle serial number is missing.", funcName));
    }

    return this._makeRequest({
        path: "/motoinfo/overallTally",
        postData: {
            sn: options.sn
        }
    });
};

/**
 * @typedef {Promise} Tracks
 * @property {niuCloudConnector.Client} client      - Client
 * @property {Object[]} result                      - Received response
 * @property {string}   result.id                   - Identification number
 * @property {string}   result.trackId              - Track identification number
 * @property {number}   result.startTime            - Start time in unix timestamp epoch format (13 digits)
 * @property {number}   result.endTime              - Stop time in unix timestamp epoch format (13 digits)
 * @property {number}   result.distance             - Distance in m
 * @property {number}   result.avespeed             - Average speed in km/h
 * @property {number}   result.ridingtime           - Riding time in minutes
 * @property {string}   result.type                 - Type
 * @property {string}   result.date                 - Date in the format yyyymmdd
 * @property {Object}   result.startPoint           - Start point
 * @property {string}   result.startPoint.lng       - Longitude
 * @property {string}   result.startPoint.lat       - Latitude
 * @property {string}   result.startPoint.speed     - Speed
 * @property {string}   result.startPoint.battery   - Battery state of charge in percent
 * @property {string}   result.startPoint.mileage   - Mileage in m
 * @property {string}   result.startPoint.date      - Date in unix timestamp epoch format (13 digits)
 * @property {Object}   result.lastPoint            - Start point
 * @property {string}   result.lastPoint.lng        - Longitude
 * @property {string}   result.lastPoint.lat        - Latitude
 * @property {string}   result.lastPoint.speed      - Speed
 * @property {string}   result.lastPoint.battery    - Battery state of charge in percent
 * @property {string}   result.lastPoint.mileage    - Mileage in m
 * @property {string}   result.lastPoint.date       - Date in unix timestamp epoch format (13 digits)
*/

/**
 * Get recorded tracks.
 * 
 * @param {Object}  options             - Options.
 * @param {string}  options.sn          - Vehicle serial number.
 * @param {number}  options.index       - Start from this index.
 * @param {number}  options.pageSize    - Number of tracks.
 * 
 * @returns {Tracks} Tracks.
 */
niuCloudConnector.Client.prototype.getTracks = function(options) {
    var funcName = "getTracks()";

    if (0 === this._token.length) {
        return Promise.reject(this._error("No valid token available.", funcName));
    }

    if ("object" !== typeof options) {
        return Promise.reject(this._error("Options is missing.", funcName));
    }

    if ("string" !== typeof options.sn) {
        return Promise.reject(this._error("Vehicle serial number is missing.", funcName));
    }

    if ("number" !== typeof options.index) {
        return Promise.reject(this._error("Index is missing.", funcName));
    }

    if ("number" !== typeof options.pageSize) {
        return Promise.reject(this._error("Page size is missing.", funcName));
    }

    return this._makeRequest({
        path: "/v3/motor_data/track",
        postData: {
            sn: options.sn,
            index: options.index,
            pagesize: options.pageSize
        }
    });
};

/**
 * @typedef {Promise} TrackDetail
 * @property {niuCloudConnector.Client} client      - Client
 * @property {Object}   result                      - Received response
 * @property {Object[]} result.trackItems           - Track items (end point at index 0)
 * @property {number}   result.trackItems.lng       - Longitude
 * @property {number}   result.trackItems.lat       - Latitude
 * @property {number}   result.trackItems.date      - Date in unix timestamp epoch format (13 digits)
 * @property {Object}   result.startPoint           - Start point
 * @property {string}   result.startPoint.lng       - Longitude
 * @property {string}   result.startPoint.lat       - Latitude
 * @property {Object}   result.lastPoint            - Start point
 * @property {string}   result.lastPoint.lng        - Longitude
 * @property {string}   result.lastPoint.lat        - Latitude
 * @property {string}   result.startTime            - Start time in unix timestamp epoch format (13 digits)
 * @property {string}   result.lastDate             - Last time in unix timestamp epoch format (13 digits)
*/

/**
 * Get track details.
 * 
 * @param {Object}  options             - Options.
 * @param {string}  options.sn          - Vehicle serial number.
 * @param {string}  options.trackId     - Track identification number.
 * @param {string}  options.trackDate   - Track date in yyyymmdd format.
 * 
 * @returns {TrackDetail} Track detail.
 */
niuCloudConnector.Client.prototype.getTrackDetail = function(options) {
    var funcName = "getTrackDetail()";

    if (0 === this._token.length) {
        return Promise.reject(this._error("No valid token available.", funcName));
    }

    if ("object" !== typeof options) {
        return Promise.reject(this._error("Options is missing.", funcName));
    }

    if ("string" !== typeof options.sn) {
        return Promise.reject(this._error("Vehicle serial number is missing.", funcName));
    }

    if ("string" !== typeof options.trackId) {
        return Promise.reject(this._error("Track ID is missing.", funcName));
    }

    if ("string" !== typeof options.trackDate) {
        return Promise.reject(this._error("Track date is missing.", funcName));
    }

    return this._makeRequest({
        path: "/motoinfo/track/detail",
        postData: {
            sn: options.sn,
            trackId: options.trackId,
            date: options.trackDate
        }
    });
};
