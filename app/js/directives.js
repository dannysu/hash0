'use strict';

/* Directives */


angular.module('hash0.directives', [])
.directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
        elm.text(version);
    };
}])
.directive('metroTextField', [function() {
    return function(scope, elm, attrs) {
        elm.on('focus', function(event) {
            elm.addClass('ui-focus');
        });

        elm.on('blur', function(event) {
            elm.removeClass('ui-focus');
        });
    };
}])
.directive('disableLink', [function() {
    return function(scope, elm, attrs) {
        elm.on('click', function(event) {
            event.preventDefault();
        });
    };
}]);
