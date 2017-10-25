(function () {
  'use strict';
  angular
      .module('hw8',['ngMaterial', 'ngAnimate', 'ui.router', 'ngCookies'])
      .controller('LandingPage', AutoComplete)
      .config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
        $stateProvider
          .state('favorite', {
            url: '/',
            templateUrl: '../views/favorite-list.html',
            controller: 'favoriteController'
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
      .controller('favoriteController', function($scope, $state) {
        $('#result-area-header-favorite').css("display", "flex");
        $('#result-area-header-stock').hide();

        // TODO:  Replace favorites with localStorage
        var favorites = JSON.parse(localStorage.getItem("favoriteStock"));
        console.log(favorites);
        $scope.orderKey = '';
        $scope.favorites = favorites;
        $scope.stockKeys = {
            keys: [{
                value: null,
                text: "Default"
              }, {
                value: "symbol",
                text: "Symbol"
              }, {
                value: "price",
                text: "Stock Price"
              }, {
                value: "change",
                text: "Change (Change Percent)"
              }, {
                value: "volume",
                text: "Volume"
              }
            ],
            selectedKey: {
              value: null,
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

        $scope.defaultSelected = function() {
          if($scope.stockKeys.selectedKey.value == null) {
            $scope.stockKeys.selectedOrder = {
              value: "Ascending",
              reverse: false
            };
          }
        };

        $scope.deleteFavorite = function(item) {
          for(var i in $scope.favorites) {
            if($scope.favorites[i].symbol == item.symbol) {
              $scope.favorites.splice(i, 1);
              localStorage.setItem("favoriteStock", JSON.stringify($scope.favorites));
              return;
            }
          }
        };
      })
      .controller('stockDetailsController', function($scope, $state, $stateParams, $cookies) {
        if(!$stateParams.validRoute) $state.go('favorite');

        $('#result-area-header-favorite').hide();
        $('#result-area-header-stock').css("display", "flex");

        $scope.symbolExistsInLocalStorage = false;

        if($cookies.getObject('stock_data')) {
          $scope.stockData = $cookies.getObject('stock_data');
          $cookies.remove('stock_data');
        } else {
          $scope.stockData = null;
        }

        $scope.$on('clearStockData', function(event, args) {
          $scope.stockData = args;
          $cookies.remove('stock_data');
        });

        var expiryDate = new Date();
        expiryDate.setMinutes(expiryDate.getMinutes() + 30);
        $scope.$on('getStockData', function(event, args) {
          $scope.stockData = args;
          var favorites = JSON.parse(localStorage.getItem("favoriteStock"));
          console.log(favorites);
          for(var i in favorites) {
            if(favorites[i].symbol == args.symbol) {
              $scope.symbolExistsInLocalStorage = true;
              break;
            } else {
              $scope.symbolExistsInLocalStorage = false;
            }
          }
          $cookies.putObject('stock_data', args, {
            expires: expiryDate
          });
        });

        $scope.addFavorite = function() {
          var favorites = JSON.parse(localStorage.getItem("favoriteStock"));
          if(!favorites) {
            favorites = [];
          }
          for(var i in favorites) {
            if(favorites[i].symbol == $scope.stockData.symbol) {
              $scope.symbolsInLocalStorage[$scope.stockData.symbol] = true;
              return;
            }
          }
          favorites.push({
            "symbol": $scope.stockData.symbol,
            "price": parseFloat($scope.stockData.last_price),
            "change": parseFloat($scope.stockData.change),
            "change_percent": parseFloat($scope.stockData.change_percent),
            "volume": parseInt($scope.stockData.volume)
          });
          $scope.symbolExistsInLocalStorage = true;
          localStorage.setItem("favoriteStock", JSON.stringify(favorites));
        };
      })
      .service('passStockData', function() {
        var stockData = null;

        return {
          getStockData: function() {
            return stockData;
          },
          setStockData: function(value) {
            stockData = value;
          }
        };
      });

  function AutoComplete ($http, $q, $log, $sce, $scope, $rootScope, $cookies, $state) {
    var self = this;

    self.querySearch = querySearch;
    self.selectedItemChange = selectedItemChange;
    self.searchTextChange   = searchTextChange;
    self.getStockQuote = getStockQuote;
    self.clear = clear;
    self.error = false;
    self.selectedItem = null;
    self.stockDataExists = false;
    self.stockDetailsRoute = goToStockDetails;
    self.stockData = null;

    function querySearch (query) {
      var url = 'http://dev.markitondemand.com/MODApis/Api/v2/Lookup/jsonp?input=' + query;
      var trustedUrl = $sce.trustAsResourceUrl(url);
      var deferred = $q.defer();

      $http.jsonp(trustedUrl, {jsonpCallbackParam: 'callback'})
        .then(function(json) {
          deferred.resolve(json.data);
        })
        .catch(function (data) {
          $log.info(data);
        });
      return deferred.promise;
    }

    function searchTextChange(text) {
      var submitBtn = document.getElementsByName('submit')[0];
      var errorMsg = document.getElementById('stock-error-msg');
      var letterNumber = /^[0-9a-zA-Z]+$/;

      if(text.match(letterNumber)) {
        // submitBtn.classList.remove('btn-disabled');
        // submitBtn.disabled = false;
        errorMsg.style.visibility = 'hidden';
        self.error = false;
      } else {
        // submitBtn.classList.add('btn-disabled');
        // submitBtn.disabled = true;
        errorMsg.style.visibility = 'visible';
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

    function goToStockDetails() {
      if($cookies.getObject('stock_data')) {
        if(self.stockDataExists) {
          $state.go('stock', {
            validRoute: true
          });
        }
      } else {
        self.stockDataExists = false;
      }
    }

    function getStockQuote() {
      console.log("Getting stock data");

      // $("#ajax-spinner").show();
      $scope.clearStockData = function() {
        $rootScope.$broadcast('clearStockData', null);
      };
      $scope.$evalAsync( function() {
        $scope.clearStockData();
      });
      $state.go('stock', {
        validRoute: true
      });

      if($cookies.remove('stock_data') != self.selectedItem.Symbol ||
          stockData.symbol != self.selectedItem.Symbol) {
        $http.get('/stock/' + self.selectedItem.Symbol)
          .then(function(response){
            if(response.status == 200) {
              $("#ajax-spinner").hide();

              var ts = moment.tz(response.data.timestamp, "US/Eastern").format("YYYY-MM-DD HH:mm:ss zz");
              var last_price;
              if(moment(ts).hour()==16) {
                last_price = parseFloat(response.data.close).toFixed(2);
              } else {
                last_price = parseFloat(response.data.prev_close).toFixed(2);
              }
              self.stockData = {
                "symbol": response.data.symbol,
                "last_price": last_price,
                "change": (parseFloat(response.data.close) - parseFloat(response.data.prev_close)).toFixed(2),
                "change_percent": ((parseFloat(response.data.close)/parseFloat(response.data.prev_close) - 1)*100).toFixed(2),
                "timestamp": ts,
                "open": parseFloat(response.data.open).toFixed(2),
                "close": parseFloat(response.data.prev_close).toFixed(2),
                "range": parseFloat(response.data.low).toFixed(2) + " - " + parseFloat(response.data.high).toFixed(2),
                "volume": response.data.volume.toLocaleString()
              };

              self.stockDataExists = true;

              $scope.broadcast = function() {
                $rootScope.$broadcast('getStockData', self.stockData);
              };
              $scope.$evalAsync( function() {
                $scope.broadcast();
              });

              console.log("Data succesfully received");
            } else {
              console.log("Data not succesfully received");
              console.log(response);
              // self.stockData = null;
            }
          })
          .catch(function(error) {
            // self.stockData = null;
            console.log(error);
          });
      } else {
        console.log("stock data already on display");
      }

    }

  }

})(this);
