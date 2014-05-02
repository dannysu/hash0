'use strict';

/* jasmine specs for services go here */

describe('service', function() {
    var mockWindow = {};
    mockWindow.localStorage = {};
    mockWindow.localStorage.getItem = function(key) {
        return storage[key];
    };
    mockWindow.localStorage.setItem = function(key, value) {
        storage[key] = value;
    };

    beforeEach(function() {
        module('hash0.services');
        var storage = {};

        module(function($provide) {
            $provide.value('$window', mockWindow);
        });
    });

    describe('version', function() {
        it('should return current version', inject(function(version) {
            expect(version).toEqual('2.0');
        }));
    });

    describe('metadata', function() {
        it('should initially be clean', inject(function(metadata) {
            expect(metadata.isDirty()).toBe(false);
            expect(metadata.stringify()).toBe('{"mappings":[],"configs":[]}');
            expect(metadata.hasStorageUrl()).toBe(false);
        }));

        describe('setStorageUrl and getStorageUrl', function() {
            beforeEach(inject(function(metadata) {
                metadata.setStorageUrl('test storage url');
            }));

            it('should return correct value', inject(function(metadata) {
                expect(metadata.hasStorageUrl()).toBe(true);
                expect(metadata.getStorageUrl()).toBe('test storage url');
            }));
        });

        describe('addMapping', function() {
            beforeEach(inject(function(metadata) {
                metadata.addMapping('test from', 'test to');
            }));

            it('should mark metadata as changed after adding', inject(function(metadata) {
                expect(metadata.isDirty()).toBe(true);
            }));

            it('should be able to find it later', inject(function(metadata) {
                var mapping = metadata.findMapping('test from');
                expect(mapping.from).toBe('test from');
                expect(mapping.to).toBe('test to');
            }));

            it('should be change value if already exists', inject(function(metadata) {
                metadata.addMapping('test from', 'to test');
                var mapping = metadata.findMapping('test from');
                expect(mapping.from).toBe('test from');
                expect(mapping.to).toBe('to test');
            }));

            it('should no longer be marked as changed after markClean', inject(function(metadata) {
                metadata.markClean();
                expect(metadata.isDirty()).toBe(false);
                expect(metadata.stringify()).toBe('{"mappings":[{"from":"test from","to":"test to"}],"configs":[]}');

                metadata.replaceData([], []);
                expect(metadata.stringify()).toBe('{"mappings":[],"configs":[]}');
            }));
        });

        describe('addConfig', function() {
            beforeEach(inject(function(metadata) {
                metadata.addConfig({
                    param: 'hash0.dannysu.com',
                    salt: 'saltysnacks',
                    number: 1,
                    includeSymbols: true,
                    passwordLength: 20,
                    notes: 'note to self'
                });
            }));

            it('should mark metadata as changed after adding', inject(function(metadata) {
                expect(metadata.isDirty()).toBe(true);
            }));

            it('should be able to find it later', inject(function(metadata) {
                var config = metadata.findConfig('hash0.dannysu.com');
                expect(config.param).toBe('hash0.dannysu.com');
                expect(config.salt).toBe('saltysnacks');
                expect(config.number).toBe(1);
                expect(config.includeSymbols).toBe(true);
                expect(config.passwordLength).toBe(20);
                expect(config.notes).toBe('note to self');
            }));

            it('should be change value if already exists', inject(function(metadata) {
                metadata.addConfig({
                    param: 'hash0.dannysu.com',
                    salt: 'saltysnacks2',
                    number: 2,
                    includeSymbols: false,
                    passwordLength: 10,
                    notes: 'note to self2'
                });

                var config = metadata.findConfig('hash0.dannysu.com');
                expect(config.param).toBe('hash0.dannysu.com');
                expect(config.salt).toBe('saltysnacks2');
                expect(config.number).toBe(2);
                expect(config.includeSymbols).toBe(false);
                expect(config.passwordLength).toBe(10);
                expect(config.notes).toBe('note to self2');
            }));

            it('should no longer be marked as changed after markClean', inject(function(metadata) {
                metadata.markClean();
                expect(metadata.isDirty()).toBe(false);
                expect(metadata.stringify()).toBe('{"mappings":[],"configs":[{"param":"hash0.dannysu.com","salt":"saltysnacks","includeSymbols":true,"passwordLength":20,"notes":"note to self","number":1}]}');

                metadata.replaceData([], []);
                expect(metadata.stringify()).toBe('{"mappings":[],"configs":[]}');
            }));
        });
    });

    describe('crypto', function() {
        beforeEach(function() {
            delete mockWindow.crypto;
        });

        it('generates secure salt if window.crypto.getRandomValues available', inject(function(crypto) {
            sjcl.random = new sjcl.prng(6);

            var ab = new Uint32Array(32);
            for (var i = 0; i < ab.length; i++) {
                ab = 777;
            }
            sjcl.random.addEntropy(ab, 1024, "crypto.getRandomValues");

            mockWindow.crypto = {};
            mockWindow.crypto.getRandomValues = true;

            var salt = crypto.generateSalt();
            expect(salt.type).toBe(crypto.generatorTypes.csprng);
        }));

        it("generate salt based on user random input if window.crypto.getRandomValues isn't available", inject(function(crypto) {
            sjcl.random = new sjcl.prng(6);

            var user_prompt = function(prompt) {
                return "fkldsajfl;kdsajfkl;djsa";
            };

            var salt = crypto.generateSalt(user_prompt);
            expect(salt.type).toBe(crypto.generatorTypes.user);
        }));

        it("generate salt based on Math.random as last resort", inject(function(crypto) {
            sjcl.random = new sjcl.prng(6);

            var salt = crypto.generateSalt();
            expect(salt.type).toBe(crypto.generatorTypes.insecure);
        }));

        describe('not using web workers', function() {
            it('should fail password generation if master password not set', inject(function(crypto, $injector) {
                var $timeout = $injector.get('$timeout');

                sjcl.random = new sjcl.prng(6);

                var password;

                crypto.enableWebWorkers = false;
                crypto.generatePassword({}, function(result) {
                    password = result;
                });

                $timeout.flush();

                waitsFor(function() {
                    if (typeof(password) == 'undefined') {
                        return false;
                    }
                    return true;
                }, 5000);

                expect(password).toBe(null);
            }));

            it('should generate password if master password is set', inject(function(crypto, $injector) {
                var $timeout = $injector.get('$timeout');

                crypto.setMasterPassword('test');

                var password;

                crypto.enableWebWorkers = false;
                crypto.generatePassword({
                    includeSymbols: true,
                    passwordLength: 20,
                    param: 'hash0.dannysu.com',
                    number: 2,
                    salt: 'acd5384e61914f9ba6769a8a03d66cd5',
                    iterations: 55
                }, function(result) {
                    password = result;
                });

                $timeout.flush();

                waitsFor(function() {
                    if (typeof(password) == 'undefined') {
                        return false;
                    }
                    return true;
                }, 10000);

                expect(password).toBeDefined();
                expect(password.iterations).toBe(55);
                expect(password.includeSymbols).toBe(true);
                expect(password.password.length).toBe(20);
            }));
        });

        describe('using web workers', function() {
            it('should fail password generation if master password not set', inject(function(crypto, $injector) {
                var $timeout = $injector.get('$timeout');

                sjcl.random = new sjcl.prng(6);

                var password;

                crypto.generatePassword({}, function(result) {
                    password = result;
                });

                $timeout.flush();

                waitsFor(function() {
                    if (typeof(password) == 'undefined') {
                        return false;
                    }
                    return true;
                }, 5000);

                expect(password).toBe(null);
            }));

            it('should generate password if master password is set', inject(function(crypto, $injector) {
                var $timeout = $injector.get('$timeout');

                crypto.setMasterPassword('test');

                var password;

                crypto.generatePassword({
                    includeSymbols: true,
                    passwordLength: 20,
                    param: 'hash0.dannysu.com',
                    number: 2,
                    salt: 'acd5384e61914f9ba6769a8a03d66cd5',
                    iterations: 55
                }, function(result) {
                    password = result;
                });

                $timeout.flush();

                waitsFor(function() {
                    if (typeof(password) == 'undefined') {
                        return false;
                    }
                    return true;
                }, 10000);

                expect(password).toBeDefined();
                expect(password.iterations).toBe(55);
                expect(password.includeSymbols).toBe(true);
                expect(password.password.length).toBe(20);
            }));
        });
    });

    describe('sync', function() {
        var salt;

        it('download with no storage url is a no-op', inject(function(sync, metadata) {
            metadata.setStorageUrl('');

            var error;
            sync.download(function(err) {
                error = err;
            });

            waitsFor(function() {
                return (typeof(error) != 'undefined');
            }, 5000);

            expect(error).toBe(null);
        }));

        it('download initially gets 404 and should succeed', inject(function($httpBackend, sync, metadata, crypto) {
            salt = crypto.generateSalt();
            var url = 'https://hash0-test.appspot.com/' + salt.salt;
            metadata.setStorageUrl(url);

            $httpBackend.expectGET(url).respond(404, '');

            var error;
            sync.download(function(err) {
                error = err;
            });

            $httpBackend.flush();

            waitsFor(function() {
                return (typeof(error) != 'undefined');
            }, 5000);

            expect(error).toBe(null);
        }));

        it('upload should succeed', inject(function($injector, $httpBackend, sync, metadata, crypto) {
            var $timeout = $injector.get('$timeout');

            var url = 'https://hash0-test.appspot.com/' + salt.salt;
            metadata.setStorageUrl(url);

            $httpBackend.expectPOST(url).respond({"success": true});

            metadata.addConfig({
                param: 'upload/download test',
                salt: 'saltysnacks',
                number: 1,
                includeSymbols: true,
                passwordLength: 20,
                notes: 'note to self'
            });

            metadata.addMapping('upload from', 'upload to');

            crypto.setMasterPassword('test');

            var shouldContinueWithSalt = function(salt) {
                return true;
            };

            var error;
            sync.upload(true, shouldContinueWithSalt, function(err) {
                error = err;
            });

            $timeout.flush();
            $httpBackend.flush();

            waitsFor(function() {
                return (typeof(error) != 'undefined');
            }, 5000);

            expect(error).toBe(null);
        }));

        it('download should succeed', inject(function($injector, $httpBackend, sync, metadata, crypto) {
            var $timeout = $injector.get('$timeout');

            var url = 'https://hash0-test.appspot.com/' + salt.salt;
            metadata.setStorageUrl(url);

            metadata.replaceData([], []);
            var mapping = metadata.findMapping('upload from');
            expect(mapping).toBe(null);
            var config = metadata.findConfig('upload/download test');
            expect(config).toBe(null);

            $httpBackend.expectGET(url).respond({"success": true});

            sync.decryptDownload = function(data, callback) {
                callback(null, {
                    configs: [],
                    mappings: []
                });
            };

            var error;
            sync.download(function(err) {
                error = err;
            });

            $timeout.flush();
            $httpBackend.flush();

            waitsFor(function() {
                return (typeof(error) != 'undefined');
            }, 5000);

            expect(error).toBe(null);
        }));
    });
});
