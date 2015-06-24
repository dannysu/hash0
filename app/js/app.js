/*global angular*/
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
    $routeProvider.when('/dispatcher', {templateUrl: 'partials/dispatcher.html', controller: 'DispatcherController'});
    $routeProvider.when('/setup', {templateUrl: 'partials/setup.html', controller: 'SetupController'});
    $routeProvider.when('/unlock', {templateUrl: 'partials/unlock.html', controller: 'UnlockController'});
    $routeProvider.when('/mapping', {templateUrl: 'partials/mapping.html', controller: 'MappingController'});
    $routeProvider.when('/all', {templateUrl: 'partials/all.html', controller: 'AllPasswordsController'});
    $routeProvider.when('/generation', {templateUrl: 'partials/generation.html', controller: 'GenerationController'});
    $routeProvider.when('/test', {templateUrl: 'partials/test.html', controller: 'TestController'});
    $routeProvider.otherwise({redirectTo: '/dispatcher'});
}]);
