/**
 * Created by Shawn Liu on 15/10/21.
 */
/**
 * Created by Shawn Liu on 15/10/9.
 */
var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var config = require("config");
var logger = require("log4js").getLogger("selenium-phantom-cluster");
var Pool = require("./src/Pool");
var phantomPool = new Pool(config.pool.min, config.pool.max, config.pool.retry, config.pool.instanceTimeout);
var theHTTPLog = morgan('combined', {
    stream: {
        write: function (str) {
            if (process.env.NODE_ENV !== "production") {
                //logger.trace(str);
            }
        }
    }
});
var app = express();
app.use(theHTTPLog);
app.use(bodyParser.json());
var port = config.port;
app.listen(port, function (err, msg) {
    logger.trace("Server listening on port '%s'", port);
    phantomPool.init();
})
//app.post("/exec", function (req, res) {
//    var request = req.body;
//    handler.handler(request, {
//        "succeed": function (response) {
//            res.json(response)
//        },
//        "fail": function (error) {
//            res.statsCode = 500;
//            res.json(error);
//        }
//    })
//})

//app.get("/init", function (req, res) {
//    phantomPool.getFreeInstance()
//        .then(function (list) {
//            res.json(list);
//        })
//        .catch(function (err) {
//            logger.error(err);
//        })
//})

app.get("/borrow", function (req, res) {
    phantomPool.borrow()
        .then(function (instance) {
            res.json(instance.port);
        })
        .catch(function (err) {
            logger.error(err);
        })
});
app.get("/release/:port", function (req, res) {
    var port = req.params.port;
    phantomPool.release(port)
        .then(function (msg) {
            res.json(msg);
        })
        .catch(function (err) {
            logger.error(err);
            res.json(err.stack || err.message || err);
        });
});
app.get("/restart/:port", function (req, res) {
    var port = req.params.port;
    phantomPool.restart(port)
        .then(function (msg) {
            res.json(msg);
        })
        .catch(function (err) {
            logger.error(err);
            res.json(err.stack || err.message || err);
        });
});

app.get("/status", function (req, res) {
    var list = phantomPool.instanceList.map(function (item) {
        return {
            "port": item.port,
            "listening": item.listening
        }
    });
    res.json(list);
})