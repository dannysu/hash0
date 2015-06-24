/*global angular*/
'use strict';

/* Directives */

angular.module('hash0.directives', [])
.directive('appVersion', ['version', function(version) {
    return function(scope, elm) {
        elm.text(version);
    };
}])
.directive('metroTextField', [function() {
    return function(scope, elm) {
        elm.on('focus', function() {
            angular.element(this).addClass('ui-focus');
        });

        elm.on('blur', function() {
            angular.element(this).removeClass('ui-focus');
        });
    };
}])
.directive('disableLink', [function() {
    return function(scope, elm) {
        elm.on('click', function(event) {
            event.preventDefault();
        });
    };
}]);
