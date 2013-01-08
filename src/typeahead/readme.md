Supported configuration options:

* `typeaheadSource` - source of data - can be either an array or a function. If it is a function it will be called with one argument - input provided by a user
* `typeaheadItems` - maximum number of matches displayed - defaults to `4`
* `typeaheadMinLength` - minimal number of characters to be provided before matches are displayed. Defaults to `1`
* `typeaheadOrder` - custom ordering function. If not provided matches won't be sorted
* `typeaheadMatcher` - custom matching function. Of provided it will be called with 2 arguments: source of matches and value entered by a user
* `typeaheadUpdater` - a transformation function that can be used to pre-process selected item before it is provided as a selected value
* `typeaheadHighlighter` - a custom function to control matches rendering and higlighting

All of the above options are very similar to the original ones.