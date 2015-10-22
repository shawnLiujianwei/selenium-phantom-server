/**
 * Created by Shawn Liu on 15/10/21.
 */
var PhantomInstance = require("./PhantomInstance");
var config = require("config").phantom;
var Promise = require("bluebird");
var Utils = require("./lib/utils");
var _ = require("lodash");
var Pool = function (min, max, retryTimes, timeout) {
    this.instanceList = [];
    this.min = min;
    this.max = max;
    this.retry = retryTimes;
    this.timeout = timeout;
}

Pool.prototype.getFreeInstance = function () {
    var list = this.instanceList.filter(function (instance) {
        return !instance.listening;
    }).map(function (item) {
        return item.port;
    })
    return Promise.resolve(list);
}

Pool.prototype.borrow = function () {
    var self = this;
    var instance = _.find(self.instanceList, {"listening": false});
    if (instance) {
        return instance.borrow();
    } else {
        if (self.instanceList.length < self.max) {
            return _createInstance(self.timeout, self.retry)
                .then(function (instance) {
                    self.instanceList.push(instance);
                    return instance.borrow();
                })
        } else {
            return Promise.reject("Can't setup new PhantomInstance , meet the max number");
        }
    }
}

Pool.prototype.release = function (port) {
    var self = this;
    try {
        port = parseInt(port);
        var instance = _.find(self.instanceList, {"port": port});
        if (instance) {
            return instance.release();
        } else {
            return Promise.release("No PhantomInstancel listening port '" + port + "'");
        }
    } catch (e) {
        return Promise.reject(e);
    }

}

Pool.prototype.restart = function (port) {
    var self = this;
    try {
        port = parseInt(port);
        var instance = _.find(self.instanceList, {"port": port});
        if (instance) {
            return instance.restart();
        } else {
            instance = new PhantomInstance(port, self.timeout);
            return instance.start();
        }
    } catch (e) {
        return Promise.reject(e);
    }
}

Pool.prototype.init = function () {
    var self = this;
    var promiseArray = [];
    self.min = self.min || 1;
    for (var i = 0; i < self.min; i++) {
        promiseArray.push(_createInstance(self.timeout, self.retry));
    }
    return Promise.all(promiseArray)
        .then(function (array) {
            Array.prototype.push.apply(self.instanceList, array);
            return self.getFreeInstance();
        });
}

function _createInstance(timeout, retryTime) {
    return Utils.findFreePort()
        .then(function (port) {
            var phantomInstance = new PhantomInstance(port, timeout);
            return phantomInstance.start()
                .catch(function (err) {
                    if (retryTime > 0) {
                        retryTime--;
                        return _createInstance(retryTime);
                    } else {
                        return Promise.reject();
                    }
                })
        })
}

module.exports = Pool;