module.exports = function(config){
    config.set({
        basePath : '../',

        files : [
            'app/dependencies/angular-1.3.16/angular.min.js',
            'app/dependencies/angular-1.3.16/angular-route.min.js',
            'app/dependencies/angular-1.3.16/angular-mocks.js',
            'app/js/**/*.js',
            'test/unit/**/*.js',
            'app/dependencies/cryptojs-3.1.2/components/core.js',
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
