'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('hash0.services', [])
.value('version', '2.0')

/*
 * Metadata service - local cache of metadata
 */
.factory('metadata', ['$window', function($window) {
    var storage = $window.localStorage;

    function Metadata() {
        this.configs = new Array();
        this.mappings = new Array();
        this.dirty = false;
    }

    Metadata.prototype.setStorageUrl = function(value) {
        storage['storageUrl'] = value;
    };

    Metadata.prototype.getStorageUrl = function() {
        return storage['storageUrl'];
    };

    Metadata.prototype.hasStorageUrl = function() {
        if (!(storage['storageUrl']) ||
            storage['storageUrl'] == '') {
            return false;
        }
        return true;
    };

    Metadata.prototype.updateConfig = function(param, config) {
        for (var i = 0; i < this.configs.length; i++) {
            if (this.configs[i].param == param) {
                this.configs.splice(i, 1, config);
                break;
            }
        }
    };

    Metadata.prototype.getAllParams = function() {
        var params = [];
        for (var i = 0; i < this.configs.length; i++) {
            params.push(this.configs[i].param);
        }
        return params;
    };

    Metadata.prototype.getAllMappings = function() {
        var mappings = [];
        for (var i = 0; i < this.mappings.length; i++) {
            var mapping = this.mappings[i];
            mappings.push({
                from: mapping.from,
                to: mapping.to
            });
        }
        return mappings;
    };

    Metadata.prototype.findConfig = function(param, partial_match) {
        partial_match = partial_match || false;

        for (var i = 0; i < this.configs.length; i++) {
            if (this.configs[i].param == param) {
                return this.configs[i];
            }

            if (partial_match && this.configs[i].param.indexOf(param) >= 0) {
                return this.configs[i];
            }
        }
        return null;
    };

    Metadata.prototype.findConfigs = function(param) {
        var matches = [];
        for (var i = 0; i < this.configs.length; i++) {
            if (this.configs[i].param.indexOf(param) >= 0) {
                matches.push(this.configs[i]);
            }
        }
        return matches;
    };

    Metadata.prototype.findMapping = function(from) {
        for (var i = 0; i < this.mappings.length; i++) {
            if (this.mappings[i].from == from) {
                return this.mappings[i];
            }
        }
        return null;
    };

    Metadata.prototype.isDirty = function() {
        return this.dirty;
    };

    Metadata.prototype.markClean = function() {
        this.dirty = false;

        storage['configs'] = JSON.stringify(this.configs);
        storage['mappings'] = JSON.stringify(this.mappings);
    };

    Metadata.prototype.replaceData = function(configs, mappings) {
        this.configs = configs;
        this.mappings = mappings;
        this.markClean();
    };

    Metadata.prototype.stringify =  function() {
        var jsonConfigs = JSON.stringify(this.configs);
        var jsonMappings = JSON.stringify(this.mappings);
        var data = '{"mappings":' + jsonMappings + ',"configs":' + jsonConfigs + '}';
        return data;
    };

    Metadata.prototype.addMapping = function(from, to) {
        var mapping = this.findMapping(from);
        if (mapping === null) {
            var newmapping = {
                'from': from,
                'to': to,
            };
            this.mappings.push(newmapping);
        }
        else {
            mapping.to = to;
        }
        this.dirty = true;
    };

    Metadata.prototype.removeMapping = function(from, to) {
        for (var i = 0; i < this.mappings.length; i++) {
            var mapping = this.mappings[i];
            if (mapping.from == from && mapping.to == to) {
                this.mappings.splice(i, 1);
                break;
            }
        }
        this.dirty = true;
    };

    Metadata.prototype.makeAllAsHistory = function() {
        for (var i = 0; i < this.configs.length; i++) {
            var existingConfig = this.configs[i];

            var newConfig = {
                'param': existingConfig.param,
                'salt': existingConfig.salt,
                'includeSymbols': existingConfig.includeSymbols,
                'passwordLength': existingConfig.passwordLength,
                'notes': existingConfig.notes,
                'iterations': existingConfig.iterations,
                'number': existingConfig.number
            };

            newConfig.oldVersions = existingConfig.oldVersions || [];
            delete existingConfig['oldVersions'];
            newConfig.oldVersions.push(existingConfig);
            this.updateConfig(newConfig.param, newConfig);
        }
        this.dirty = true;
    };

    Metadata.prototype.addConfig = function(options) {
        var newConfig = {
            'param': options.param,
            'salt': options.salt,
            'includeSymbols': options.includeSymbols,
            'passwordLength': options.passwordLength,
            'notes': options.notes,
            'iterations': options.iterations
        };
        newConfig.number = options.number || 0;

        var existingConfig = this.findConfig(options.param);
        if (existingConfig != null) {
            // Check if anything has changed
            if (existingConfig.param == newConfig.param &&
                existingConfig.salt == newConfig.salt &&
                existingConfig.includeSymbols == newConfig.includeSymbols &&
                existingConfig.passwordLength == newConfig.passwordLength &&
                existingConfig.notes == newConfig.notes &&
                existingConfig.iterations == newConfig.iterations &&
                existingConfig.number == newConfig.number) {

                // Nothing has changed, so no-op
            }
            else {
                newConfig.oldVersions = existingConfig.oldVersions || [];
                delete existingConfig['oldVersions'];
                newConfig.oldVersions.push(existingConfig);
                this.updateConfig(newConfig.param, newConfig);
                this.dirty = true;
            }
        } else {
            this.configs.push(newConfig);
            this.dirty = true;
        }

        return newConfig;
    };

    Metadata.prototype.removeConfig = function(param) {
        for (var i = 0; i < this.configs.length; i++) {
            if (this.configs[i].param == param) {
                this.configs.splice(i, 1);
                break;
            }
        }
        this.dirty = true;
    };

    var instance = new Metadata();
    return instance;
}])

