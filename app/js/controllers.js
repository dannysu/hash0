'use strict';

/* Controllers */

angular.module('hash0.controllers', [])
.controller('DispatcherCtrl', ['$timeout', '$window', '$location', 'metadata', 'crypto', function($timeout, $window, $location, metadata, crypto) {

    var redirect = function() {
        if (metadata.hasStorageUrl()) {
            $location.path('/unlock');
        }
        else {
            $location.path('/setup');
        }
    };

    if ($window.addon) {
        $window.addon.port.on('dispatch', function() {
            $timeout(function() {
                redirect();
            }, 10, true);
        });
        $window.addon.port.on('wipe', function() {
            crypto.setMasterPassword(null);
        });
    }

    redirect();
}])
.controller('SetupCtrl', ['$scope', '$window', '$location', '$timeout', 'metadata', 'sync', 'crypto', function($scope, $window, $location, $timeout, metadata, sync, crypto) {
    $scope.masterPassword = '';
    $scope.storageUrl = '';
    $scope.firstTime = true;
    if (metadata.hasStorageUrl()) {
        $scope.firstTime = false;
    }

    $scope.cancel = function() {
        $location.path('/generation');
    };

    $scope.save = function() {
        $scope.loading = true;
        $scope.error = false;

        $timeout(function() {
            $scope.saveInternal();
        }, 500, true);
    };

    $scope.saveInternal = function() {
        var upload = false;

        // If there are existing settings, then user might be trying to migrate to a different URL.
        // In that case, prompt and ask.
        if (metadata.hasStorageUrl()) {

            // If there is, then ask whether to migrate data
            if (confirm('Migrate existing data to new location?')) {
                // Migrating data is just uploading what's currently there to
                // another location and with potentially new encryption password
                upload = true;
            }
        }

        crypto.setMasterPassword($scope.masterPassword);
        metadata.setStorageUrl($scope.storageUrl);

        if (upload) {
            var shouldContinueWithSalt = function(salt) {
                if (salt.type != crypto.generatorTypes.csprng) {
                    $window.alert("Couldn't get a secure random number generator");
                    return false;
                }
                return true;
            };

            sync.upload(true, shouldContinueWithSalt, function(err) {
                if (err) {
                    $scope.loading = false;
                    $scope.error = true;
                    $scope.errorMessage = "Failed to migrate metadata.";
                }
                else {
                    $scope.loading = false;
                    $scope.error = false;
                    $location.path('/generation');
                }
            });
        }
        else {
            sync.download(function(err) {
                if (err) {
                    $scope.loading = false;
                    $scope.error = true;
                    $scope.errorMessage = err;
                }
                else {
                    $scope.loading = false;
                    $scope.error = false;
                    $location.path('/generation');
                }
            });
        }
    };
}])
.controller('UnlockCtrl', ['$scope', '$location', '$timeout', 'crypto', 'sync', 'metadata', '$window', function($scope, $location, $timeout, crypto, sync, metadata, $window) {
    $scope.masterPassword = '';

    if ($window.addon) {
        $window.addon.port.on('wipe', function() {
            crypto.setMasterPassword(null);
            $scope.masterPassword = '';
        });
    }

    $scope.next = function() {
        crypto.setMasterPassword($scope.masterPassword);

        $scope.loading = true;
        $scope.error = false;

        $timeout(function() {
            $scope.nextInternal();
        }, 500, true);
    };

    $scope.reset = function() {
        metadata.setStorageUrl('');
        $location.path('/setup');
    };

    $scope.nextInternal = function() {
        sync.download(function(err) {
            if (err) {
                $scope.loading = false;
                $scope.error = true;
                $scope.errorMessage = "Failed to download metadata. Perhaps you typed in the wrong password?";
            }
            else {
                $scope.loading = false;
                $scope.error = false;
                $location.path('/generation');
            }
        });
    };
}])
.controller('GenerationCtrl', ['$scope', '$window', '$location', '$timeout', 'metadata', 'crypto', 'sync', function($scope, $window, $location, $timeout, metadata, crypto, sync) {
    $scope.param = '';
    $scope.notes = '';
    $scope.result = '';

    $scope.previousResult = null;
    $scope.loadingPrevious = false;
    $scope.hasPreviousPassword = false;

    $scope.submitLabel = 'generate';

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

    $scope.generateNewPassword = true;
    $scope.newPasswordSelection = 'on';
    $scope.newPasswordOnStyle = {'width': '100%'};
    $scope.newPasswordOffStyle = {'width': '0%'};
    $scope.newPasswordHandleStyle = {'left': '100%'};

    $scope.toggleConfig = function() {
        $scope.configCollapsed = !$scope.configCollapsed;
    };

    $scope.toggleSymbols = function(value) {
        if (arguments.length > 0) {
            $scope.includeSymbols = value;
        }
        else {
            $scope.includeSymbols = !$scope.includeSymbols;
        }

        if ($scope.includeSymbols) {
            $scope.symbolSelection = 'on';
            $scope.symbolHandleStyle = {'left': '100%'};
            $scope.symbolOnStyle = {'width': '100%'};
            $scope.symbolOffStyle = {'width': '0%'};
        }
        else {
            $scope.symbolSelection = 'off';
            $scope.symbolHandleStyle = {'left': '0%'};
            $scope.symbolOnStyle = {'width': '0%'};
            $scope.symbolOffStyle = {'width': '100%'};
        }
    };

    $scope.toggleNewPassword = function(value) {
        if (arguments.length > 0) {
            $scope.generateNewPassword = value;
        }
        else {
            $scope.generateNewPassword = !$scope.generateNewPassword;
        }

        if ($scope.generateNewPassword) {
            $scope.newPasswordSelection = 'on';
            $scope.newPasswordHandleStyle = {'left': '100%'};
            $scope.newPasswordOnStyle = {'width': '100%'};
            $scope.newPasswordOffStyle = {'width': '0%'};
            $scope.submitLabel = 'create';
        }
        else {
            $scope.newPasswordSelection = 'off';
            $scope.newPasswordHandleStyle = {'left': '0%'};
            $scope.newPasswordOnStyle = {'width': '0%'};
            $scope.newPasswordOffStyle = {'width': '100%'};
            $scope.submitLabel = 'generate';
        }
    };

    $scope.setup = function() {
        $location.path('/setup');
    };

    $scope.mapping = function() {
        $location.path('/mapping');
    };

    $scope.generate = function() {
        $scope.loading = true;
        $scope.error = false;

        var param = $scope.param;
        var symbol = $scope.includeSymbols;
        var notes = $scope.notes;
        var length = parseInt($scope.passwordLength);
        var iterations = null;
        var salt = null;
        var number = 0;

        $scope.previousResult = null;
        $scope.loadingPrevious = false;
        $scope.hasPreviousPassword = false;

        // Don't use unique salt per site if there is nowhere to store it
        if (!metadata.hasStorageUrl()) {
            salt = '';
        }
        else {
            var mapping = metadata.findMapping(param);
            if (mapping != null) {
                param = mapping.to;
            }

            var config = metadata.findConfig(param);
            if (config == null || $scope.generateNewPassword) {
                // Generate different salt per site to make master password more secure
                salt = crypto.generateSalt(prompt);
                if (salt.type != crypto.generatorTypes.csprng) {
                    var message = "Couldn't get a secure random number generator";
                    $window.alert(message);
                    $scope.loading = false;
                    $scope.error = true;
                    $scope.errorMessage = message;
                    return;
                }
                salt = salt.salt;

                if (config != null && config.number) {
                    number = config.number + 1;
                }

                if (config && $scope.generateNewPassword) {
                    $scope.hasPreviousPassword = true;
                }
            }
            else {
                // Use cached config values
                if (typeof(config.includeSymbols) != 'undefined') {
                    symbol = config.includeSymbols;
                }
                if (config.passwordLength) {
                    length = config.passwordLength;
                }
                if (config.iterations) {
                    iterations = config.iterations;
                }
                if (config.salt) {
                    salt = config.salt;
                }
                if (config.number) {
                    number = config.number;
                }

                if (config.oldVersions && config.oldVersions.length > 0) {
                    $scope.hasPreviousPassword = true;
                }
            }
        }

        crypto.generatePassword({
            includeSymbols: symbol,
            passwordLength: length,
            iterations: iterations,
            param: param,
            number: number,
            salt: salt
        }, function(password) {

            if (password) {
                $scope.result = password.password;
                $scope.configCollapsed = true;
                $scope.resultCollapsed = false;

                var escapedParam = param.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/"/g, '\\\"');
                var escapedPassword = password.password.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/"/g, '\\\"');
                var code = "                                                  \
                    var url = window.location.href;                           \
                    var domain = url.match(/:\\/\\/(.[^\\/]+)/);              \
                    if (domain !== null) {                                    \
                        domain = domain[1];                                   \
                    }                                                         \
                    if (domain == '"+escapedParam+"') {                       \
                        var inputs = document.getElementsByTagName('input');  \
                        var password = '"+escapedPassword+"';                 \
                        for (var i = 0; i < inputs.length; i++) {             \
                            if (inputs[i].type.toLowerCase() == 'password') { \
                                inputs[i].value = password;                   \
                            }                                                 \
                        }                                                     \
                    }                                                         \
                ";

                if ($window.chrome && $window.chrome.tabs) {
                    // Insert password directly into password field for Google Chrome
                    $window.chrome.tabs.executeScript({
                        code: code
                    });
                }
                else if ($window.addon) {
                    $window.addon.port.emit("password", code);
                }

                // Update in-memory config
                metadata.addConfig({
                    param: param,
                    salt: salt,
                    includeSymbols: password.includeSymbols,
                    passwordLength: password.password.length,
                    notes: notes,
                    iterations: password.iterations,
                    number: number
                });

                var shouldContinueWithSalt = function(salt) {
                    if (salt.type != crypto.generatorTypes.csprng) {
                        var message = "Couldn't get a secure random number generator";
                        $window.alert(message);
                        $scope.loading = false;
                        $scope.error = true;
                        $scope.errorMessage = message;
                        return false;
                    }
                    return true;
                };

                // Encrypt and update server if configs have changed
                sync.upload(false, shouldContinueWithSalt, function(err) {
                    if (err) {
                        $window.alert(err);
                        $scope.loading = false;
                        $scope.error = true;
                        $scope.errorMessage = err;
                    }
                    else {
                        $scope.loading = false;
                        $scope.error = false;
                    }
                });

                $scope.toggleNewPassword(false);
            }
            else {
                var message = 'Failed to generate password';
                $window.alert(message);
                $scope.loading = false;
                $scope.error = true;
                $scope.errorMessage = message;
            }
        });
    };

    $scope.showPrevious = function() {
        $scope.loadingPrevious = true;

        var param = $scope.param;
        var symbol = $scope.includeSymbols;
        var notes = $scope.notes;
        var length = parseInt($scope.passwordLength);
        var iterations = null;
        var salt = null;
        var number = 0;

        var mapping = metadata.findMapping(param);
        if (mapping != null) {
            param = mapping.to;
        }

        var config = metadata.findConfig(param);
        if (!config) {
            $window.alert("Unexpected error. Can't generate previous password if there is no config.");
            return;
        }

        if (!config.oldVersions || config.oldVersions.length == 0) {
            $window.alert("Unexpected error. No older versions stored.");
            return;
        }

        // Load the previous configuration
        config = config.oldVersions[config.oldVersions.length - 1];

        // Use cached config values
        if (typeof(config.includeSymbols) != 'undefined') {
            symbol = config.includeSymbols;
        }
        if (config.passwordLength) {
            length = config.passwordLength;
        }
        if (config.iterations) {
            iterations = config.iterations;
        }
        if (config.salt) {
            salt = config.salt;
        }
        if (config.number) {
            number = config.number;
        }

        crypto.generatePassword({
            includeSymbols: symbol,
            passwordLength: length,
            iterations: iterations,
            param: param,
            number: number,
            salt: salt
        }, function(password) {
            if (password) {
                $scope.previousResult = password.password;
            }
            else {
                $window.alert('Failed to generate password');
            }
            $scope.loadingPrevious = false;
        });
    };

    $scope.$watch('param', function(newVal, oldVal) {
        var key = newVal;
        var mapping = metadata.findMapping(key);
        if (mapping) {
            key = mapping.to;
        }
        var config = metadata.findConfig(key);
        if (config !== null) {
            if (config.notes) {
                $scope.notes = config.notes;
            }
            if (config.passwordLength) {
                $scope.passwordLength = ''+config.passwordLength;
            }
            if (typeof(config.includeSymbols) != 'undefined') {
                $scope.toggleSymbols(config.includeSymbols);
            }
            $scope.submitLabel = 'generate';
            $scope.toggleNewPassword(false);

        } else {
            $scope.notes = '';
            $scope.passwordLength = '30';
            $scope.submitLabel = 'create';
            $scope.toggleNewPassword(true);
        }
    });

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
        var mapping = metadata.findMapping(key);
        if (mapping !== null) {
            key = mapping.to;
            $scope.param = key;
        }
    }

    if ($window.chrome && $window.chrome.tabs) {
        // Google Chrome specific code
        $window.chrome.tabs.getSelected(null, function(tab) {
            $scope.$apply(function() {
                initWithUrl(tab.url);
            });
        });
    }
    else if ($window.addon) {
        $window.addon.port.emit('init');
        $window.addon.port.on('url', function(url) {
            $scope.$apply(function() {
                initWithUrl(url);
            });
        });
    }
}])
.controller('MappingCtrl', ['$scope', '$window', '$location', '$timeout', 'sync', 'metadata', 'crypto', function($scope, $window, $location, $timeout, sync, metadata, crypto) {
    $scope.from = '';
    $scope.to = '';

    $scope.cancel = function() {
        $location.path('/generation');
    };

    $scope.save = function() {
        $scope.loading = true;
        $scope.error = false;

        $timeout(function() {
            $scope.saveInternal();
        }, 500, true);
    };

    $scope.saveInternal = function() {
        metadata.addMapping($scope.from, $scope.to);

        var shouldContinueWithSalt = function(salt) {
            if (salt.type != crypto.generatorTypes.csprng) {
                var message = "Couldn't get a secure random number generator";
                $window.alert(message);
                $scope.loading = false;
                $scope.error = true;
                $scope.errorMessage = message;
                return false;
            }
            return true;
        };

        sync.upload(true, shouldContinueWithSalt, function(err) {
            if (err) {
                $scope.loading = false;
                $scope.error = true;
                $scope.errorMessage = "Failed to upload metadata.";
            }
            else {
                $scope.loading = false;
                $scope.error = false;
                $location.path('/generation');
            }
        });
    };
}])
.controller('TestCtrl', ['$scope', '$window', 'crypto', function($scope, $window, crypto) {
    $scope.iterations = '4096';
    $scope.loading = false;
    $scope.delta = null;

    $scope.test = function() {
        var iterations = parseInt($scope.iterations);
        $scope.delta = null;
        var start = new Date().getTime();
        $scope.loading = true;
        crypto.setMasterPassword('test');
        var salt = crypto.generateSalt();
        crypto.generatePassword({
            includeSymbols: true,
            passwordLength: 30,
            param: 'hash0.dannysu.com',
            number: '1',
            salt: salt.salt,
            iterations: iterations
        }, function(password) {
            if (password.iterations != iterations) {
                $window.alert('Something is wrong');
            }

            var end = new Date().getTime();
            $scope.loading = false;

            $scope.delta = (end - start);
        });
    };
}]);
