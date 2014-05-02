'use strict';

/* https://github.com/angular/protractor/blob/master/docs/getting-started.md */

function waitForUrlToChangeTo(urlRegex) {
    var currentUrl;

    return browser.getCurrentUrl().then(function storeCurrentUrl(url) {
        currentUrl = url;
    }).then(function () {
        return browser.wait(function () {
            return browser.getCurrentUrl().then(function (url) {
                return urlRegex.test(url);
            });
        });
    });
}

function waitForInputValueChange(model) {
    var currentValue;

    return element(by.model(model)).getAttribute('value').then(function(text) {
        currentValue = text;
    }).then(function () {
        return browser.wait(function () {
            return element(by.model(model)).getAttribute('value').then(function(text) {
                return (currentValue != text);
            });
        });
    });
}

var storageUrl = 'https://hash0-test.appspot.com/e2e_test_' + new Date().getTime();

describe('hash0', function() {

    describe('first run', function() {
        beforeEach(function() {
            browser.get('index.html');
        });

        it('should automatically redirect to /setup initially', function() {
            expect(browser.getCurrentUrl()).toMatch("/setup");
        });
    });

    describe('setup', function() {
        it('should navigate to /generation after entering master password and storage url', function() {
            browser.get('index.html');
            expect(browser.getCurrentUrl()).toMatch("/setup");

            element(by.model('masterPassword')).sendKeys('test');
            element(by.model('storageUrl')).sendKeys(storageUrl);

            element(by.id('save')).click();

            waitForUrlToChangeTo(/\/generation$/);

            expect(browser.getCurrentUrl()).toMatch("/generation");
        });

        it('first time generating for param succeeds', function() {
            element(by.model('param')).sendKeys('test');
            element(by.id('generate')).click();

            waitForInputValueChange('result');

            element(by.model('result')).getAttribute('value').then(function(text) {
                expect(text).not.toBe(null);
                expect(text).not.toBe('');
            });
        });
    });
});
