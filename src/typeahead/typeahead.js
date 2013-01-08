angular.module('ui.bootstrap.typeahead', [])

  .directive('typeaheadSource', ['$compile', '$filter', '$q', function ($compile, $filter, $q) {

  var hotKeys = [9, 13, 27, 38, 40];

  var defaultFilterFn = function(sourceItems, query) {
    return $filter('filter')(sourceItems, query);
  };

  var defaultUpdaterFn = function(sourceItem) {
    return sourceItem;
  };

  var customFilterFnFactory = function (filterItemFn) {
    return function (sourceItems, query) {
      var result = [];
      angular.forEach(sourceItems, function (sourceItem) {
        if (filterItemFn(sourceItem, query)) {
          result.push(sourceItem);
        }
      });
      return result;
    };
  };

  var checkAndConvertSource = function(sourceCandidate) {
    var source = sourceCandidate;
    if (angular.isArray(sourceCandidate)) {
      source = function(inputValue) {
        return sourceCandidate;
      };
    }
    if(!angular.isFunction(source)) {
      throw "Source for typeahead must be either an array or a function";
    }
    return source;
  };

  return {
    require:'ngModel',
    link:function (originalScope, element, attrs, modelCtrl) {

      //create a child scope for the typeahead directive so we are not polluting original scope
      //with typeahead-specific data (matches, query etc.)
      var scope = originalScope.$new();
      originalScope.$on('$destroy', function(){
        scope.$destroy();
      });

      //source of data - can be either an array or a function
      var source = checkAndConvertSource(scope.$eval(attrs.typeaheadSource));

      //max no of items dispalyed in typeahead dropdown
      var maxItems = scope.$eval(attrs.typeaheadItems) || 4;

      //minimal no of characters that needs to be entered before typeahead kicks-in
      var minSearch = scope.$eval(attrs.typeaheadMinLength) || 1;

      //expression to be used for matches rendering - expression must be one supported by the orderBy filter
      var orderExp = scope.$eval(attrs.typeaheadOrder);

      //filtering logic
      var filterItemFn = scope.$eval(attrs.typeaheadMatcher);
      var filterFn = angular.isFunction(filterItemFn) ? customFilterFnFactory(filterItemFn): defaultFilterFn;

      //custom model updating logic
      var updaterFn = scope.$eval(attrs.typeaheadUpdater) || defaultUpdaterFn;

      var resetMatches = function() {
        scope.matches = [];
        scope.activeIdx = -1;
      };

      // was an item selected by a user?
      var selected = false;

      var getMatchesAsync = function(inputValue) {

        $q.when(source(inputValue)).then(function(matches) {
          //it might happen that several async queries were in progress if a user were typing fast
          //but we are interested only in responses that correspond to the current view value
          if (inputValue === modelCtrl.$viewValue){
            var filteredMatches = $filter('limitTo')(filterFn(matches, inputValue), maxItems) || [];
            if (filteredMatches.length > 0) {
              scope.matches = filteredMatches;
              if (orderExp) {
                scope.matches = $filter('orderBy')(scope.matches, orderExp);
              }
              scope.activeIdx = 0;
            } else {
              resetMatches();
            }
          }
        }, resetMatches);
      };

      resetMatches();

      scope.highlighter = scope.$eval(attrs.typeaheadHighlighter);
      //we need to propagate user's query so we can higlight matches
      scope.query = undefined;

      //plug into $parsers pipeline to open a typeahead on view changes initiated from DOM
      modelCtrl.$parsers.push(function (inputValue) {

        scope.activeIdx = -1;
        if (inputValue && inputValue.length >= minSearch) {

          if (!selected) {
            scope.query = inputValue;
            getMatchesAsync(inputValue);
          } else {
            scope.matches = [];
            selected = false;
          }

        } else {
          scope.matches = [];
        }

        return inputValue;
      });

      scope.select = function (activeIdx) {
        //called from within the $digest() cycle
        selected = true;
        modelCtrl.$setViewValue(updaterFn(scope.matches[activeIdx]));
        modelCtrl.$render();
      };

      //bind keyboard events: arrows up(38) / down(40), enter(13) and tab(9), esc(9)
      element.bind('keydown', function (evt) {

        //typeahead is open and an "interesting" key was pressed
        if (scope.matches.length === 0 || hotKeys.indexOf(evt.which) === -1) {
          return;
        }

        evt.preventDefault();

        if (evt.which === 40) {
          scope.activeIdx = (scope.activeIdx + 1) % scope.matches.length;
          scope.$digest();

        } else if (evt.which === 38) {
          scope.activeIdx = (scope.activeIdx ? scope.activeIdx : scope.matches.length) - 1;
          scope.$digest();

        } else if (evt.which === 13 || evt.which === 9) {
          scope.$apply(function () {
            scope.select(scope.activeIdx);
          });

        } else if (evt.which === 27) {
          scope.matches = [];
          scope.$digest();
        }
      });

      var tplElCompiled = $compile("<typeahead-popup matches='matches' active='activeIdx' select='select(activeIdx)' "+
      "highlighter='highlighter' query='query'></typeahead-popup>")(scope);
      element.after(tplElCompiled);
    }
  };
}])

  .directive('typeaheadPopup', function () {

    var defaultHighlighter = function(matchItem, query) {
      return (query) ? matchItem.replace(new RegExp(query, 'gi'), '<strong>$&</strong>') : query;
    };

    return {
      restrict:'E',
      scope:{
        matches:'=',
        query:'=',
        active:'=',
        select:'&'
      },
      replace:true,
      templateUrl:'template/typeahead/typeahead.html',
      link:function (scope, element, attrs) {

        scope.isOpen = function () {
          return scope.matches.length > 0;
        };

        scope.isActive = function (matchIdx) {
          return scope.active == matchIdx;
        };

        scope.selectActive = function (matchIdx) {
          scope.active = matchIdx;
        };

        scope.selectMatch = function (activeIdx) {
          scope.select({activeIdx:activeIdx});
        };

        scope.highlighter = scope.$parent.$eval(attrs.highlighter) || defaultHighlighter;
      }
    };
  });
