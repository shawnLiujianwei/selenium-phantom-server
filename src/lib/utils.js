/**
 * Created by Shawn Liu on 15-5-22.
 */
var Process = require("child_process");
var Promise = require("bluebird");
var logger = require("log4js").getLogger("src/lib/util.js");
var os = require("os");
var FindFreePort = require("freeport");
exports.findPID = _findPID;
exports.freePort = function (port) {
    return new Promise(function (resolve, reject) {
        logger.info("freeing up port " + port + " if still in use");
        if (os.platform().indexOf("darwin") !== -1 || os.platform().indexOf("linux") !== -1) {
            return _findPID(port)
                .then(function (pidList) {
                    if (pidList) {
                        return Promise.map(pidList, function (pid) {
                            return _killProcess(pid, port);
                        })
                    }

                })
                .then(function () {
                    resolve();
                })
        } else {
            logger.info("your OS is windows , will ignore this command");
            resolve();
        }

    });
}
exports.findFreePort = function () {
    return new Promise(function (resolve, reject) {
        FindFreePort(function (err, port) {
            if (err) {
                logger.error(err);
                reject();
            } else {
                resolve(port);
            }
        })
    })
}
function _findPID(port) {
    return new Promise(function (resolve, reject) {
        Process.exec("lsof -t -i:" + port, function (err, data) {
            if (err) {
                //logger.error(err);
                resolve();
            } else {

                var str = data.toString().split("\n");
                str = str.filter(function (item) {
                    return item;
                }).map(function (item) {
                    return parseInt(item)
                })
                logger.info("Find process '%s' listen port '%s'", str, port);
                resolve(str);
            }

        })
    });
}

function _killProcess(pid, port) {
    return new Promise(function (resolve, reject) {
        Process.exec("kill -9 " + pid, function (err, data) {
            if (err) {
                logger.error("Error when kill process listen port '%s'", port);
                reject();
            } else {
                logger.info("kill process listen port '%s' ", port);
                resolve();
            }

        })
    });
}