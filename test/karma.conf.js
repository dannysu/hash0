module.exports = function(config){
    config.set({
        basePath : '../',

        files : [
            'bower_components/angular/angular.js',
            'bower_components/angular-route/angular-route.js',
            'bower_components/angular-mocks/angular-mocks.js',
            'app/js/**/*.js',
            'test/unit/**/*.js',
            'app/dependencies/cryptojs-3.1.2/rollups/hmac-sha512.js',
            'app/dependencies/cryptojs-3.1.2/rollups/aes.js',
            'app/dependencies/cryptojs-3.1.2/rollups/pbkdf2.js',
            'app/dependencies/cryptojs-3.1.2/rollups/sha512.js',
            'app/dependencies/sjcl/sjcl.js',
            'app/dependencies/passwordmaker/hashutils.js'
        ],

        autoWatch : true,

        frameworks: ['jasmine'],

        browsers : ['Chrome'],

        plugins : [
            'karma-chrome-launcher',
            'karma-firefox-launcher',
            'karma-jasmine'
        ],

        junitReporter : {
            outputFile: 'test_out/unit.xml',
            suite: 'unit'
        }
  });
};
