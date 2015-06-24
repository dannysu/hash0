/*global angular*/
'use strict';

/* Controllers */

angular.module('hash0.controllers', [])
.controller('DispatcherController', ['$timeout', '$window', '$location', 'metadata', 'crypto', function($timeout, $window, $location, metadata, crypto) {

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
.controller('SetupController', ['$window', '$location', '$timeout', 'metadata', 'sync', 'crypto', function($window, $location, $timeout, metadata, sync, crypto) {
    var vm = this;

    vm.masterPassword = '';
    vm.storageUrl = '';
    vm.firstTime = true;
    if (metadata.hasStorageUrl()) {
        vm.firstTime = false;
    }

    vm.cancel = function() {
        $location.path('/generation');
    };

    vm.save = function() {
        vm.loading = true;
        vm.error = false;

        $timeout(function() {
            vm.saveInternal();
        }, 500, true);
    };

    vm.saveInternal = function() {
        var upload = false;

        // If there is an existing storage URL, then the user is trying to migrate to a different URL.
        if (metadata.hasStorageUrl()) {
            upload = true;

            // Check if user is changing the master password
            if (crypto.passwordDifferent(vm.masterPassword)) {
                metadata.makeAllAsHistory();
            }
        }

        crypto.setMasterPassword(vm.masterPassword);
        metadata.setStorageUrl(vm.storageUrl);

        if (upload) {
            var shouldContinueWithSalt = function(salt) {
                if (salt.type !== crypto.generatorTypes.csprng) {
                    $window.alert("Couldn't get a secure random number generator");
                    return false;
                }
                return true;
            };

            sync.upload(true, shouldContinueWithSalt, function(err) {
                if (err) {
                    vm.loading = false;
                    vm.error = true;
                    vm.errorMessage = "Failed to migrate metadata.";
                }
                else {
                    vm.loading = false;
                    vm.error = false;
                    $location.path('/generation');
                }
            });
        }
        else {
            sync.download(function(err) {
                if (err) {
                    vm.loading = false;
                    vm.error = true;
                    vm.errorMessage = err;
                }
                else {
                    vm.loading = false;
                    vm.error = false;
                    $location.path('/generation');
                }
            });
        }
    };
}])
.controller('UnlockController', ['$location', '$timeout', 'crypto', 'sync', 'metadata', '$window', function($location, $timeout, crypto, sync, metadata, $window) {
    var vm = this;

    vm.masterPassword = '';

    if ($window.addon) {
        $window.addon.port.on('wipe', function() {
            crypto.setMasterPassword(null);
            vm.masterPassword = '';
        });
    }

    vm.next = function() {
        crypto.setMasterPassword(vm.masterPassword);

        vm.loading = true;
        vm.error = false;

        $timeout(function() {
            vm.nextInternal();
        }, 500, true);
    };

    vm.reset = function() {
        metadata.setStorageUrl('');
        $location.path('/setup');
    };

    vm.nextInternal = function() {
        sync.download(function(err) {
            if (err) {
                vm.loading = false;
                vm.error = true;
                vm.errorMessage = "Failed to download metadata. Perhaps you typed in the wrong password?";
            }
            else {
                vm.loading = false;
                vm.error = false;
                $location.path('/generation');
            }
        });
    };
}])
.controller('GenerationController', ['$scope', '$window', '$location', '$timeout', 'metadata', 'crypto', 'sync', function($scope, $window, $location, $timeout, metadata, crypto, sync) {
    var vm = this;

    vm.param = '';
    vm.originalParam = '';
    vm.notes = '';
    vm.result = '';

    vm.params = metadata.getAllParams();

    vm.previousResult = null;
    vm.loadingPrevious = false;
    vm.hasPreviousPassword = false;
    vm.useDifferentPreviousMasterPassword = false;

    vm.submitLabel = 'generate';

    vm.configCollapsed = true;
    vm.resultCollapsed = true;

    // default password length to 30
    vm.passwordLength = '30';

    // include symbols in passwords by default
    vm.includeSymbols = true;
    vm.symbolSelection = 'on';
    vm.symbolOnStyle = {'width': '100%'};
    vm.symbolOffStyle = {'width': '0%'};
    vm.symbolHandleStyle = {'left': '100%'};

    vm.generateNewPassword = true;
    vm.newPasswordSelection = 'on';
    vm.newPasswordOnStyle = {'width': '100%'};
    vm.newPasswordOffStyle = {'width': '0%'};
    vm.newPasswordHandleStyle = {'left': '100%'};

    vm.toggleConfig = function() {
        vm.configCollapsed = !vm.configCollapsed;
    };

    vm.toggleSymbols = function(value) {
        if (arguments.length > 0) {
            vm.includeSymbols = value;
        }
        else {
            vm.includeSymbols = !vm.includeSymbols;
        }

        if (vm.includeSymbols) {
            vm.symbolSelection = 'on';
            vm.symbolHandleStyle = {'left': '100%'};
            vm.symbolOnStyle = {'width': '100%'};
            vm.symbolOffStyle = {'width': '0%'};
        }
        else {
            vm.symbolSelection = 'off';
            vm.symbolHandleStyle = {'left': '0%'};
            vm.symbolOnStyle = {'width': '0%'};
            vm.symbolOffStyle = {'width': '100%'};
        }
    };

    vm.toggleUseDifferentPreviousMasterPassword = function() {
        vm.useDifferentPreviousMasterPassword = !vm.useDifferentPreviousMasterPassword;
    };

    vm.toggleNewPassword = function(value) {
        if (arguments.length > 0) {
            vm.generateNewPassword = value;
        }
        else {
            vm.generateNewPassword = !vm.generateNewPassword;
        }

        if (vm.generateNewPassword) {
            vm.newPasswordSelection = 'on';
            vm.newPasswordHandleStyle = {'left': '100%'};
            vm.newPasswordOnStyle = {'width': '100%'};
            vm.newPasswordOffStyle = {'width': '0%'};
            vm.submitLabel = 'create';
        }
        else {
            vm.newPasswordSelection = 'off';
            vm.newPasswordHandleStyle = {'left': '0%'};
            vm.newPasswordOnStyle = {'width': '0%'};
            vm.newPasswordOffStyle = {'width': '100%'};
            vm.submitLabel = 'generate';
        }
    };

    vm.setup = function() {
        $location.path('/setup');
    };

    vm.mapping = function() {
        $location.path('/mapping');
    };

    vm.all = function() {
        $location.path('/all');
    };

    vm.select = function(match) {
        vm.param = match.param;
    };

    vm.generate = function() {
        vm.matches = [];

        vm.loading = true;
        vm.error = false;

        var param = vm.param;
        var symbol = vm.includeSymbols;
        var notes = vm.notes;
        var length = parseInt(vm.passwordLength);
        var iterations = null;
        var salt = null;
        var number = 0;

        if (param === null || param.length === 0) {
            vm.loading = false;
            vm.error = true;
            vm.errorMessage = "Parameter must be provided";
            return;
        }

        vm.previousResult = null;
        vm.loadingPrevious = false;
        vm.hasPreviousPassword = false;

        // Don't use unique salt per site if there is nowhere to store it
        if (!metadata.hasStorageUrl()) {
            salt = '';
        }
        else {
            var mapping = metadata.findMapping(param);
            if (mapping !== null) {
                param = mapping.to;
            }

            var config = metadata.findConfig(param);
            if (config === null || vm.generateNewPassword) {
                // Generate different salt per site to make master password more secure
                salt = crypto.generateSalt($window.prompt);
                if (salt.type !== crypto.generatorTypes.csprng) {
                    (function() {
                        var message = "Couldn't get a secure random number generator";
                        $window.alert(message);
                        vm.loading = false;
                        vm.error = true;
                        vm.errorMessage = message;
                    })();
                    return;
                }
                salt = salt.salt;

                if (config !== null && config.number) {
                    number = config.number + 1;
                }

                if (config && vm.generateNewPassword) {
                    vm.hasPreviousPassword = true;
                }
            }
            else {
                // Use cached config values
                if (angular.isDefined(config.includeSymbols)) {
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
                    vm.hasPreviousPassword = true;
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
                vm.result = password.password;
                vm.configCollapsed = true;
                vm.resultCollapsed = false;

                var escapedParam = vm.originalParam.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/"/g, '\\\"');
                var escapedPassword = password.password.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/"/g, '\\\"');
                var code = "                                                  \
                    var url = window.location.href;                           \
                    var domain = url.match(/:\\/\\/(.[^\\/]+)/);              \
                    if (domain !== null) {                                    \
                        domain = domain[1];                                   \
                    }                                                         \
                    if (domain == '" + escapedParam + "') {                   \
                        var inputs = document.getElementsByTagName('input');  \
                        var password = '" + escapedPassword + "';             \
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

                var shouldContinueWithSalt = function(generatedSalt) {
                    if (generatedSalt.type !== crypto.generatorTypes.csprng) {
                        var message = "Couldn't get a secure random number generator";
                        $window.alert(message);
                        vm.loading = false;
                        vm.error = true;
                        vm.errorMessage = message;
                        return false;
                    }
                    return true;
                };

                // Encrypt and update server if configs have changed
                sync.upload(false, shouldContinueWithSalt, function(err) {
                    if (err) {
                        $window.alert(err);
                        vm.loading = false;
                        vm.error = true;
                        vm.errorMessage = err;
                    }
                    else {
                        vm.loading = false;
                        vm.error = false;
                    }
                });

                vm.toggleNewPassword(false);
            }
            else {
                (function() {
                    var message = 'Failed to generate password';
                    $window.alert(message);
                    vm.loading = false;
                    vm.error = true;
                    vm.errorMessage = message;
                })();
            }
        });
    };

    vm.showPrevious = function() {
        vm.loadingPrevious = true;

        var param = vm.param;
        var symbol = vm.includeSymbols;
        var length = parseInt(vm.passwordLength);
        var iterations = null;
        var salt = null;
        var number = 0;

        var mapping = metadata.findMapping(param);
        if (mapping !== null) {
            param = mapping.to;
        }

        var config = metadata.findConfig(param);
        if (!config) {
            $window.alert("Unexpected error. Can't generate previous password if there is no config.");
            return;
        }

        if (!config.oldVersions || config.oldVersions.length === 0) {
            $window.alert("Unexpected error. No older versions stored.");
            return;
        }

        // Load the previous configuration
        config = config.oldVersions[config.oldVersions.length - 1];

        // Use cached config values
        if (angular.isDefined(config.includeSymbols)) {
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

        var args = {
            includeSymbols: symbol,
            passwordLength: length,
            iterations: iterations,
            param: param,
            number: number,
            salt: salt
        };

        if (vm.useDifferentPreviousMasterPassword) {
            args.masterPassword = vm.previousMasterPassword;
            delete vm.previousMasterPassword;
        }

        crypto.generatePassword(args, function(password) {
            if (password) {
                vm.previousResult = password.password;
            }
            else {
                $window.alert('Failed to generate password');
            }
            vm.loadingPrevious = false;
        });
    };

    vm.paramWatch = $scope.$watch('param', function(newVal) {
        vm.matches = [];

        var key = newVal;
        var mapping = metadata.findMapping(key);
        if (mapping) {
            key = mapping.to;
        }
        var config = metadata.findConfig(key);
        if (config !== null) {
            if (config.notes) {
                vm.notes = config.notes;
            }
            if (config.passwordLength) {
                vm.passwordLength = '' + config.passwordLength;
            }
            if (angular.isDefined(config.includeSymbols)) {
                vm.toggleSymbols(config.includeSymbols);
            }
            vm.submitLabel = 'generate';
            vm.toggleNewPassword(false);

        } else {
            if (key.length > 0) {
                vm.matches = metadata.findConfigs(key);
            }
            vm.notes = '';
            vm.passwordLength = '30';
            vm.submitLabel = 'create';
            vm.toggleNewPassword(true);
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

        vm.param = domain;
        vm.originalParam = domain;

        var key = domain;
        var mapping = metadata.findMapping(key);
        if (mapping !== null) {
            key = mapping.to;
            vm.param = key;
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
.controller('MappingController', ['$window', '$location', '$timeout', 'sync', 'metadata', 'crypto', function($window, $location, $timeout, sync, metadata, crypto) {
    var vm = this;

    vm.from = '';
    vm.to = null;

    var unsortedParams = metadata.getAllParams();
    var params = [];
    for (var i = 0; i < unsortedParams.length; i++) {
        var domain = unsortedParams[i];

        var matches = domain.match(/\./g);
        if (matches != null && matches.length > 1) {
            var index = domain.lastIndexOf('.');

            var company = domain.substring(domain.lastIndexOf('.', index - 1) + 1);
            params.push({
                "param": domain,
                "display": company + ' (' + domain + ')'
            });
        }
        else {
            params.push({
                "param": domain,
                "display": domain
            });
        }
    }
    vm.params = params.sort();

    vm.mappings = metadata.getAllMappings();
    vm.mappings.forEach(function(mapping) {
        mapping.label = mapping.from + ' > ' + mapping.to;
    });

    vm.cancel = function() {
        $location.path('/generation');
    };

    vm.save = function() {
        vm.loading = true;
        vm.error = false;

        if (!vm.to) {
            vm.loading = false;
            vm.error = true;
            vm.errorMessage = 'Please select a target to map to.';
            return;
        }

        $timeout(function() {
            vm.saveInternal();
        }, 500, true);
    };

    vm.saveInternal = function() {
        metadata.addMapping(vm.from, vm.to.param);

        var shouldContinueWithSalt = function(salt) {
            if (salt.type !== crypto.generatorTypes.csprng) {
                var message = "Couldn't get a secure random number generator";
                $window.alert(message);
                vm.loading = false;
                vm.error = true;
                vm.errorMessage = message;
                return false;
            }
            return true;
        };

        sync.upload(true, shouldContinueWithSalt, function(err) {
            if (err) {
                vm.loading = false;
                vm.error = true;
                vm.errorMessage = "Failed to upload metadata.";
            }
            else {
                vm.loading = false;
                vm.error = false;
                $location.path('/generation');
            }
        });
    };

    vm.remove = function() {
        if (!vm.selectedMapping) {
            vm.removeLoading = false;
            vm.removeError = true;
            vm.removeErrorMessage = 'Please select a mapping.';
            return;
        }

        vm.confirming = true;
        vm.removeError = false;
    };

    vm.confirmRemove = function() {
        vm.confirming = false;
        vm.removeLoading = true;
        vm.removeError = false;

        $timeout(function() {
            vm.removeInternal();
        }, 500, true);
    };

    vm.removeInternal = function() {
        metadata.removeMapping(vm.selectedMapping.from, vm.selectedMapping.to);

        var shouldContinueWithSalt = function(salt) {
            if (salt.type !== crypto.generatorTypes.csprng) {
                var message = "Couldn't get a secure random number generator";
                $window.alert(message);
                vm.removeLoading = false;
                vm.removeError = true;
                vm.removeErrorMessage = message;
                return false;
            }
            return true;
        };

        sync.upload(true, shouldContinueWithSalt, function(err) {
            if (err) {
                vm.removeLoading = false;
                vm.removeError = true;
                vm.removeErrorMessage = "Failed to upload metadata.";
            }
            else {
                vm.removeLoading = false;
                vm.removeError = false;
                $location.path('/generation');
            }
        });
    };
}])
.controller('AllPasswordsController', ['$window', '$location', '$timeout', 'sync', 'metadata', 'crypto', function($window, $location, $timeout, sync, metadata, crypto) {
    var vm = this;

    var unsortedParams = metadata.getAllParams();
    var params = [];
    for (var i = 0; i < unsortedParams.length; i++) {
        var domain = unsortedParams[i];

        var matches = domain.match(/\./g);
        if (matches != null && matches.length > 1) {
            var index = domain.lastIndexOf('.');

            var company = domain.substring(domain.lastIndexOf('.', index - 1) + 1);
            params.push({
                "param": domain,
                "display": company + ' (' + domain + ')'
            });
        }
        else {
            params.push({
                "param": domain,
                "display": domain
            });
        }
    }
    vm.params = params.sort();
    if (vm.params.length > 0) {
        vm.selectedParam = vm.params[0];
    }

    vm.cancel = function() {
        $location.path('/generation');
    };

    vm.remove = function() {
        vm.confirming = true;
    };

    vm.confirmRemove = function() {
        vm.confirming = false;
        vm.loading = true;
        vm.error = false;

        $timeout(function() {
            vm.removeInternal();
        }, 500, true);
    };

    vm.removeInternal = function() {
        metadata.removeConfig(vm.selectedParam.param);

        var shouldContinueWithSalt = function(salt) {
            if (salt.type !== crypto.generatorTypes.csprng) {
                var message = "Couldn't get a secure random number generator";
                $window.alert(message);
                vm.loading = false;
                vm.error = true;
                vm.errorMessage = message;
                return false;
            }
            return true;
        };

        sync.upload(true, shouldContinueWithSalt, function(err) {
            if (err) {
                vm.loading = false;
                vm.error = true;
                vm.errorMessage = "Failed to upload metadata.";
            }
            else {
                vm.loading = false;
                vm.error = false;
                $location.path('/generation');
            }
        });
    };
}])
.controller('TestController', ['$window', 'crypto', function($window, crypto) {
    var vm = this;

    vm.iterations = '4096';
    vm.loading = false;
    vm.delta = null;

    vm.test = function() {
        var iterations = parseInt(vm.iterations);
        vm.delta = null;
        var start = new Date().getTime();
        vm.loading = true;
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
            if (password.iterations !== iterations) {
                $window.alert('Something is wrong');
            }

            var end = new Date().getTime();
            vm.loading = false;

            vm.delta = (end - start);
        });
    };
}]);
