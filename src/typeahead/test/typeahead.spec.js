ddescribe('typeahead', function () {

  var $scope, $compile, $sniffer;
  var changeInputValueTo;

  beforeEach(module('ui.bootstrap.typeahead'));
  beforeEach(module('template/typeahead/typeahead.html'));
  beforeEach(inject(function(_$rootScope_, _$compile_, $sniffer) {
    $scope = _$rootScope_;
    $scope.source = ['foo', 'bar', 'baz'];
    $compile = _$compile_;

    changeInputValueTo = function(element, value) {
      var inputEl = findInput(element);
      inputEl.val(value);
      inputEl.trigger( $sniffer.hasEvent('input') ? 'input' : 'change');
      $scope.$digest();
    };
  }));

  //utility functions
  var prepareInputEl = function(inputTpl) {
    var el = $compile(angular.element(inputTpl))($scope);
    $scope.$digest();
    return el;
  };

  var findInput = function(element) {
    return element.find('input');
  };

  var findDropDown = function(element) {
    return element.find('div.dropdown');
  };

  var findMatches = function(element) {
    return findDropDown(element).find('li');
  };

  var triggerKeyDown = function(element, keyCode) {
    var inputEl = findInput(element);
    var e = $.Event("keydown");
    e.which = keyCode;
    inputEl.trigger(e);
  };

  //custom matchers
  beforeEach(function () {
    this.addMatchers({
      toBeClosed: function() {
        var typeaheadEl = findDropDown(this.actual);
        this.message = function() {
          return "Expected '" + angular.mock.dump(this.actual) + "' to be closed.";
        };
        return !typeaheadEl.hasClass('open') && findMatches(this.actual).length === 0;

      }, toBeOpenWithActive: function(noOfMatches, activeIdx) {

        var typeaheadEl = findDropDown(this.actual);
        var liEls = findMatches(this.actual);

        this.message = function() {
          return "Expected '" + angular.mock.dump(this.actual) + "' to be opened.";
        };
        return typeaheadEl.hasClass('open') && liEls.length === noOfMatches && $(liEls[activeIdx]).hasClass('active');
      }
    });
  });

  //coarse grained, "integration" tests

  describe('initial state and model changes', function () {

    it('should be closed by default', function () {

      var element = prepareInputEl("<div><input ng-model='result' typeahead-source='source'></div>");
      expect(element).toBeClosed();
    });

    it('should not get open on model change', function () {

      var element = prepareInputEl("<div><input ng-model='result' typeahead-source='source'></div>");
      $scope.$apply(function(){
        $scope.result = 'foo';
      });
      expect(element).toBeClosed();
    });
  });

  describe('basic functionality', function () {

    it('should open and close typeahead based on matches', function () {

      var element = prepareInputEl("<div><input ng-model='result' typeahead-source='source'></div>");
      changeInputValueTo(element, 'ba');
      expect(element).toBeOpenWithActive(2, 0);
    });

    it('should not open typeahead if input value smaller than a defined threshold', function () {

      var element = prepareInputEl("<div><input ng-model='result' typeahead-source='source' typeahead-min-length='2'></div>");
      changeInputValueTo(element, 'b');
      expect(element).toBeClosed();
    });

    it('should support the typeahead-max-items attribute', function () {

      var element = prepareInputEl("<div><input ng-model='result' typeahead-source='source' typeahead-items='1'></div>");
      changeInputValueTo(element, 'b');
      expect(element).toBeOpenWithActive(1, 0);
    });

    it('should support the typeahead-order attribute', function () {

      $scope.orderFn = function(match) {
        return match === 'baz' ? 0 : 1;
      };
      var element = prepareInputEl("<div><input ng-model='result' typeahead-source='source' typeahead-order='orderFn'></div>");
      changeInputValueTo(element, 'b');
      triggerKeyDown(element, 13);
      expect($scope.result).toEqual('baz');
    });

    it('should support custom filtering functions', function () {
      $scope.matcherFn = function(sourceItem, queryStr) {
        return sourceItem == 'foo';
      };

      var element = prepareInputEl("<div><input ng-model='result' typeahead-source='source' typeahead-matcher='matcherFn'></div>");
      changeInputValueTo(element, 'b');
      triggerKeyDown(element, 13);
      expect($scope.result).toEqual('foo');
    });

    it('should support custom model selecting function', function () {
      $scope.updaterFn = function(selectedItem) {
        return 'prefix' + selectedItem;
      };

      var element = prepareInputEl("<div><input ng-model='result' typeahead-source='source' typeahead-updater='updaterFn'></div>");
      changeInputValueTo(element, 'f');
      triggerKeyDown(element, 13);
      expect($scope.result).toEqual('prefixfoo');
    });

    it('should highlight matches by default', function () {
      var element = prepareInputEl("<div><input ng-model='result' typeahead-source='source'></div>");
      changeInputValueTo(element, 'fo');

      var matchHighlight = findMatches(element).find('a').html();
      expect(matchHighlight).toEqual('<strong>fo</strong>o');
    });

    it('should support custom model rendering function', function () {
      $scope.highlighterFn = function(sourceItem) {
        return 'prefix' + sourceItem;
      };

      var element = prepareInputEl("<div><input ng-model='result' typeahead-source='source' typeahead-highlighter='highlighterFn'></div>");
      changeInputValueTo(element, 'fo');
      var matchHighlight = findMatches(element).find('a').html();
      expect(matchHighlight).toEqual('prefixfoo');
    });
  });

  describe('selecting a match', function () {

    it('should select a match on enter', function () {

      var element = prepareInputEl("<div><input ng-model='result' typeahead-source='source'></div>");
      var inputEl = findInput(element);

      changeInputValueTo(element, 'b');
      triggerKeyDown(element, 13);

      expect($scope.result).toEqual('bar');
      expect(inputEl.val()).toEqual('bar');
    });

    it('should select a match on tab', function () {

      var element = prepareInputEl("<div><input ng-model='result' typeahead-source='source'></div>");
      var inputEl = findInput(element);

      changeInputValueTo(element, 'b');
      triggerKeyDown(element, 9);

      expect($scope.result).toEqual('bar');
      expect(inputEl.val()).toEqual('bar');
    });

    it('should select match on click', function () {

      var element = prepareInputEl("<div><input ng-model='result' typeahead-source='source'></div>");
      var inputEl = findInput(element);

      changeInputValueTo(element, 'b');
      var match = $(findMatches(element)[1]).find('a')[0];

      $(match).click();
      $scope.$digest();

      expect($scope.result).toEqual('baz');
      expect(inputEl.val()).toEqual('baz');
    });
  });

});