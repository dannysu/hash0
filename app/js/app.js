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
    $routeProvider
        .when('/dispatcher', {
            templateUrl: 'partials/dispatcher.html',
            controllerAs: 'dispatch',
            controller: 'DispatcherController'
        });

    $routeProvider
        .when('/setup', {
            templateUrl: 'partials/setup.html',
            controllerAs: 'setup',
            controller: 'SetupController'
        });

    $routeProvider
        .when('/unlock', {
            templateUrl: 'partials/unlock.html',
            controllerAs: 'unlock',
            controller: 'UnlockController'
        });

    $routeProvider
        .when('/mapping', {
            templateUrl: 'partials/mapping.html',
            controllerAs: 'mapping',
            controller: 'MappingController'
        });

    $routeProvider
        .when('/all', {
            templateUrl: 'partials/all.html',
            controllerAs: 'all',
            controller: 'AllPasswordsController'
        });

    $routeProvider
        .when('/generation', {
            templateUrl: 'partials/generation.html',
            controllerAs: 'generation',
            controller: 'GenerationController'
        });

    $routeProvider
        .when('/test', {
            templateUrl: 'partials/test.html',
            controllerAs: 'test',
            controller: 'TestController'
        });

    $routeProvider.otherwise({redirectTo: '/dispatcher'});
}]);
