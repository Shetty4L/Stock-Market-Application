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
              getFavorites: function($http, $q) {
                var favorites = [];
                for(var fav in localStorage) {
                  if(fav != 'id') {
                    if(localStorage.hasOwnProperty(fav)) {
                      var item = angular.fromJson(localStorage.getItem(fav));
                      favorites.push(item);
                    }
                  }
                }
                return favorites;
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
          })
          .state('stock.current', {
            url: '/current',
            controller: 'currentStockDetailsController',
            templateUrl: '../views/current-stock.html'
          })
          .state('stock.historical', {
            url: '/historical',
            controller: 'historicStockDetailsController',
            templateUrl: '../views/historic-stock.html'
          })
          .state('stock.news', {
            url: '/news',
            controller: 'newsFeedDetailsController',
            templateUrl: '../views/news-feed.html'
          });

        $urlRouterProvider.otherwise('/');
      }])
      .run(function($state, $stateParams, appOpenedForTheFirstTime) {
        appOpenedForTheFirstTime.set(true);
        $state.go('favorite');
      })
      .controller('favoriteController', function($scope, $rootScope, $state, $http, $q, $interval, $mdToast, formatResponseService, currentStockData, getFavorites, plotChart, appOpenedForTheFirstTime) {
        $scope.orderKey = '';
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
        $scope.interval = null;
        $scope.refreshFavorites = false;
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
              // console.log($scope.favorites[i]);
              // console.log($scope.favorites[i].symbol);
              item = angular.fromJson(localStorage.getItem($scope.favorites[i].symbol));
              if(item) {
                localStorage.removeItem($scope.favorites[i].symbol);
                $scope.favorites[i]["symbolExistsInLocalStorage"] = false;
              }
              // currentStockData.setStockData($scope.favorites[i]);
              localStorage.removeItem(item.symbol);
              $scope.favorites.splice(i, 1);
              break;
            }
          }
          if($scope.stockData.symbol == item.symbol) {
            $scope.stockData.symbolExistsInLocalStorage = false;
            currentStockData.setStockData($scope.stockData);
          }
        };

        $scope.updateFavorites = function(refreshFavorites) {
          $scope.refreshFavorites = refreshFavorites;
          var promises = [];
          var keys = Object.keys(localStorage);
          angular.forEach(keys, function(key) {
            var stock = angular.fromJson(localStorage[key]);
            if(stock.symbol) {
              var promise = $http.get('/stock', {
                timeout: 5*1000,
                params: {
                  stockSymbol: stock.symbol,
                  outputsize: 'compact'
                }
              })
              .then(function(response) {
                if(response.status == 200) {
                  var id = stock.id;
                  var obj = Object.assign({}, stock);
                  obj.last_price = {
                    value: response.data.last_price,
                    text: response.data.last_price.toFixed(2)
                  };
                  obj.change = {
                    value: response.data.change,
                    text: response.data.change.toFixed(2)
                  };
                  obj.change_percent = {
                    value: response.data.change_percent,
                    text: response.data.change_percent.toFixed(2)
                  };
                  obj.volume = {
                    value: response.data.volume,
                    text: response.data.volume.toLocaleString()
                  };
                  obj["id"] = id;
                  localStorage.setItem(obj.symbol, angular.toJson(obj));
                  return obj;
                } else {
                  // console.log(response);
                  return angular.fromJson(localStorage.getItem(stock.symbol));
                }
              })
              .catch(function(error) {
                // console.log(error);
                return angular.fromJson(localStorage.getItem(stock.symbol));
              });
              promises.push(promise);
            }
          });
          $q.all(promises).then(function(favoritesData) {
            // console.log(favoritesData);
            $scope.refreshFavorites = false;
            $scope.favorites = favoritesData;
          });
        };

        $scope.performAutoRefresh = function(autoRefresh) {
          if(autoRefresh) {
            // console.log('refreshing favorites automatically');
            $scope.interval = $interval(function() {
              $scope.updateFavorites(true);
            }, 5*1000);
          } else {
            // console.log('auto refresh cancel');
            $interval.cancel($scope.interval);
          }
        };

        $scope.goToStockDetails = function() {
          if($scope.stockData) {
            $state.go('stock.current', {
              validRoute: true
            });
          }
        };

        $scope.getStockData = function(stock) {
          var symbol = stock.symbol;
          var name = stock.name;
          var exchange = stock.exchange;
          $rootScope.newParentRequestMade = true;
          $rootScope.stockQuery = {
            symbol: symbol,
            name: name,
            exchange: exchange
          };

          $state.go('stock.current', {
            validRoute: true
          });
          /*
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
              }
            })
            .catch(function(error) {
              $scope.stockData = {};
              $scope.stockData.error = true;
              $scope.stockData.symbol = symbol;
              $scope.stockData.name = name;
              $scope.stockData.exchange = exchange;
              currentStockData.setStockData($scope.stockData);
              $rootScope.newParentRequestMade = false;
              // $mdToast.show($mdToast.simple().textContent('Error retrieving data from API'));
              // alert('error from AV');
            });
            */
        };

        if(appOpenedForTheFirstTime.get()) {
          $scope.favorites = getFavorites;
          appOpenedForTheFirstTime.set(false);
          $scope.updateFavorites(false);
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
      })
      .controller('stockDetailsController', function($scope, $transitions) {
        $scope.selectedState = 'stock.current';
        $transitions.onSuccess({}, function($transition) {
          var stockRegex = /stock/;
          if(stockRegex.test($transition.to().name)) {
            $scope.selectedState = $transition.to().name;
          }
        });
      })
      .controller('currentStockDetailsController', function($scope, $q, $rootScope, $state, $stateParams, $http, $mdToast, formatResponseService, currentStockData, plotChart) {
        if(!$stateParams.validRoute) $state.go('favorite');

        $scope.newRequestMade = false;
        $scope.newIndicatorRequestMade = false;
        $scope.indicators = ['Price','SMA','EMA','STOCH','RSI','ADX','CCI','BBANDS','MACD'];
        $scope.currentIndicator = 'Price';
        $scope.plottingNewChart = false;
        $scope.stockData = currentStockData.getStockData();
        // if($scope.stockData && $scope.stockData.symbol == $rootScope.stockQuery.symbol) {
        //   if($scope.stockData.indicatorLoaded) {
        //     $scope.indicatorLoaded = $scope.stockData.indicatorLoaded;
        //   } else {
        //     $scope.indicatorLoaded = {
        //       price: false,
        //       sma: false,
        //       ema: false,
        //       stoch: false,
        //       rsi: false,
        //       adx: false,
        //       cci: false,
        //       bbands: false,
        //       macd: false
        //     };
        //   }
        //   if($scope.stockData.indicatorData) {
        //     $scope.indicatorData = $scope.stockData.indicatorData;
        //   } else {
        //     $scope.indicatorData = {};
        //   }
        // } else {
        //   $scope.indicatorLoaded = {
        //     price: false,
        //     sma: false,
        //     ema: false,
        //     stoch: false,
        //     rsi: false,
        //     adx: false,
        //     cci: false,
        //     bbands: false,
        //     macd: false
        //   };
        //   $scope.indicatorData = {};
        // }

        /*
        if(!$scope.stockData) {
          $scope.newRequestMade = true;
        } else {
          if(!$scope.stockData.error) {
              plotChart.plot($scope.stockData, undefined);
          }
        }

        $scope.$watch(function() {
          return $rootScope.newParentRequestMade;
        }, function() {
          $scope.newRequestMade = $rootScope.newParentRequestMade;
          $scope.stockData = currentStockData.getStockData();
          if(!$scope.newRequestMade && !$scope.stockData.error) {
              plotChart.plot($scope.stockData, undefined);
          }
        }, true);

        $scope.$on('getStockData', function(event, args) {
          if(!args.error) {
            formatResponseService.formatResponse(args);
            $scope.indicatorLoaded.price = true;
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
          }
        });
        */
        $scope.getStockData = function(stockQuery) {
          var deferred = $q.defer();
          $scope.newRequestMade = true;
          $scope.newIndicatorRequestMade = true;
          var config = {
            params: {
              stockSymbol: stockQuery.symbol,
              outputsize:'full'
            }
          };
          $http.get('/stock', config)
            .then(function(response){
              if(response.status == 200) {
                formatResponseService.formatResponse(response.data);
                $scope.stockData = response.data;
                $scope.stockData.error = false;
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
                $scope.stockData.symbol = stockQuery.symbol;
                $scope.stockData.name = stockQuery.name;
                $scope.stockData.exchange = stockQuery.exchange;
                $scope.indicatorLoaded.price = true;
                $scope.stockData['indicatorLoaded'] = $scope.indicatorLoaded;
                $scope.stockData['indicatorData'] = $scope.indicatorData;
                var favorite = angular.fromJson(localStorage.getItem($scope.stockData.symbol));
                if(favorite) {
                  $scope.stockData["symbolExistsInLocalStorage"] = true;
                } else {
                  $scope.stockData["symbolExistsInLocalStorage"] = false;
                }
              }
              $scope.newRequestMade = false;
              $scope.newIndicatorRequestMade = false;
              currentStockData.setStockData($scope.stockData);
              deferred.resolve($scope.stockData);
            })
            .catch(function(error) {
              $scope.stockData = {};
              $scope.stockData.error = true;
              $scope.stockData.symbol = stockQuery.symbol;
              $scope.stockData.name = stockQuery.name;
              $scope.stockData.exchange = stockQuery.exchange;
              currentStockData.setStockData($scope.stockData);
              // $rootScope.newParentRequestMade = false;
              $scope.newRequestMade = false;
              $scope.newIndicatorRequestMade = false;
              deferred.resolve($scope.stockData);
            });
            return deferred.promise;
        };

        $scope.toggleFavorite = function() {
          var item = angular.fromJson(localStorage.getItem($scope.stockData.symbol));
          if(item) {
            localStorage.removeItem($scope.stockData.symbol);
            $scope.stockData["symbolExistsInLocalStorage"] = false;
          } else {
            $scope.stockData["symbolExistsInLocalStorage"] = true;
            var obj = Object.assign({}, $scope.stockData);
            var id = parseInt(localStorage.getItem("id"));
            if(!id) {
              localStorage.setItem("id", 0);
              id = 0;
            }
            obj["id"] = id+1;
            delete obj["fullData"];
            delete obj["payload"];
            delete obj["indicatorData"];
            delete obj["indicatorLoaded"];
            localStorage.setItem($scope.stockData.symbol, angular.toJson(obj));
            localStorage.setItem("id", id+1);
          }
          currentStockData.setStockData($scope.stockData);
        };

        $scope.shareOnFacebook = function() {
          var options = Highcharts.charts[0].options;
          var exportUrl = 'http://export.highcharts.com/';
          var data = {
              options: JSON.stringify(options),
              filename: $scope.stockData.symbol,
              type: 'image/png',
              async: true
          };

          $http({
            url: '/share',
            method: "POST",
            data: data,
            headers: {'Content-Type': 'application/json'}
          })
          .then(function(response) {
            FB.ui({
              method: 'feed',
              link: exportUrl + response.data
            }, function(response) {
              // console.log('sharing on facebook');
            });
          })
          .catch(function(error) {
            // console.log(error);
          });
        };

        $scope.clickIndicator = function(symbol, indicator) {
          $scope.currentIndicator = indicator.toLowerCase();
          $scope.stockData = currentStockData.getStockData();
          $scope.newIndicatorRequestMade = true;
          // if(!$scope.newRequestMade) {
          // console.log($scope.stockData);
            if(indicator.toLowerCase() == 'price') {
              if($scope.stockData && !$scope.stockData.error) {
                plotChart.plot($scope.stockData, undefined);
                $scope.newIndicatorRequestMade = false;
              }
            } else {
              // console.log('getting in');
              if(!$scope.indicatorData[indicator.toLowerCase()]) {
                var indicatorConfig = {
                  params: {
                    stockSymbol: symbol,
                    indicator: indicator
                  }
                };
                $http.get('/stock/indicator', indicatorConfig)
                  .then(function (response) {
                    $scope.indicatorLoaded[response.data.indicator.toLowerCase()] = true;
                    $scope.indicatorData[response.data.indicator.toLowerCase()] = response.data.payload;
                    plotChart.plot($scope.indicatorData[indicator.toLowerCase()], indicator.toLowerCase());
                    $scope.newIndicatorRequestMade = false;
                    $scope.stockData.indicatorLoaded = $scope.indicatorLoaded;
                    $scope.stockData.indicatorData = $scope.indicatorData;
                    currentStockData.setStockData($scope.stockData);
                  })
                  .catch(function(error) {
                    if($scope.indicatorData[indicator.toLowerCase()]) {
                      plotChart.plot($scope.indicatorData[indicator.toLowerCase()], indicator.toLowerCase());
                    }
                    $scope.newIndicatorRequestMade = false;
                  });
              } else {
                if($scope.indicatorData[indicator.toLowerCase()]) {
                  plotChart.plot($scope.indicatorData[indicator.toLowerCase()], indicator.toLowerCase());
                  $scope.newIndicatorRequestMade = false;
                }
              }
            }
          // }
        };

        $scope.fetchIndicatorData = function(symbol) {
          var promises = [];
          angular.forEach($scope.indicators, function(indicator) {
            if(indicator.toLowerCase() != 'price') {
              var indicatorConfig = {
                params: {
                  stockSymbol: symbol,
                  indicator: indicator
                }
              };
              var promise = $http.get('/stock/indicator', indicatorConfig)
                .then(function (response) {
                  if(response.status == 200) {
                    $scope.indicatorLoaded[response.data.indicator.toLowerCase()] = true;
                    $scope.indicatorData[response.data.indicator.toLowerCase()] = response.data.payload;
                  }
                  // console.log(response.data);
                  return response.data;
                })
                .catch(function(error) {
                  return error;
                });
              promises.push(promise);
            }
          });
          // $q.all(promises).then(function(responses) {
          //   angular.forEach(responses, function(response) {
          //     if(response.indicator) {
          //       $scope.indicatorLoaded[response.indicator.toLowerCase()] = true;
          //       $scope.indicatorData[response.indicator.toLowerCase()] = response.payload;
          //     }
          //   });
          //   console.log($scope.indicatorData);
          // });
        };

        if($rootScope.stockQuery) {
          if(!$scope.stockData ||
            $scope.stockData.error ||
            $scope.stockData.symbol != $rootScope.stockQuery.symbol) {
              $scope.indicatorLoaded = {
                price: false,
                sma: false,
                ema: false,
                stoch: false,
                rsi: false,
                adx: false,
                cci: false,
                bbands: false,
                macd: false
              };
              $scope.indicatorData = {};
              $scope.fetchIndicatorData($rootScope.stockQuery.symbol);
              if($scope.currentIndicator.toLowerCase() != 'price') {
                plotChart.plot($scope.indicatorData[$scope.currentIndicator.toLowerCase()], $scope.currentIndicator.toLowerCase());
              }

              $scope.getStockData($rootScope.stockQuery).then(function(data) {
                if(!data.error) {
                  $scope.stockData.indicatorLoaded = $scope.indicatorLoaded;
                  $scope.stockData.indicatorData = $scope.indicatorData;
                  currentStockData.setStockData($scope.stockData);
                  if($scope.currentIndicator.toLowerCase() == 'price') {
                    plotChart.plot(data, undefined);
                  }
                }
              });
          } else if($scope.stockData &&
            !$scope.stockData.error &&
            $scope.stockData.symbol == $rootScope.stockQuery.symbol){
              $scope.indicatorLoaded = $scope.stockData.indicatorLoaded;
              $scope.indicatorData = $scope.stockData.indicatorData;
              // $scope.fetchIndicatorData($rootScope.stockQuery.symbol);
              if($scope.currentIndicator.toLowerCase() == 'price') {
                plotChart.plot($scope.stockData, undefined);
              } else {
                // console.log('lol 2');
                plotChart.plot($scope.indicatorData[$scope.currentIndicator.toLowerCase()], indicator.toLowerCase());
              }
          }
        }
      })
      .controller('historicStockDetailsController', function($scope, $state, $stateParams, currentStockData, plotChart) {
        if(!$stateParams.validRoute) $state.go('favorite');
        $scope.newRequestMade = false;
        $scope.stockData = currentStockData.getStockData();

        angular.element($('#historic-chart')).ready(function() {
          if($scope.stockData) plotChart.plotHistoricData($scope.stockData);
        });

      })
      .controller('newsFeedDetailsController', function($scope, $state, $stateParams, $http, currentStockData) {
        if(!$stateParams.validRoute) $state.go('favorite');

        $scope.stockData = currentStockData.getStockData();
        $scope.newRequestMade = false;
        if($scope.stockData) {
          if(!$scope.stockData.error) {
            $scope.newRequestMade = true;
            $http.get('/news/' + $scope.stockData.symbol)
              .then(function(response) {
                $scope.newRequestMade = false;
                $scope.news = response.data;
              })
              .catch(function(error) {
                // $mdToast.show($mdToast.simple().textContent('Error retrieving data from API'));
              });
          }
        }
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
      .factory('plotChart', function($rootScope, $window) {
        return {
          plot: function(stockData, type) {
            if(!type) {
              var payload = stockData.payload;
              var stock_name = stockData.symbol;
              var plotPrice = function(payload, width) {
                for(var i in payload.dates) {
                  payload.dates[i] = new Date(payload.dates[i]);
                }
                if(Highcharts.charts.length) {
                  Highcharts.charts.pop();
                }
                Highcharts.charts[0] = new Highcharts.chart('current-stock-chart', {
                    chart: {
                        type: 'area',
                        zoomType: 'x',
                        width: width,
                        height: 350
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
                                fontSize: '9px'
                            },
                            rotation: 90
                        },
                        ordinal: true,
                        tickPositioner: function() {
                          var minDate = moment(this.min),
                              maxDate = moment(this.max-24*3600*1000);

                          var tickInterval = 7;
                          if(maxDate.diff(minDate, 'days') <= 120) tickInterval = 4;
                          if(maxDate.diff(minDate, 'days') <= 60) tickInterval = 2;
                          if(maxDate.diff(minDate, 'days') <= 30) tickInterval = 1;

                          var cur_date = maxDate;
                          var positions = [];
                          for(var i=payload.priceData.length-1;i>=0;i=i-tickInterval) {
                            cur_date = moment(payload.priceData[i][0]);
                            // if(cur_date <= maxDate && cur_date >= minDate && positions[positions.length-1].diff(cur_date, 'days')>=tickInterval) {
                            //   positions.push(cur_date);
                            // }
                            if(cur_date<=maxDate && cur_date>=minDate)
                              positions.push(cur_date);
                          }
                          positions.info = this.tickPositions.info;
                          return positions;
                        }
                    },
                    plotOptions: {
                        area: {
                            fillColor: '#e6e6ff',
                            opacity: 0.5,
                            pointWidth: 0.2,
                            borderWidth: 0.2
                        },
                        // series: {
                        //   pointRange: 24*3600*1000
                        // }
                    },
                    series: [{
                        name: 'Price',
                        data: payload.priceData,
                        color: '#00F',
                        type: 'area',
                        tooltip: {
                            pointFormat: "<b>" + stock_name + "</b>: {point.y:.2f}",
                            headerFormat: '{point.key}<br/>'
                        },
                        pointStart: payload.startDate,
                        pointInterval: 24 * 3600 * 1000
                    }, {
                        name: 'Volume',
                        data: payload.volumeData,
                        type: 'column',
                        color: '#F00',
                        yAxis: 1,
                        tooltip: {
                            valueSuffix: '',
                            headerFormat: '{point.key}<br/>'
                        },
                        pointStart: payload.startDate,
                        pointInterval: 24 * 3600 * 1000
                    }],
                    global: {
                      useUTC: true
                    },
                    id: "price"
                });
              };

              angular.element($("#current-stock-chart")).ready(function() {
                plotPrice(payload, $("#current-stock-chart").width());
              });
            } else {
              var plotIndicator = function(indicatorData, type, width) {
                // var payload = indicatorData.payload;
                var stock_name = $rootScope.stockQuery.symbol;
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
                var line1,line2,line3;
                if(indicatorData.values.data.length && indicatorData.values2.data.length && indicatorData.values3.data.length) {
                    line1 = {
                        name: stock_name + ' ' + indicatorData.values.key,
                        data: indicatorData.values.data.slice(),
                        color: color1,
                        type: 'spline',
                        tooltip: {
                            pointFormat: "<b>" + stock_name + "</b>: {point.y:.2f}",
                            headerFormat: '{point.key}<br/>'
                        },
                        pointStart: indicatorData.startDate,
                        pointInterval: 24 * 3600 * 1000
                    };
                    line2 = {
                        name: stock_name + ' ' + indicatorData.values2.key,
                        data: indicatorData.values2.data.slice(),
                        color: color2,
                        type: 'spline',
                        tooltip: {
                            pointFormat: "<b>" + stock_name + "</b>: {point.y:.2f}",
                            headerFormat: '{point.key}<br/>'
                        },
                        pointStart: indicatorData.startDate,
                        pointInterval: 24 * 3600 * 1000
                    };
                    line3 = {
                        name: stock_name + ' ' + indicatorData.values3.key,
                        data: indicatorData.values3.data.slice(),
                        color: color3,
                        type: 'spline',
                        tooltip: {
                            pointFormat: "<b>" + stock_name + "</b>: {point.y:.2f}",
                            headerFormat: '{point.key}<br/>'
                        },
                        pointStart: indicatorData.startDate,
                        pointInterval: 24 * 3600 * 1000
                    };
                    series.push(line1);
                    series.push(line2);
                    series.push(line3);

                } else if(indicatorData.values.data.length && indicatorData.values2.data.length) {
                    line1 = {
                        name: stock_name + ' ' + indicatorData.values.key,
                        data: indicatorData.values.data.slice(),
                        color: color1,
                        type: 'spline',
                        tooltip: {
                            pointFormat: "<b>" + stock_name + "</b>: {point.y:.2f}",
                            headerFormat: '{point.key}<br/>'
                        },
                        pointStart: indicatorData.startDate,
                        pointInterval: 24 * 3600 * 1000
                    };
                    line2 = {
                        name: stock_name + ' ' + indicatorData.values2.key,
                        data: indicatorData.values2.data.slice(),
                        color: color2,
                        type: 'spline',
                        tooltip: {
                            pointFormat: "<b>" + stock_name + "</b>: {point.y:.2f}",
                            headerFormat: '{point.key}<br/>'
                        },
                        pointStart: indicatorData.startDate,
                        pointInterval: 24 * 3600 * 1000
                    };
                    series.push(line1);
                    series.push(line2);
                } else {
                    var name = indicatorData.values.key;
                    line1 = {
                        name: stock_name + ' ' + name,
                        data: indicatorData.values.data.slice(),
                        color: color1,
                        type: 'spline',
                        tooltip: {
                            pointFormat: "<b>" + stock_name + "</b>: {point.y:.2f}",
                            headerFormat: '{point.key}<br/>'
                        },
                        pointStart: indicatorData.startDate,
                        pointInterval: 24 * 3600 * 1000
                    };
                    series.push(line1);
                }
                // var dates = indicatorData.dates;
                // for(var k in dates) {
                //   dates[k] = new Date(dates[k]);
                // }
                if(true) {
                  if(Highcharts.charts.length) {
                    Highcharts.charts.pop();
                  }
                  Highcharts.charts[0] = new Highcharts.chart('current-stock-chart', {
                    global: {
                      useUTC: true
                    },
                    chart: {
                        zoomType: 'x',
                        width: width,
                        height: 350
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
                        ordinal: true,
                        tickPositioner: function() {
                          var minDate = moment(this.min),
                              maxDate = moment(this.max-24*3600*1000);

                          var tickInterval = 7;
                          if(maxDate.diff(minDate, 'days') <= 120) tickInterval = 4;
                          if(maxDate.diff(minDate, 'days') <= 60) tickInterval = 2;
                          if(maxDate.diff(minDate, 'days') <= 30) tickInterval = 1;

                          var cur_date = maxDate;
                          var positions = [];
                          for(var i=indicatorData.values.data.length-1;i>=0;i=i-tickInterval) {
                            cur_date = moment(indicatorData.values.data[i][0]);
                            // if(cur_date <= maxDate && cur_date >= minDate && positions[positions.length-1].diff(cur_date, 'days')>=tickInterval) {
                            //   positions.push(cur_date);
                            // }
                            if(cur_date<=maxDate && cur_date>=minDate)
                              positions.push(cur_date);
                          }
                          positions.info = this.tickPositions.info;
                          return positions;
                        }
                    },
                    id: type,
                    plotOptions: {
                      series: {
                        animation: false
                      }
                    },
                    series: series
                  });
                } else {
                  // For dynamically adding and removing data but interferes with the Facebook sharing functionality
                }
              };

              angular.element($("#current-stock-chart")).ready(function() {
                plotIndicator(stockData, type, $("#current-stock-chart").width());
              });
            }
          },
          plotHistoricData: function(stockData) {
            if(!stockData.error) {
              var payload = stockData.fullData;
              var startDate = moment(payload.startDate).utc();
              var button;
              if($window.innerWidth <= 450) {
                button = [{
                  type: 'month',
                  count: 1,
                  text: '1m'
                }, {
                  type: 'month',
                  count: 3,
                  text: '3m'
                }, {
                  type: 'month',
                  count: 6,
                  text: '6m'
                }, {
                  type: 'year',
                  count: 1,
                  text: '1y'
                }, {
                  type: 'all',
                  text: 'All'
                }];
              } else {
                button = [{
                  type: 'week',
                  count: 1,
                  text: '1w'
                }, {
                  type: 'month',
                  count: 1,
                  text: '1m'
                }, {
                  type: 'month',
                  count: 3,
                  text: '3m'
                }, {
                  type: 'month',
                  count: 6,
                  text: '6m'
                }, {
                  type: 'year',
                  count: 1,
                  text: '1y'
                }, {
                  type: 'ytd',
                  text: 'YTD'
                }, {
                  type: 'all',
                  text: 'All'
                }];
              }
              var stockChart = new Highcharts.stockChart('historic-chart', {
                chart: {
                    type: 'area',
                },
                rangeSelector: {
                  selected: 0,
                  buttons: button
                },
                title: {
                    text: stockData.symbol.toUpperCase() + " Stock Value"
                },
                subtitle: {
                    text: "<a target='_blank' href='https://www.alphavantage.co/' style='text-decoration:none;'>Source: Alpha Vantage</a>",
                    useHTML: true
                },
                yAxis: [{
                    title: {
                        text: 'Stock Price'
                    }
                }],
                xAxis: {
                    type: 'datetime',
                    endOnTick: true,
                    units: [[
                      'day',
                      [1]
                    ], [
                      'week',
                      [1]
                    ], [
                      'month',
                      [1, 3, 6]
                    ], [
                      'year',
                      null
                    ]],
                    minTickInterval: 24 * 3600 * 1000,
                    minRange: 7 * 24 * 3600 * 1000
                },
                plotOptions: {
                    area: {
                        fillColor: '#e6e6ff',
                        opacity: 0.5,
                        pointWidth: 0.2,
                        borderWidth: 0.2,
                        area: 1400
                    }
                },
                tooltip: {
                  headerFormat: '{point.key}<br/>',
                  pointFormat: '<span style="color:{point.color}">\u25CF</span> ' + stockData.symbol + ": <b>{point.y:.2f}</b>",
                  split: false,
                  useHTML: true
                },
                series: [{
                    name: 'Price',
                    data: payload.priceData,
                    pointStart: startDate.valueOf(),
                    pointInterval: 24 * 3600 * 1000,
                    color: '#00F',
                    type: 'area'
                }],
                global: {
                  useUTC: true
                }
              });
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

  function AutoComplete ($http, $q, $sce, $scope, $rootScope, $state, $timeout, $transitions, $mdToast, currentStockData, plotChart) {
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
    self.back = null;
    self.newsFeed = false;
    $rootScope.newParentRequestMade = false;

    angular.element($('ui-view')).ready(function() {
      self.back = true;
    });

    $scope.$watch(function(){
      return $rootScope.newParentRequestMade;
    }, function() {
      if($rootScope.newParentRequestMade && $rootScope.stockQuery) {
        self.searchText = $rootScope.stockQuery.symbol + ' - ' + $rootScope.stockQuery.name + ' (' + $rootScope.stockQuery.exchange + ')';
      }
    });

    function querySearch (query) {
      if(query.trim().length!=0) {
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
      } else {
        return false;
      }
    }

    function searchTextChange(text) {
      var letterNumber = /^[0-9a-zA-Z ()-.]+$/;
      if(!text.replace(/\s/g, '').length) {
        self.error = true;
      } else if(letterNumber.test(text)) {
        self.error = false;
      } else {
        self.error = true;
      }
    }

    function selectedItemChange(item) {
    }

    function clear() {
      self.selectedItem = null;
      self.searchText = "";
      self.error = false;
      $state.go('favorite');
    }

    function getStockQuote() {
      // console.log("Getting stock data");
      $rootScope.stockQuery = {};
      $rootScope.stockQuery.symbol = self.selectedItem.Symbol;
      $rootScope.stockQuery.name = self.selectedItem.Name;
      $rootScope.stockQuery.exchange = self.selectedItem.Exchange;

      $state.go('stock.current', {
        validRoute: true
      });
      /*
      self.stockData = currentStockData.getStockData();
      if(!self.stockData || self.stockData.symbol != self.selectedItem.Symbol) {
        // console.log('making new request');
        $rootScope.newParentRequestMade = true;
        if($rootScope.stockQuery) {
          $rootScope.stockQuery.symbol = self.selectedItem.Symbol;
          $rootScope.stockQuery.name = self.selectedItem.Name;
          $rootScope.stockQuery.exchange = self.selectedItem.Exchange;
        }

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
              self.stockData.error = false;
              self.stockData.symbol = self.selectedItem.Symbol;
              self.stockData.name = self.selectedItem.Name;
              self.stockData.exchange = self.selectedItem.Exchange;
              currentStockData.setStockData(self.stockData);

              $scope.broadcast = function() {
                $rootScope.$broadcast('getStockData', self.stockData);
              };
              $scope.$evalAsync( function() {
                $scope.broadcast();
              });
              $rootScope.newParentRequestMade = false;
            }
          })
          .catch(function(error) {
            self.stockData = {};
            self.stockData.error = true;
            self.stockData.symbol = self.selectedItem.Symbol;
            self.stockData.name = self.selectedItem.Name;
            self.stockData.exchange = self.selectedItem.Exchange;
            currentStockData.setStockData(self.stockData);

            $scope.broadcast = function() {
              $rootScope.$broadcast('getStockData', self.stockData);
            };
            $scope.$evalAsync( function() {
              $scope.broadcast();
            });

            $rootScope.newParentRequestMade = false;
            self.newRequestMade = false;
            // $mdToast.show($mdToast.simple().textContent('Error retrieving data from API'));
            // alert('error from AV');
            // console.log('error receiving data from node');
            // console.log(error);
          });
      } else {
        // console.log("stock data already on display");
      }
      */
    }

    function plotHighChart(type) {
    //   $scope.$watch(function() {
    //     return self.stockData;
    //   }, function() {
    //     if(!$rootScope.newParentRequestMade && !self.stockData.error)  plotChart.plot(self.stockData, type);
    //   });
    }

    $transitions.onSuccess({}, function($transition) {
      if($transition.from().name=='favorite' && $transition.to().name=='stock.current') {
        self.back = false;
      } else if($transition.to().name=='favorite' && $transition.from().name) {
        self.back = true;
      }
      if($transition.to().name=='stock.news') {
        self.newsFeed = true;
      } else {
        self.newsFeed = false;
      }
    });
  }

})(this);