/*
 * Synchronization service - upload or download metadata to provided storage URL
 */
.factory('sync', ['$window', '$http', 'metadata', 'crypto', function($window, $http, metadata, crypto) {
    function Synchronization() {
    }

    Synchronization.prototype.upload = function(forceUpdate, shouldContinueWithSalt, callback) {

        if (!metadata.hasStorageUrl()) {
            // No-op if storage URL not provided
            return callback(null);
        }

        if (!forceUpdate && !metadata.isDirty()) {
            // No-op if configs have not changed
            return callback(null);
        }

        var data = metadata.stringify();

        // Let's use a different encryption key each time we upload.
        var salt = crypto.generateSalt();
        if (!shouldContinueWithSalt(salt)) {
            return;
        }

        crypto.generatePassword({
            includeSymbols: true,
            passwordLength: 30,
            param: 'hash0.dannysu.com',
            number: '1',
            salt: salt.salt
        }, function(password) {

            if (!password) {
                return callback('Failed to generate password');
            }

            var encrypted = sjcl.encrypt(password.password, data);
            encrypted = JSON.parse(encrypted);

            // Store the salt used and # of iterations used
            // Allows a different encryption key to be used each time we update metadata
            encrypted.hash0 = {};
            encrypted.hash0.salt = salt;
            encrypted.hash0.iterations = password.iterations;

            $http.post(metadata.getStorageUrl(), JSON.stringify(encrypted)).
                success(function(data, status, headers, config) {
                    if (!data.success) {
                        return callback('Failed to synchronize settings');
                    }
                    metadata.markClean();
                    callback(null);
                }).
                error(function(data, status, headers, config) {
                    callback(data || 'Failed to synchronize settings');
                });
        });
    };

    Synchronization.prototype.decryptDownload = function(data, callback) {
        var urldecoded = decodeURIComponent(data);
        var encrypted = JSON.parse(urldecoded);
        if (encrypted.hash0) {
            var salt = encrypted.hash0.salt;
            var iterations = encrypted.hash0.iterations;
            delete encrypted.hash0;

            crypto.generatePassword({
                includeSymbols: true,
                passwordLength: 30,
                param: 'hash0.dannysu.com',
                number: '1',
                salt: salt.salt,
                iterations: iterations
            }, function(password) {
                // Decrypt settings
                try {
                    var decrypted = sjcl.decrypt(password.password, JSON.stringify(encrypted));

                    var json = JSON.parse(decrypted);

                    return callback(null, json);
                }
                catch (e) {
                    return callback("exception from decrypt. Please check that your master password was entered correctly and that storage wasn't tampered with");
                }
            });

            return;
        }

        return callback("missing hash0 metadata for encrypted data");
    };

    Synchronization.prototype.download = function(callback) {
        if (!metadata.hasStorageUrl()) {
            // No-op if storage URL not provided
            return callback(null);
        }

        var self = this;

        $http.get(metadata.getStorageUrl()).
            success(function(data, status, headers, config) {
                if (data.success) {

                    self.decryptDownload(data.data, function(err, json) {
                        if (err) {
                            return callback(err);
                        }

                        metadata.replaceData(json.configs, json.mappings);

                        return callback(null);
                    });
                    return;
                }

                return callback("Failed to download metadata. Perhaps you typed in the wrong password?");
            }).
            error(function(data, status, headers, config) {
                if (status == 404) {
                    callback(null);
                }
                else {
                    callback('Failed to download metadata.');
                }
            });
    };

    var instance = new Synchronization();
    return instance;
}])

/*
 * Crypto service - provides functions that generate salt or password
 */
