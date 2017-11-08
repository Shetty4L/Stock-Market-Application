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
  var parseString = require('xml2js').parseString;
  var server = require('http').Server(app);
  var io = require('socket.io')(server);

  server.listen(3000, function() {
    console.log("Live at Port 3000");
  });

  io.on('connection', function(socket){
    console.log('a user connected');
  });

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
        res.status(503).send({
          error: "No respnse from markitondemand"
        });
      }
    });
  });

  app.get('/stock', function(req, res){
    var url = "https://www.alphavantage.co/query?";
    url += "function=TIME_SERIES_DAILY&apikey="
    url += config.API_KEY + '&symbol=' + req.query.stockSymbol;
    url += '&outputsize=' + req.query.outputsize;
    console.log(url);

    request({
      url: url,
      timeout: 60000
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var json = JSON.parse(body);

        if(Object.keys(json).length == 0 || json["Error Message"] || json["Information"]) {
          // console.log("somethings wrong with alpha vantage again");
          console.log(json);
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

        if(req.query.outputsize == 'full') {
          var payload = json["Time Series (Daily)"];
          var priceData = [];
          var volumeData = [];
          var dates = [];

          var fullPriceData = [];
          var allDates = [];

          var minPrice = Number.MAX_VALUE;
          var maxPrice = Number.MIN_VALUE;
          var minVolume = Number.MAX_VALUE;
          var maxVolume = Number.MIN_VALUE;

          var first_date = new Date(Object.keys(payload)[0]);
          first_date = new Date(first_date.getTime());

          for(var key in payload) {
              var timePresent = (key.indexOf(' ') != -1);
              var date = new Date(key);

              if(timePresent) {
                  date = new Date(date.getTime());
              }

              if(date.getDate() <= first_date.getDate() && date.getMonth() == first_date.getMonth()-6) {
                  break;
              }
              // console.log(moment.tz(key, "US/Eastern").format("YYYY-MM-DD"));
              dates.push(date);

              priceData.push(parseFloat(payload[key]["4. close"]));
              if(parseFloat(payload[key]["4. close"]) < minPrice) {
                  minPrice = parseFloat(payload[key]["4. close"]);
              }
              if(parseFloat(payload[key]["4. close"]) > maxPrice) {
                  maxPrice = parseFloat(payload[key]["4. close"]);
              }

              volumeData.push(parseFloat(payload[key]["5. volume"]));
              if(parseFloat(payload[key]["5. volume"]) < minVolume) {
                  minVolume = parseFloat(payload[key]["5. volume"]);
              }
              if(parseFloat(payload[key]["5. volume"]) > maxVolume) {
                  maxVolume = parseFloat(payload[key]["5. volume"]);
              }
          }

          var date = moment.tz(Object.keys(payload)[0], "US/Eastern");
          var allDates = [];
          var counter = 0;
          while(counter < 1000 && counter < Object.keys(payload).length) {
            if(payload.hasOwnProperty(date.format("YYYY-MM-DD")))  ++counter;
            allDates.push(date.format("YYYY-MM-DD"));
            date.subtract(1, 'days');
          }
          allDates.forEach(function(date) {
            var key = moment(date).format("YYYY-MM-DD");
            if(payload.hasOwnProperty(key)) {
              var temp = [moment(date).utc().hours(0).minutes(0).seconds(0).milliseconds(0).valueOf(), parseFloat(payload[key]["4. close"])];
              fullPriceData.push(temp);
            }
          });
          resObj["payload"] = {
            priceData: priceData,
            volumeData: volumeData,
            dates: dates,
            minPrice: minPrice,
            maxPrice: maxPrice,
            minVolume: minVolume,
            maxVolume: maxVolume
          };
          resObj["fullData"] = {
            startDate: allDates[allDates.length-1],
            priceData: fullPriceData.reverse()
          };
        }
        // console.log(resObj);
        res.send(resObj);
      } else {
        console.log("somethings wrong with alpha vantage again");
        res.set("Connection", "close");
        res.status(503).send({
          error: "No response from Alpha Vantage"
        });
      }
    });
  });

  app.get('/stock/indicator', function(req, res) {
    var url = "https://www.alphavantage.co/query?function=" + req.query.indicator;
    url += "&symbol=" + req.query.stockSymbol;
    url += "&interval=daily&time_period=10&series_type=close&apikey="+config.API_KEY;

    request({
      url: url,
      timeout: 60000
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var json = JSON.parse(body);

        if(Object.keys(json).length == 0 || json["Error Message"] || json["Information"]) {
          console.log(json);
          res.status(503).send({
            error: "No response from Alpha Vantage"
          });
          return;
        }

        var payload = json[Object.keys(json)[1]];
        var values = [];
        var values2 = [];
        var values3 = [];
        var key1 = '';
        var key2 = '';
        var key3 = '';
        var dates = [];

        var first_date = new Date(Object.keys(payload)[0]);
        first_date = new Date(first_date.getTime());

        for(var key in payload) {
            var date = new Date(key);

            if(date.getDate() <= first_date.getDate() && date.getMonth() == first_date.getMonth()-6) {
                break;
            }

            dates.push(date);

            if(payload.hasOwnProperty(key)) {
                if(Object.keys(payload[key]).length == 1) {
                    values.push(parseFloat(payload[key][Object.keys(payload[key])[0]]));
                    key1 = Object.keys(payload[key])[0];
                } else if(Object.keys(payload[key]).length == 2) {
                    values.push(parseFloat(payload[key][Object.keys(payload[key])[0]]));
                    values2.push(parseFloat(payload[key][Object.keys(payload[key])[1]]));
                    key1 = Object.keys(payload[key])[0];
                    key2 = Object.keys(payload[key])[1];
                } else if(Object.keys(payload[key]).length == 3) {
                  values.push(parseFloat(payload[key][Object.keys(payload[key])[0]]));
                  values2.push(parseFloat(payload[key][Object.keys(payload[key])[1]]));
                  values3.push(parseFloat(payload[key][Object.keys(payload[key])[2]]));
                  key1 = Object.keys(payload[key])[0];
                  key2 = Object.keys(payload[key])[1];
                  key3 = Object.keys(payload[key])[2];
                }
            }
        }
        values = {
          key: key1,
          data: values
        };
        values2 = {
          key: key2,
          data: values2
        };
        values3 = {
          key: key3,
          data: values3
        };

        var resObj = {
          indicator: req.query.indicator,
          payload: {
            values: values,
            values2: values2,
            values3: values3,
            dates: dates
          }
        };

        res.send(resObj);
      } else {
        console.log("somethings wrong with alpha vantage indicator again");
        res.set("Connection", "close");
        res.status(503).send({
          error: "No response from Alpha Vantage"
        });
      }
    });
  });

  app.get('/news/:id', function(req, res) {
    var url = 'https://seekingalpha.com/api/sa/combined/' + req.params.id + '.xml';

    request({
      url: url,
      timeout: 60000
    }, function(error, response, body) {
      if(!error && response.statusCode == 200) {
        var xml = body;
        parseString(xml, function(err, result) {
          if(!err) {
            var json = result["rss"]["channel"][0]["item"];
            var resObj = [];

            json.forEach(function(item) {
              var articleRegex = /.*article.*/
              if(articleRegex.test(item.link[0])) {
                var obj = {};
                obj["title"] = item.title[0];
                obj["link"] = item.link[0];
                obj["pubDate"] = moment.tz(item.pubDate[0], "US/Eastern").format("ddd, D MMM YYYY HH:mm:ss zz");
                obj["authorName"] = item["sa:author_name"][0];
                resObj.push(obj);
              }
            });
            res.send(resObj);
          } else {
            res.status(503).send({
              error: "Error parsing XML response to JSON"
            });
          }
        });
      } else {
        res.status(503).send({
          error: "Error retrieving news from Seeking Alpha"
        });
      }
    })
  });

  // var server = app.listen(3000,function(){
  //   console.log("Live at Port 3000");
  // });



})(this);
