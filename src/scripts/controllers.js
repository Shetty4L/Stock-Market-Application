(function () {
  'use strict';
  angular
      .module('hw8',['ngMaterial', 'ngAnimate', 'ui.router','ui.toggle'])
      .controller('LandingPage', AutoComplete)
      .config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
        $stateProvider
          .state('favorite', {
            url: '/',
            templateUrl: '../views/favorite-list.html',
            controller: 'favoriteController',
            resolve: {
              getFavorites: function($q, $http) {
                var deferred = $q.defer();
                var keys = Object.keys(localStorage);
                var favorites = [];
                var est = moment().tz("US/Eastern");
                  // console.log('updating favorites');
                angular.forEach(keys, function(key) {
                  var stock = angular.fromJson(localStorage[key]);
                  if(stock.symbol) {
                    var config = {
                      params: {
                        stockSymbol: stock.symbol,
                        outputsize:'compact'
                      }
                    };
                    $http.get('/stock', config)
                      .then(function(response){
                        if(response.status == 200) {
                          var id = stock.id;
                          var obj = response.data;
                          obj.last_price = {
                            value: obj.last_price,
                            text: obj.last_price.toFixed(2)
                          };
                          obj.change = {
                            value: obj.change,
                            text: obj.change.toFixed(2)
                          };
                          obj.change_percent = {
                            value: obj.change_percent,
                            text: obj.change_percent.toFixed(2)
                          };
                          obj.volume = {
                            value: obj.volume,
                            text: obj.volume.toLocaleString()
                          };
                          obj["id"] = id;
                          localStorage.setItem(obj.symbol, angular.toJson(obj));
                          favorites.push(angular.fromJson(localStorage[key]));
                          deferred.resolve(favorites);
                        }

                      })
                      .catch(function(error) {
                        // console.log(error);
                        favorites.push(angular.fromJson(localStorage[key]));
                        deferred.resolve(favorites);
                      });
                  }
                });
                return deferred.promise;
              }
            }
          })
          .state('stock', {
            url: '/stock',
            templateUrl: '../views/stock-details.html',
            controller: 'stockDetailsController',
            params: {
              validRoute: null
            }
          });

        $urlRouterProvider.otherwise('/');
      }])
      .run(function(appOpenedForTheFirstTime) {
        appOpenedForTheFirstTime.set(true);
      })
      .controller('favoriteController', function($scope, $rootScope, $state, $http, $q, formatResponseService, currentStockData, getFavorites, plotChart, appOpenedForTheFirstTime) {
        $scope.orderKey = '';
        if(appOpenedForTheFirstTime.get()) {
          $scope.favorites = getFavorites;
          appOpenedForTheFirstTime.set(false);
        } else {
          var favorites = [];
          for(var fav in localStorage) {
            if(fav != 'id') {
              if(localStorage.hasOwnProperty(fav)) {
                var item = angular.fromJson(localStorage.getItem(fav));
                favorites.push(item);
              }
            }
          }
          $scope.favorites = favorites;
        }
        $scope.stockKeys = {
            keys: [{
                value: "id",
                text: "Default"
              }, {
                value: "symbol",
                text: "Symbol"
              }, {
                value: "last_price.value",
                text: "Stock Price"
              }, {
                value: "change.value",
                text: "Change (Change Percent)"
              }, {
                value: "volume.value",
                text: "Volume"
              }
            ],
            selectedKey: {
              value: "id",
              text: "Default"
            },
            possibleOrders: [{
              value: "Ascending",
              reverse: false
            }, {
              value: "Descending",
              reverse: true
            }],
            selectedOrder: {
              value: "Ascending",
              reverse: false
            }
        };
        $scope.autoRefresh = false;
        $scope.manualUpdate = false;
        $rootScope.newParentRequestMade = false;
        $scope.stockData = currentStockData.getStockData();

        $scope.defaultSelected = function() {
          if($scope.stockKeys.selectedKey.value == "id") {
            $scope.stockKeys.selectedOrder = {
              value: "Ascending",
              reverse: false
            };
          }
        };

        $scope.deleteFavorite = function(item) {
          for(var i in $scope.favorites) {
            if($scope.favorites[i].symbol == item.symbol) {
              console.log($scope.favorites[i]);
              console.log($scope.favorites[i].symbol);
              item = angular.fromJson(localStorage.getItem($scope.favorites[i].symbol));
              if(item) {
                localStorage.removeItem($scope.favorites[i].symbol);
                $scope.favorites[i]["symbolExistsInLocalStorage"] = false;
              }
              // currentStockData.setStockData($scope.favorites[i]);
              localStorage.removeItem(item.symbol);
              $scope.favorites.splice(i, 1);
              return;
            }
          }
        };

        $scope.updateFavorites = function() {
          console.log('updating favorites');
          $scope.manualUpdate = true;
          var deferred = $q.defer();
          var keys = Object.keys(localStorage);
          var favorites = [];
          angular.forEach(keys, function(key) {
            var stock = angular.fromJson(localStorage[key]);
            if(stock.symbol) {
              var config = {
                params: {
                  stockSymbol: stock.symbol,
                  outputsize:'compact'
                }
              };
              $http.get('/stock', config)
                .then(function(response){
                  if(response.status == 200) {
                    var id = stock.id;
                    var obj = response.data;
                    obj.last_price = {
                      value: obj.last_price,
                      text: obj.last_price.toFixed(2)
                    };
                    obj.change = {
                      value: obj.change,
                      text: obj.change.toFixed(2)
                    };
                    obj.change_percent = {
                      value: obj.change_percent,
                      text: obj.change_percent.toFixed(2)
                    };
                    obj.volume = {
                      value: obj.volume,
                      text: obj.volume.toLocaleString()
                    };
                    obj["id"] = id;
                    localStorage.setItem(obj.symbol, angular.toJson(obj));
                    favorites.push(angular.fromJson(localStorage[key]));
                    deferred.resolve(favorites);
                  }

                })
                .catch(function(error) {
                  console.log(error);
                  favorites.push(angular.fromJson(localStorage[key]));
                  deferred.resolve(favorites);
                });
            }
          });
          $scope.$watch(function() {
            return favorites.length;
          }, function() {
            if($scope.favorites.length == favorites.length) {
                $scope.favorites = favorites;
                $scope.manualUpdate = false;
            }
          });
        };

        $scope.goToStockDetails = function() {
          if($scope.stockData) {
            $state.go('stock', {
              validRoute: true
            });
          }
        };

        $scope.getStockData = function(symbol) {
          // console.log('getting stock data from favorite list for ' + symbol);
          // console.log("Getting stock data");

          $state.go('stock', {
            validRoute: true
          });

          $rootScope.newParentRequestMade = true;
          // console.log('making new request');

          var config = {
            params: {
              stockSymbol: symbol,
              outputsize:'full'
            }
          };
          $http.get('/stock', config)
            .then(function(response){
              if(response.status == 200) {

                formatResponseService.formatResponse(response.data);
                $scope.stockData = response.data;
                currentStockData.setStockData($scope.stockData);
                var obj = $scope.stockData;
                obj.last_price = {
                  value: parseFloat(obj.last_price),
                  text: parseFloat(obj.last_price).toFixed(2)
                };
                obj.change = {
                  value: parseFloat(obj.change),
                  text: parseFloat(obj.change).toFixed(2)
                };
                obj.change_percent = {
                  value: parseFloat(obj.change_percent),
                  text: parseFloat(obj.change_percent).toFixed(2)
                };
                obj.volume = {
                  value: parseInt(obj.volume.replace(/,/g,'')),
                  text: obj.volume
                };
                currentStockData.setStockData($scope.stockData);
                $rootScope.newParentRequestMade = false;
                var favorite = angular.fromJson(localStorage.getItem($scope.stockData.symbol));
                if(favorite) {
                  $scope.stockData["symbolExistsInLocalStorage"] = true;
                } else {
                  $scope.stockData["symbolExistsInLocalStorage"] = false;
                }
                if($scope.stockData)  plotChart.plot($scope.stockData, undefined);
                // console.log("Data succesfully received");
              } else {
                // console.log("Data not succesfully received");
                console.log(response);
                // self.stockData = null;
              }
            })
            .catch(function(error) {
              // self.stockData = null;
              self.newRequestMade = false;
              console.log('error receiving data from node');
              console.log(error);
            });
        };
      })
      .controller('stockDetailsController', function($scope, $rootScope, $state, $stateParams, $http, formatResponseService, currentStockData, plotChart) {
        if(!$stateParams.validRoute) $state.go('favorite');

        $scope.newRequestMade = false;
        $scope.indicators = ['Price','SMA','EMA','STOCH','RSI','ADX','CCI','BBANDS','MACD'];
        $scope.currentIndicator = 'Price';
        $scope.plottingNewChart = false;

        $scope.stockData = currentStockData.getStockData();
        if(!$scope.stockData) {
          $scope.newRequestMade = true;
        } else {
          plotChart.plot($scope.stockData, undefined);
        }

        $scope.$watch(function() {
          return $rootScope.newParentRequestMade;
        }, function() {
          $scope.newRequestMade = $rootScope.newParentRequestMade;
          // console.log($scope.newRequestMade);
          $scope.stockData = currentStockData.getStockData();
          if(!$scope.newRequestMade && $scope.stockData)  {
            if(Highcharts.charts.size < 1)
              plotChart.plot($scope.stockData, undefined);
          }
        }, true);

        $scope.$on('getStockData', function(event, args) {
          formatResponseService.formatResponse(args);
          $scope.stockData = args;
          currentStockData.setStockData($scope.stockData);
          var obj = $scope.stockData;
          obj.last_price = {
            value: parseFloat(obj.last_price),
            text: parseFloat(obj.last_price).toFixed(2)
          };
          obj.change = {
            value: parseFloat(obj.change),
            text: parseFloat(obj.change).toFixed(2)
          };
          obj.change_percent = {
            value: parseFloat(obj.change_percent),
            text: parseFloat(obj.change_percent).toFixed(2)
          };
          obj.volume = {
            value: parseInt(obj.volume.replace(/,/g,'')),
            text: obj.volume
          };
          currentStockData.setStockData($scope.stockData);
          // $scope.newRequestMade = false;
          var favorite = angular.fromJson(localStorage.getItem($scope.stockData.symbol));
          if(favorite) {
            $scope.stockData["symbolExistsInLocalStorage"] = true;
          } else {
            $scope.stockData["symbolExistsInLocalStorage"] = false;
          }
        });

        $scope.toggleFavorite = function() {
          var item = angular.fromJson(localStorage.getItem($scope.stockData.symbol));
          if(item) {
            localStorage.removeItem($scope.stockData.symbol);
            $scope.stockData["symbolExistsInLocalStorage"] = false;
          } else {
            var obj = Object.assign({}, $scope.stockData);
            var id = parseInt(localStorage.getItem("id"));
            if(!id) {
              localStorage.setItem("id", 0);
              id = 0;
            }
            obj["id"] = id+1;
            console.log($scope.stockData);
            localStorage.setItem($scope.stockData.symbol, angular.toJson(obj));
            localStorage.setItem("id", id+1);
            $scope.stockData["symbolExistsInLocalStorage"] = true;
          }
          currentStockData.setStockData($scope.stockData);
        };

        $scope.clickIndicator = function(indicator) {
          $scope.currentIndicator = indicator;
          $scope.stockData = currentStockData.getStockData();
          if(!$scope.newRequestMade && $scope.stockData) {
            if(indicator.toLowerCase() == 'price') {
              plotChart.plot($scope.stockData, undefined);
            } else {
              if(!$scope.stockData.indicators || !$scope.stockData.indicators[indicator.toLowerCase()]) {
                if(!$scope.stockData.indicators) $scope.stockData.indicators = {};
                var indicatorConfig = {
                  params: {
                    stockSymbol: $scope.stockData.symbol,
                    indicator: indicator
                  }
                };
                $scope.plottingNewChart = true;
                $http.get('/stock/indicator', indicatorConfig)
                  .then(function (response) {
                    $scope.plottingNewChart = false;
                    $scope.stockData.indicators[indicator.toLowerCase()] = response.data.payload;
                    currentStockData.setStockData($scope.stockData);
                    plotChart.plot($scope.stockData, indicator.toLowerCase());
                  })
                  .catch(function(error) {

                  });
              } else {
                if($scope.stockData.indicators[indicator.toLowerCase()]) {
                  plotChart.plot($scope.stockData, indicator.toLowerCase());
                }
              }
            }
          }
        };
      })
      .factory('formatResponseService', function() {
        return {
          formatResponse: function(stockData) {
            stockData.timestamp = moment.tz(stockData.timestamp, "US/Eastern").format("YYYY-MM-DD HH:mm:ss zz");
            stockData.change = parseFloat(stockData.change).toFixed(2);
            stockData.change_percent = parseFloat(stockData.change_percent).toFixed(2);
            stockData.close = parseFloat(stockData.close).toFixed(2);
            stockData.high = parseFloat(stockData.high).toFixed(2);
            stockData.last_price = parseFloat(stockData.last_price).toFixed(2);
            stockData.low = parseFloat(stockData.low).toFixed(2);
            stockData.open = parseFloat(stockData.open).toFixed(2);
            stockData.prev_close = parseFloat(stockData.prev_close).toFixed(2);
            stockData.volume = parseInt(stockData.volume).toLocaleString();
          }
        };
      })
      .factory('currentStockData', function() {
        var stock = null;
        return {
          getStockData: function() {
            return stock;
          },
          setStockData: function(stockData) {
            stock = stockData;
          }
        };
      })
      .factory('plotChart', function() {
        return {
          plot: function(stockData, type) {
            if(!type) {
              var payload = stockData.payload;
              var stock_name = stockData.symbol;

              var plotPrice = function(payload) {
                for(var i in payload.dates) {
                  payload.dates[i] = new Date(payload.dates[i]);
                }
                Highcharts.charts[0] = new Highcharts.chart('current-stock-chart', {
                    chart: {
                        type: 'area',
                        zoomType: 'x'
                    },
                    title: {
                        text: stockData.symbol.toUpperCase() + " Stock Price and Volume"
                    },
                    subtitle: {
                        text: "<a target='_blank' href='https://www.alphavantage.co/' style='text-decoration:none;'>Source: Alpha Vantage</a>",
                        useHTML: true
                    },
                    yAxis: [{
                        title: {
                            text: 'Stock Price'
                        },
                        alignTicks: false,
                        min: payload.minPrice-5,
                        max: payload.maxPrice+5
                    }, {
                        title: {
                            text: 'Volume'
                        },
                        min: payload.minVolume,
                        max: payload.maxVolume,
                        // tickInterval: 50000000,
                        tickLength: 0,
                        gridLineColor: 'transparent',
                        labels : {
                            formatter: function() {
                                return this.value/1000000 + ' M';
                            }
                        },
                        opposite: true,
                    }],
                    xAxis: {
                        type: 'datetime',
                        labels: {
                            format: '{value:%m/%d}',
                            style: {
                                fontSize: '8px'
                            },
                            rotation: 90
                        },
                        tickInterval: 7,
                        categories : payload.dates,
                        reversed: true
                    },
                    plotOptions: {
                        area: {
                            fillColor: '#e6e6ff',
                            opacity: 0.5,
                            pointWidth: 0.2,
                            borderWidth: 0.2
                        }
                    },
                    series: [{
                        name: 'Price',
                        data: payload.priceData,
                        color: '#00F',
                        type: 'area',
                        connectNulls: true,
                        tooltip: {
                            pointFormat: "<b>" + stock_name + "</b>: {point.y:.2f}",
                            headerFormat: '{point.key:%A, %b %e, %Y}<br/>'
                        }
                    }, {
                        name: 'Volume',
                        data: payload.volumeData,
                        type: 'column',
                        color: '#F00',
                        yAxis: 1,
                        tooltip: {
                            valueSuffix: '',
                            headerFormat: '{point.key:%A, %b %e, %Y}<br/>'
                        }
                    }],
                    global: {
                      useUTC: true
                    },
                    id: "price"
                });
              };
              plotPrice(payload);
            } else {
              function plotIndicator(stockData, type) {
                var payload = stockData.payload;
                var stock_name = stockData.symbol;
                var series = [];
                var color1 = '#da001e';
                var color2 = '#2f5ef3';
                var color3 = '#e3d849';
                var chartTitle;
                switch(type) {
                    case 'sma': chartTitle = 'Simple Moving Average (SMA)'; break;
                    case 'ema': chartTitle = 'Exponential Moving Average (EMA)'; break;
                    case 'stoch': chartTitle = 'Stochastic Oscillator (STOCH)'; break;
                    case 'rsi': chartTitle = 'Relative Strength Index (RSI)'; break;
                    case 'adx': chartTitle = 'Average Directional Movement Index (ADX)'; break;
                    case 'cci': chartTitle = 'Commodity Channel Index (CCI)'; break;
                    case 'bbands': chartTitle = 'Bollinger Bands (BBANDS)'; break;
                    case 'macd': chartTitle = 'Moving Average Convergence/Divergence (MACD)'; break;
                }
                if(stockData.indicators[type].values.data.length && stockData.indicators[type].values2.data.length && stockData.indicators[type].values3.data.length) {
                    var line1 = {
                        name: stock_name + ' ' + stockData.indicators[type].values.key,
                        data: stockData.indicators[type].values.data.slice(),
                        color: color1,
                        type: 'spline',
                        tooltip: {
                            pointFormat: "<b>" + stock_name + "</b>: {point.y:.2f}",
                            headerFormat: '{point.key:%A, %b %e, %Y}<br/>'
                        }
                    };
                    var line2 = {
                        name: stock_name + ' ' + stockData.indicators[type].values2.key,
                        data: stockData.indicators[type].values2.data.slice(),
                        color: color2,
                        type: 'spline',
                        tooltip: {
                            pointFormat: "<b>" + stock_name + "</b>: {point.y:.2f}",
                            headerFormat: '{point.key:%A, %b %e, %Y}<br/>'
                        }
                    };
                    var line3 = {
                        name: stock_name + ' ' + stockData.indicators[type].values3.key,
                        data: stockData.indicators[type].values3.data.slice(),
                        color: color3,
                        type: 'spline',
                        tooltip: {
                            pointFormat: "<b>" + stock_name + "</b>: {point.y:.2f}",
                            headerFormat: '{point.key:%A, %b %e, %Y}<br/>'
                        }
                    };
                    series.push(line1);
                    series.push(line2);
                    series.push(line3);

                } else if(stockData.indicators[type].values.data.length && stockData.indicators[type].values2.data.length) {
                    var line1 = {
                        name: stock_name + ' ' + stockData.indicators[type].values.key,
                        data: stockData.indicators[type].values.data.slice(),
                        color: color1,
                        type: 'spline',
                        tooltip: {
                            pointFormat: "<b>" + stock_name + "</b>: {point.y:.2f}",
                            headerFormat: '{point.key:%A, %b %e, %Y}<br/>'
                        }
                    };
                    var line2 = {
                        name: stock_name + ' ' + stockData.indicators[type].values2.key,
                        data: stockData.indicators[type].values2.data.slice(),
                        color: color2,
                        type: 'spline',
                        tooltip: {
                            pointFormat: "<b>" + stock_name + "</b>: {point.y:.2f}",
                            headerFormat: '{point.key:%A, %b %e, %Y}<br/>'
                        }
                    };
                    series.push(line1);
                    series.push(line2);
                } else {
                    var name = stockData.indicators[type].values.key;
                    var line1 = {
                        name: stock_name + ' ' + name,
                        data: stockData.indicators[type].values.data.slice(),
                        color: color1,
                        type: 'spline',
                        tooltip: {
                            pointFormat: "<b>" + stock_name + "</b>: {point.y:.2f}",
                            headerFormat: '{point.key:%A, %b %e, %Y}<br/>'
                        }
                    };
                    series.push(line1);
                }
                var dates = stockData.indicators[type].dates;
                for(var k in dates) {
                  dates[k] = new Date(dates[k]);
                }
                if(Highcharts.charts[0].userOptions.id == 'price') {
                  Highcharts.charts[0] = new Highcharts.chart('current-stock-chart', {
                    global: {
                      useUTC: true
                    },
                    chart: {
                        zoomType: 'x',
                    },
                    title: {
                        text: chartTitle
                    },
                    subtitle: {
                        text: "<a target='_blank' href='https://www.alphavantage.co/' style='text-decoration:none;'>Source: Alpha Vantage</a>",
                        useHTML: true
                    },
                    yAxis: [{
                        title: {
                            text: type.toUpperCase()
                        },
                    }],
                    xAxis: {
                        type: 'datetime',
                        labels: {
                            format: '{value:%m/%d}',
                            style: {
                                fontSize: '8px'
                            },
                            rotation: 90
                        },
                        tickInterval: 7,
                        categories : dates,
                        reversed: true
                    },
                    id: type,
                    series: series
                  });
                } else {
                  var chart = Highcharts.charts[0];
                  chart.setTitle({text: chartTitle});
                  chart.yAxis[0].setTitle({text: type.toUpperCase()});
                  var values = stockData.indicators[type].values;
                  var values2 = stockData.indicators[type].values2;
                  var values3 = stockData.indicators[type].values3;

                  if(values.data.length && values2.data.length && values3.data.length) {
                      if(!chart.series[1] && !chart.series[2]) {
                          chart.addSeries({
                              data: values2.data.slice()
                          });
                          chart.addSeries({
                              data: values3.data.slice()
                          });
                      } else if(!chart.series[2]) {
                          chart.series[1].setData(values2.data.slice(), true);
                          chart.addSeries({
                              data: values3.data.slice()
                          });
                      } else {
                          chart.series[1].setData(values2.data.slice(), true);
                          chart.series[2].setData(values3.data.slice(), true);
                      }
                      chart.series[0].setData(values.data.slice(), true);
                      chart.series[0].update({
                          name: stock_name + ' ' + values.key,
                          color: color1
                      }, true);
                      chart.series[1].update({
                          name: stock_name + ' ' + values2.key,
                          color: color2
                      }, true);
                      chart.series[2].update({
                          name: stock_name + ' ' + values3.key,
                          color: color3
                      }, true);

                  } else if(values.data.length && values2.data.length) {
                      while(chart.series.length > 2)
                       chart.series[chart.series.length-1].remove();

                      if(!chart.series[1]) {
                          chart.addSeries({
                              data: values2.data.slice()
                          });
                      } else {
                          chart.series[1].setData(values2.data.slice(), true);
                      }

                      chart.series[0].update({
                          name: stock_name + ' ' + values.key,
                          color: color1
                      }, true);
                      chart.series[1].update({
                          name: stock_name + ' ' + values2.key,
                          color: color2
                      }, true);
                      chart.series[0].setData(values.data.slice(), true);
                  } else {
                      name = values.key;
                      while(chart.series.length > 1)
                       chart.series[chart.series.length-1].remove();

                      chart.series[0].update({
                          name: stock_name + ' ' + name,
                          color: color1
                      }, true);
                      chart.series[0].setData(values.data.slice(), true);
                  }

                }
              }
              plotIndicator(stockData, type);
            }
          }
        };
      })
      .factory('appOpenedForTheFirstTime', function() {
        var flag = true;
        return {
          get: function() {
            return flag;
          },
          set: function(open) {
            flag = open;
          }
        };
      });

  function AutoComplete ($http, $q, $sce, $scope, $rootScope, $state, $timeout, currentStockData, plotChart) {
    var self = this;

    self.querySearch = querySearch;
    self.selectedItemChange = selectedItemChange;
    self.searchTextChange   = searchTextChange;
    self.getStockQuote = getStockQuote;
    self.clear = clear;
    self.error = false;
    self.selectedItem = null;
    self.stockDataExists = false;
    self.stockData = null;
    self.plotChart = plotHighChart;
    $rootScope.newParentRequestMade = false;

    function querySearch (query) {
      var deferred = $q.defer();

      var config = {
        params: {
          queryText: query
        }
      };
      $http.get('/autocomplete', config)
        .then(function(response) {
          deferred.resolve(response.data);
        })
        .catch(function(error) {
        });

      return deferred.promise;
    }

    function searchTextChange(text) {
      var letterNumber = /^[0-9a-zA-Z ]+$/;

      if(text.match(letterNumber)) {
        self.error = false;
      } else {
        self.error = true;
      }
      // $log.info('Text changed to ' + text);
    }

    function selectedItemChange(item) {
      // $log.info('Item changed to ' + JSON.stringify(item));
      // passStockSymbolService.setStockSymbol(self.payload[0]);
    }

    function clear() {
      self.selectedItem = null;
      self.searchText = "";
    }

    function getStockQuote() {
      // console.log("Getting stock data");

      $state.go('stock', {
        validRoute: true
      });

      self.stockData = currentStockData.getStockData();
      if(!self.stockData || self.stockData.symbol != self.selectedItem.Symbol) {
        // console.log('making new request');
        $rootScope.newParentRequestMade = true;

        var config = {
          params: {
            stockSymbol: self.selectedItem.Symbol,
            outputsize:'full'
          }
        };
        $http.get('/stock', config)
          .then(function(response){
            if(response.status == 200) {

              self.stockData = response.data;
              currentStockData.setStockData(self.stockData);

              $scope.broadcast = function() {
                $rootScope.$broadcast('getStockData', self.stockData);
              };
              $scope.$evalAsync( function() {
                $scope.broadcast();
              });

              $rootScope.newParentRequestMade = false;

              // console.log("Data succesfully received");
            } else {
              // console.log("Data not succesfully received");
              console.log(response);
              // self.stockData = null;
            }
          })
          .catch(function(error) {
            // self.stockData = null;
            self.newRequestMade = false;
            // console.log('error receiving data from node');
            console.log(error);
          });
      } else {
        console.log("stock data already on display");
      }

    }

    function plotHighChart(type) {
      $scope.$watch(function() {
        return self.stockData;
      }, function() {
        if(!$rootScope.newParentRequestMade && self.stockData)  plotChart.plot(self.stockData, type);
      });
    }
  }

})(this);
