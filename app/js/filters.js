/*global angular*/
'use strict';

/* Filters */

angular.module('hash0.filters', []).
filter('interpolate', ['version', function(version) {
    return function(text) {
        return String(text).replace(/\%VERSION\%/mg, version);
    };
}]);
