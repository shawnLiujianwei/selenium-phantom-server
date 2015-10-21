/**
 * Created by Shawn Liu on 15/10/21.
 */
'use strict';
var Promise = require("bluebird");
var delay = require("./lib/delayPromise");
var Process = require("child_process");
var logger = require("log4js").getLogger("src/PhantomInstance.js");
var Utils = require("./lib/utils");
var webdriver = require('selenium-webdriver');
var PhantomInstance = function (port, timeout) {
    this.listening = false;
    this.port = port;
    this.maxWait = timeout || 600000;//wait 10 minutes , if instance still not been released , will release it.
}

PhantomInstance.prototype.start = function () {
    var self = this;
    return Utils.freePort(self.port)
        .then(function () {
            var args = [];
            args.push("phantomjs");
            args.push("--webdriver=" + self.port);
            var cp = Process.spawn(args.shift(), args);
            //cp.stdout.pipe(process.stdout);
            //cp.stderr.pipe(process.stderr);
            cp.stdout.on("data", function (data) {
                self.log(data)
            });
            cp.stderr.on("data", function (data) {
                self.log(data)
            });
            return delay(100)
                .then(function () {
                    return self;
                })
        });
}

PhantomInstance.prototype.borrow = function () {
    var self = this;
    this.listening = true;
    this.timeout = setTimeout(function () {
        self.release("PhantomInstance on port " + self.port + " been released by maxWait '" + self.maxWait / 1000 + "s'");
    }, self.maxWait);
    return Promise.resolve(this);
}

PhantomInstance.prototype.restart = function () {
    return self.start();
}

PhantomInstance.prototype.release = function (msg) {
    this.listening = false;
    clearTimeout(this.timeout);
    if (msg) {
        logger.warn(msg);
    } else {
        logger.info("Release PhantomInstance on port %s", this.port);
    }
    return Promise.resolve("Release PhantomInstance");
}

PhantomInstance.prototype.destroy = function () {
    var self = this;
    return Utils.freePort(self.port)
        .then(function () {
            logger.info("Destroy PhantomInstance on port %s", self.port);
        });
}

PhantomInstance.prototype.ping = function () {
    var self = this;

    return new Promise(function (resolve, reject) {
        var driver = new webdriver.Builder()
            .forBrowser('firefox')
            .usingServer('http://127.0.0.1:' + self.port)
            .build()
            .catch(function (err) {
                logger.error(err);
                reject(err.stack);
            });
        resolve();
    })
}

PhantomInstance.prototype.log = function (data) {
    var self = this;
    if (data) {
        data = "[PhantomInstance - " + self.port + "] --- " + data.toString();
        if (data.indexOf("INFO") !== -1) {
            logger.info(data);
        } else if (data.indexOf("DEBUG") !== -1) {
            logger.debug(data);
        } else if (data.indexOf("WARN") !== -1) {
            logger.warn(data);
        } else if (data.indexOf("ERROR") !== -1) {
            logger.error(data);
        } else {
            logger.info(data);
        }
    }

}


process.on("uncaughtException", function (err) {
    logger.error(err);
});

module.exports = PhantomInstance;