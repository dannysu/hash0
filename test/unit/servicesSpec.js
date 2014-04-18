'use strict';

/* jasmine specs for services go here */

describe('service', function() {
    beforeEach(function() {
        module('hash0.services');
        var storage = {};

        var mockWindow = {};
        mockWindow.localStorage = {};
        mockWindow.localStorage.getItem = function(key) {
            return storage[key];
        };
        mockWindow.localStorage.setItem = function(key, value) {
            storage[key] = value;
        };

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

    /*
    describe('sync', function() {
        it('should initially be clean', inject(function(sync) {
            console.log(sync);
            //expect(metadata.isDirty()).toBe(false);
        }));
    });
    */

    /*
    describe('crypto', function() {
        it('should initially be clean', inject(function(crypto) {
            console.log(crypto);
            //expect(metadata.isDirty()).toBe(false);
        }));
    });
    */
});
