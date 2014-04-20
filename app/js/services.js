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

    Metadata.prototype.addConfig = function(options) {
        var newconfig = {
            'param': options.param,
            'salt': options.salt,
            'includeSymbols': options.includeSymbols,
            'passwordLength': options.passwordLength,
            'notes': options.notes
        };
        newconfig.number = options.number || 0;

        var existingConfig = this.findConfig(options.param);
        if (existingConfig != null) {
            // Allow creation of new password for a particular site
            newconfig.number = existingConfig.number + 1;
            this.updateConfig(options.param, newconfig);
        } else {
            this.configs.push(newconfig);
        }
        this.dirty = true;

        return newconfig;
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
            return callback('no storage URL');
        }

        if (!forceUpdate && !metadata.hasChanges()) {
            // No-op if configs have not changed
            return callback(null);
        }

        var data = metadata.stringify();

        // Let's use a different encryption key each time we upload.
        var salt = crypto.generateSalt();
        if (!shouldContinueWithSalt(salt)) {
            return;
        }

        var encryptionKey = crypto.generatePassword({
            includeSymbols: true,
            passwordLength: 30,
            param: 'hash0.dannysu.com',
            number: '1',
            salt: salt.salt
        });
        var encrypted = sjcl.encrypt(encryptionKey.password, data);
        encrypted = JSON.parse(encrypted);

        // Store the salt used and # of iterations used
        // Allows a different encryption key to be used each time we update metadata
        encrypted.hash0 = {};
        encrypted.hash0.salt = salt;
        encrypted.hash0.iterations = encryptionKey.iterations;

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
    };

    Synchronization.prototype.download = function(callback) {
        if (!metadata.hasStorageUrl()) {
            // No-op if storage URL not provided
            return callback(null);
        }

        $http.get(metadata.getStorageUrl()).
            success(function(data, status, headers, config) {
                var loaded = false;
                if (data.success) {
                    var urldecoded = decodeURIComponent(data.data);
                    var encrypted = JSON.parse(urldecoded);
                    if (encrypted.hash0) {
                        var salt = encrypted.hash0.salt;
                        var iterations = encrypted.hash0.iterations;
                        delete encrypted.hash0;

                        var encryptionKey = crypto.generatePassword({
                            includeSymbols: true,
                            passwordLength: 30,
                            param: 'hash0.dannysu.com',
                            number: '1',
                            salt: salt,
                            iterations: iterations
                        });

                        // Decrypt settings
                        var decrypted = sjcl.decrypt(encryptionKey.password, JSON.stringify(encrypted));
                        var json = JSON.parse(decrypted);

                        metadata.replaceData(json.configs, json.mappings);

                        loaded = true;
                    }
                }

                if (!loaded) {
                    return callback('Failed to synchronize settings');
                }
                return callback(null);
            }).
            error(function(data, status, headers, config) {
                if (status == 404) {
                    callback(null);
                }
                else {
                    callback('Failed to synchronize settings');
                }
            });
    };

    var instance = new Synchronization();
    return instance;
}])

/*
 * Crypto service - provides functions that generate salt or password
 */
.factory('crypto', ['$window', function($window) {
    var charsets = new Array(
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`~!@#$%^&*()_-+={}|[]\\:\";'<>?,./"
    );

    function Crypto() {
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

    /*
     * generateSalt
     */
    Crypto.prototype.generateSalt = function(user_prompt) {
        var words = null;
        var sigBytes = 128/8;
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
    Crypto.prototype.generatePassword = function(options) {
        if (!this.masterPassword) {
            return null;
        }

        // Hash0 by default generates passwords that are 30 characters long and
        // includes upper & lowercase alphabet plus symbols
        options.includeSymbols = options.includeSymbols || true;
        options.passwordLength = options.passwordLength || 30;

        // Default to 1000 rounds in PBKDF2 if not specified
        options.iterations = options.iterations || 1000;

        var salt = options.param + options.number + options.salt;
        var key = CryptoJS.PBKDF2(this.masterPassword,
                                  salt,
                                  {
                                      hasher: CryptoJS.algo.SHA512,
                                      keySize: 512/32,
                                      iterations: options.iterations
                                  });

        var charset = charsets[0];
        if (options.includeSymbols === true) {
            charset = charsets[1];
        }

        var password = PasswordMaker_HashUtils.rstr2any(
            PasswordMaker_HashUtils.binb2rstr(key.words),
            charset
        );

        // truncate password to desired length
        password = password.substring(0, options.passwordLength);

        return {
            password: password,
            iterations: options.iterations,
            includeSymbols: options.includeSymbols
        };
    };

    var instance = new Crypto();
    return instance;
}]);
