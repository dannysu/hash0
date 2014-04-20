'use strict';

/* jasmine specs for controllers go here */

describe('controllers', function(){
    beforeEach(function() {
        module('hash0.controllers');
        module('hash0.services');
    });

    it('should have all expected controllers', inject(function($controller, $rootScope, metadata) {
        var scope = $rootScope.$new();
        var dispatcherCtrl = $controller('DispatcherCtrl', {
            '$scope': scope,
            'metadata': metadata
        });
        expect(dispatcherCtrl).toBeDefined();

        var setupCtrl = $controller('SetupCtrl', {
            '$scope': scope
        });
        expect(setupCtrl).toBeDefined();

        var unlockCtrl = $controller('UnlockCtrl', {
            '$scope': scope
        });
        expect(unlockCtrl).toBeDefined();

        var generationCtrl = $controller('GenerationCtrl', {
            '$scope': scope
        });
        expect(generationCtrl).toBeDefined();

        var mappingCtrl = $controller('MappingCtrl', {
            '$scope': scope
        });
        expect(mappingCtrl).toBeDefined();
    }));
});
