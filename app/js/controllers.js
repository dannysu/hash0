'use strict';

/* Controllers */

angular.module('hash0.controllers', [])
.controller('SetupCtrl', ['$scope', '$window', function($scope, $window) {
    $scope.masterPassword = '';
    $scope.storageUrl = '';

    $scope.save = function() {
        var upload = false;

        // If there are existing settings, then user might be trying to migrate to a different URL.
        // In that case, prompt and ask.
        if (defined(localStorage['settingsURL'])) {

            // If there is, then ask whether to migrate data
            if (confirm('Migrate existing data to new location?')) {
                // Migrating data is just uploading what's currently there to
                // another location and with potentially new encryption password
                upload = true;
            }
        }

        master_password = $('#setup_master').val();
        $('#setup_master').val('');

        var url = $('#setup_url').val();
        localStorage['settingsURL'] = url;

        if (upload) {
            uploadSettings(true, function(err) {
                if (err) {
                    $('#setup_error').html('Failed to migrate settings');
                }
                else {
                    $.mobile.changePage('#generator');
                }
            });
        }
        else {
            downloadSettings(function(err) {
                if (err) {
                    $('#setup_error').html('Failed to download settings');
                }
                else {
                    $.mobile.changePage('#generator');
                }
            });
        }
    };
}])
.controller('UnlockCtrl', [function() {

}])
.controller('GenerationCtrl', ['$scope', '$window', function($scope, $window) {
    $scope.param = '';
    $scope.notes = '';
    $scope.result = '';

    $scope.submitLabel = 'submit';

    $scope.configCollapsed = true;
    $scope.resultCollapsed = true;

    // default password length to 30
    $scope.passwordLength = '30';

    // include symbols in passwords by default
    $scope.includeSymbols = true;
    $scope.symbolSelection = 'on';
    $scope.symbolOnStyle = {'width': '100%'};
    $scope.symbolOffStyle = {'width': '0%'};
    $scope.symbolHandleStyle = {'left': '100%'};

    $scope.generateNewPassword = false;
    $scope.newPasswordSelection = 'off';
    $scope.newPasswordOnStyle = {'width': '0%'};
    $scope.newPasswordOffStyle = {'width': '100%'};
    $scope.newPasswordHandleStyle = {'left': '0%'};

    $scope.toggleConfig = function() {
        $scope.configCollapsed = !$scope.configCollapsed;
    };

    $scope.toggleSymbols = function() {
        $scope.includeSymbols = !$scope.includeSymbols;

        var temp = $scope.symbolOnStyle;
        $scope.symbolOnStyle = $scope.symbolOffStyle;
        $scope.symbolOffStyle = temp;

        if ($scope.includeSymbols) {
            $scope.symbolSelection = 'on';
            $scope.symbolHandleStyle = {'left': '100%'};
        }
        else {
            $scope.symbolSelection = 'off';
            $scope.symbolHandleStyle = {'left': '0%'};
        }
    };

    $scope.toggleNewPassword = function() {
        $scope.generateNewPassword = !$scope.generateNewPassword;

        var temp = $scope.newPasswordOnStyle;
        $scope.newPasswordOnStyle = $scope.newPasswordOffStyle;
        $scope.newPasswordOffStyle = temp;

        if ($scope.generateNewPassword) {
            $scope.newPasswordSelection = 'on';
            $scope.newPasswordHandleStyle = {'left': '100%'};
        }
        else {
            $scope.newPasswordSelection = 'off';
            $scope.newPasswordHandleStyle = {'left': '0%'};
        }
    };

    function initWithUrl(url) {
        var domain = url.match(/:\/\/(.[^\/]+)/);
        if (domain !== null) {
            domain = domain[1];
        }
        else {
            domain = '';
        }
        $scope.param = domain;

        var key = domain;
        var mapping = findMapping(key);
        if (mapping !== null) {
            key = mapping.to;
            $scope.param = key;
        }

        var config = findConfig(key);
        if (config !== null) {
            if (config.notes) {
                $scope.notes = config.notes;
            }
            $scope.submitLabel = 'submit';
        } else {
            $scope.submitLabel = 'create';
        }
    }

    if ($window.chrome && $window.chrome.tabs) {
        // Google Chrome specific code
        $window.chrome.tabs.getSelected(null, function(tab) {
            initWithUrl(tab.url);
        });
    }
    else if ($window.addon) {
        $window.addon.port.emit('init');
        $window.addon.port.on('url', function(url) {
            initWithUrl(url);
        });
    }
}])
.controller('MappingCtrl', [function() {

}]);