.factory('crypto', ['$window', '$timeout', function($window, $timeout) {
    var charsets = new Array(
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`~!@#$%^&*()_-+={}|[]\\:\";'<>?,./"
    );

    function Crypto() {
        this.enableWebWorkers = true;
        this.masterPassword = null;
        this.generatorTypes = {
            csprng: 'CSPRNG',
            user: 'User button mashing',
            insecure: 'Math.random() generator'
        };
    }

    /*
     * setMasterPassword - sets the master password for current session
     */
    Crypto.prototype.setMasterPassword = function(value) {
        this.masterPassword = value;
    };

    Crypto.prototype.passwordDifferent = function(value) {
        return value != this.masterPassword;
    };

    /*
     * generateSalt
     */
    Crypto.prototype.generateSalt = function(user_prompt) {
        var words = null;
        var sigBytes = 256/8;
        var generatorType = null;

        // First check if browser provides a CSPRNG
        if (($window && Uint32Array) && (($window.crypto && $window.crypto.getRandomValues) || ($window.msCrypto && $window.msCrypto.getRandomValues))) {
            try {
                words = sjcl.random.randomWords(sigBytes/4, 10);
                generatorType = this.generatorTypes.csprng;
            }
            catch(e) {
                // If something goes wrong then salt remains null
            }
        }

        // Otherwise, prompt user to randomly type a whole bunch of characters
        if (words === null) {
            if (user_prompt) {
                // Keep on adding entropy until there's enough random data
                while (!sjcl.random.isReady(10)) {
                    var randomTyping = user_prompt();
                    if (randomTyping === null) {
                        break;
                    }
                    sjcl.random.addEntropy(randomTyping);
                }

                // randomWords could throw exception if generator is not ready,
                // but shouldn't happen since the while loop won't exit until it's ready.
                //
                // Should there be any other exception in the future, then this will also just let the exception through
                words = sjcl.random.randomWords(sigBytes/4, 10);
                generatorType = this.generatorTypes.user;
            }
            else {
                // function will fall back to using the insecure Math.random() through
                // CryptoJS if no prompt function provided
                words = CryptoJS.lib.WordArray.random(sigBytes).words;
                generatorType = this.generatorTypes.insecure;
            }
        }

        var hexChars = [];
        for (var i = 0; i < sigBytes; i++) {
            var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
            hexChars.push((bite >>> 4).toString(16));
            hexChars.push((bite & 0x0f).toString(16));
        }
        return {
            salt: hexChars.join(''),
            type: generatorType
        };
    };

    /*
     * generatePassword
     */
    Crypto.prototype.generatePassword = function(options, callback) {
        var masterPasswordToUse = this.masterPassword;
        if (options.masterPassword) {
            masterPasswordToUse = options.masterPassword;
        }

        if (!masterPasswordToUse) {
            $timeout(function() {
                callback(null);
            }, 0, true);
            return;
        }

        // Hash0 by default generates passwords that are 30 characters long and
        // includes upper & lowercase alphabet plus symbols
        if (options.includeSymbols) {
            options.includeSymbols = true;
        }
        else {
            options.includeSymbols = false;
        }
        options.passwordLength = options.passwordLength || 30;

        // Default to 100,000 rounds in PBKDF2 if not specified
        options.iterations = options.iterations || 100000;

        if (this.enableWebWorkers && typeof($window.Worker) != 'undefined') {
            var self = this;
            var worker = new $window.Worker('./sjcl_worker.js');
            worker.postMessage({
                salt: options.salt,
                iterations: options.iterations,
                masterPassword: masterPasswordToUse
            });
            worker.onmessage = function(e) {
                self.onPBKDF2(options, e.data, callback);
            };
            worker.onerror = function(e) {
                $timeout(function() {
                    callback(null);
                }, 0, true);
                return;
            };
        }
        else {
            // Convert hex string salt into SJCL's bitArray type.
            // Doing so preserves the range of numbers in the salt.
            var saltBitArray = sjcl.codec.hex.toBits(options.salt);
            var key = sjcl.misc.pbkdf2(masterPasswordToUse, saltBitArray, options.iterations, 512);

            this.onPBKDF2(options, key, callback);
        }
    };

    Crypto.prototype.onPBKDF2 = function(options, key, callback) {
        var charset = charsets[0];
        if (options.includeSymbols === true) {
            charset = charsets[1];
        }

        var password = PasswordMaker_HashUtils.rstr2any(
            PasswordMaker_HashUtils.binb2rstr(key),
            charset
        );

        // truncate password to desired length
        password = password.substring(0, options.passwordLength);

        $timeout(function() {
            callback({
                password: password,
                iterations: options.iterations,
                includeSymbols: options.includeSymbols
            });
        }, 0, true);
    };

    var instance = new Crypto();
    return instance;
}]);
