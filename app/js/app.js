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
    $routeProvider.when('/dispatcher', {templateUrl: 'partials/dispatcher.html', controller: 'DispatcherCtrl'});
    $routeProvider.when('/setup', {templateUrl: 'partials/setup.html', controller: 'SetupCtrl'});
    $routeProvider.when('/unlock', {templateUrl: 'partials/unlock.html', controller: 'UnlockCtrl'});
    $routeProvider.when('/mapping', {templateUrl: 'partials/mapping.html', controller: 'MappingCtrl'});
    $routeProvider.when('/all', {templateUrl: 'partials/all.html', controller: 'AllPasswordsCtrl'});
    $routeProvider.when('/generation', {templateUrl: 'partials/generation.html', controller: 'GenerationCtrl'});
    $routeProvider.when('/test', {templateUrl: 'partials/test.html', controller: 'TestCtrl'});
    $routeProvider.otherwise({redirectTo: '/dispatcher'});
}]);
