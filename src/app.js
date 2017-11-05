(function(exports) {
  'use strict';
  //Load express module with `require` directive
  var express = require('express');
  var app = express();
  var router = express.Router();
  var path = require('path');
  var pathName = __dirname + '/views/';
  var config = require('../config');
  var request = require('retry-request');
  var moment = require('moment');
  var momentTz = require('moment-timezone');
  var querystring = require('querystring');

  router.use(function (req,res,next) {
    console.log("/" + req.method);
    next();
  });

  app.use("/",router);
  app.use(express.static(path.join(__dirname, '../')));
  app.use(express.static(__dirname));
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'html');

  router.get("/",function(req,res){
    res.sendFile(pathName + "index.html");
  });

  app.get('/autocomplete', function(req, res) {
    var url = 'http://dev.markitondemand.com/MODApis/Api/v2/Lookup/json?input=' + querystring.escape(req.query.queryText);

    request(url, function(error, response, body) {
      if(!error && response.statusCode == 200) {
        var json = JSON.parse(body);
        res.send(json);
      } else {
        // res.statusMessage = "No respnse from markitondemand";
        // res.status(503).send([]);
        console.log(error);
      }
    });
  });

  app.get('/stock', function(req, res){
    var url = "https://www.alphavantage.co/query?";
    url += "function=TIME_SERIES_DAILY&apikey="
    url += config.API_KEY + '&symbol=' + req.query.stockSymbol;
    url += '&outputsize=' + req.query.outputsize;
    // console.log(url);
    request(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var json = JSON.parse(body);

        if(Object.keys(json).length == 0 || json["Error Message"] || json["Information"]) {
          // console.log("somethings wrong with alpha vantage again");
          res.statusMessage = "No response from Alpha Vantage";
          res.status(503).send(null);
          return;
        }
        // console.log(Object.keys(json));
        var timestamp = moment.tz(json["Meta Data"]["3. Last Refreshed"], "US/Eastern");
        if(timestamp.hour()==0&&timestamp.minute()==0&&timestamp.second()==0&&timestamp.millisecond()==0) {
          timestamp.hour(16);
          timestamp.minute(0);
          timestamp.second(0);
          timestamp.millisecond(0);
        }

        var latestKey = Object.keys(json["Time Series (Daily)"])[0];
        var prevKey = Object.keys(json["Time Series (Daily)"])[1];

        var resObj = {
          "symbol": json["Meta Data"]["2. Symbol"],
          "timestamp": timestamp,
          "open": parseFloat(json["Time Series (Daily)"][latestKey]["1. open"]),
          "high": parseFloat(json["Time Series (Daily)"][latestKey]["2. high"]),
          "low": parseFloat(json["Time Series (Daily)"][latestKey]["3. low"]),
          "last_price": parseFloat(json["Time Series (Daily)"][latestKey]["4. close"]),
          "volume": parseInt(json["Time Series (Daily)"][latestKey]["5. volume"]),
          "prev_close": parseFloat(json["Time Series (Daily)"][prevKey]["4. close"]),
        };
        resObj["close"] = timestamp.hour()>=16 ? resObj.last_price : resObj.prev_close;
        resObj["change"] = resObj.last_price - resObj.prev_close;
        resObj["change_percent"] = (resObj.change/resObj.prev_close)*100;
        resObj["range"] = resObj.low.toFixed(2) + " - " + resObj.high.toFixed(2);

        resObj["payload"] = json["Time Series (Daily)"];
        // console.log(resObj);
        res.send(resObj);
      } else {
        console.log("somethings wrong with alpha vantage again");
        res.statusMessage = "No response from Alpha Vantage";
        res.status(503).send(null);
      }
    });
  });

  app.get('/stock/indicator/', function(req, res) {
    var url = "https://www.alphavantage.co/query?function=" + req.query.indicator;
    url += "&symbol=" + req.query.stockSymbol;
    url += "&interval=daily&time_period=10&series_type=close&apikey="+CONFIG.API_KEY;

    request(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var json = JSON.parse(body);
        console.log(json);
      }
    });
  });

  var server = app.listen(3000,function(){
    console.log("Live at Port 3000");
  });
  // server.timeout = 5000;
})(this);
