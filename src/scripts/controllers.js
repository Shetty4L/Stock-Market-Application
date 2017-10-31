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
                if(est.hour() >= 4 && est.hour() < 16) {
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
                          console.log(error);
                          favorites.push(angular.fromJson(localStorage[key]));
                          deferred.resolve(favorites);
                        });
                    }
                  });
                  return deferred.promise;
                } else {
                  angular.forEach(keys, function(key) {
                    if(key != 'id') {
                      favorites.push(angular.fromJson(localStorage[key]));
                      deferred.resolve(favorites);
                    }
                  });
                  return deferred.promise;
                }
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
      .controller('favoriteController', function($scope, $rootScope, $state, $http, $q, formatResponseService, currentStockData, getFavorites, plotChart) {
        // $('#result-area-header-favorite').css("display", "flex");
        // $('#result-area-header-stock').hide();

        $scope.orderKey = '';
        $scope.favorites = getFavorites;
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
      .controller('stockDetailsController', function($scope, $rootScope, $state, $stateParams, formatResponseService, currentStockData, plotChart) {
        if(!$stateParams.validRoute) $state.go('favorite');

        $scope.newRequestMade = false;

        $scope.stockData = currentStockData.getStockData();
        if(!$scope.stockData) {
          $scope.newRequestMade = true;
        }

        $scope.$watch(function() {
          return $rootScope.newParentRequestMade;
        }, function() {
          $scope.newRequestMade = $rootScope.newParentRequestMade;
          console.log($scope.newRequestMade);
          $scope.stockData = currentStockData.getStockData();
          if(!$scope.newRequestMade && $scope.stockData)  plotChart.plot($scope.stockData, undefined);
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
        // console.log(localStorage);
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
            var payload = stockData.payload;
            // console.log(payload);
            // console.log('plot function called');
            var priceData = [];
            var volumeData = [];
            var dates = [];

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

            var stock_name = stockData.symbol;
            var plotPrice = function() {
                Highcharts.charts[0] = Highcharts.setOptions({
                  global: {
                    useUTC: true
                  }
                });
                Highcharts.charts[0] = Highcharts.chart('current-stock-chart', {
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
                        min: minPrice-5,
                        max: maxPrice+5
                    }, {
                        title: {
                            text: 'Volume'
                        },
                        min: 0,
                        max: maxVolume*5,
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
                        categories : dates,
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
                        data: priceData,
                        color: '#00F',
                        type: 'area',
                        connectNulls: true,
                        tooltip: {
                            pointFormat: "<b>" + stock_name + "</b>: {point.y:.2f}",
                            headerFormat: '{point.key:%A, %b %e, %Y}<br/>'
                        }
                    }, {
                        name: 'Volume',
                        data: volumeData,
                        type: 'column',
                        color: '#F00',
                        yAxis: 1,
                        tooltip: {
                            valueSuffix: '',
                            headerFormat: '{point.key:%A, %b %e, %Y}<br/>'
                        }
                    }]
                });
            };
            plotPrice();
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
              console.log(self.stockData);
              currentStockData.setStockData(self.stockData);

              $scope.broadcast = function() {
                $rootScope.$broadcast('getStockData', self.stockData);
              };
              $scope.$evalAsync( function() {
                $scope.broadcast();
              });

              $rootScope.newParentRequestMade = false;

              console.log("Data succesfully received");
            } else {
              console.log("Data not succesfully received");
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
