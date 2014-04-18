'use strict';


// Declare app level module which depends on filters, and services
angular.module('hash0', [
    'ngRoute',
    'hash0.filters',
    'hash0.services',
    'hash0.directives',
    'hash0.controllers'
]).
config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/setup', {templateUrl: 'partials/setup.html', controller: 'SetupCtrl'});
    $routeProvider.when('/unlock', {templateUrl: 'partials/unlock.html', controller: 'UnlockCtrl'});
    $routeProvider.when('/mapping', {templateUrl: 'partials/mapping.html', controller: 'MappingCtrl'});
    $routeProvider.when('/generation', {templateUrl: 'partials/generation.html', controller: 'GenerationCtrl'});
    $routeProvider.otherwise({redirectTo: '/setup'});
}]);
