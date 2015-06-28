(function() {
    var likelyString = function(value) {
        value = value.toLowerCase();

        if (value.indexOf('user') >= 0 ||
            value.indexOf('email') >= 0 ||
            value.indexOf('login') >= 0) {

            return true;
        }

        return false;
    };

    var siblingIndicatesLikelyCandidate = function(sibling) {
        if (!sibling) {
            return false;
        }

        var tagName = sibling.tagName.toLowerCase();
        if (tagName == 'label' ||
            tagName == 'span' ||
            tagName == 'div') {

            if (likelyString(sibling.innerHTML)) {
                return true;
            }
        }
        return false;
    };

    var isLikelyUsernameInput = function(input) {
        var inputType = input.type.toLowerCase();

        if (inputType != 'text' &&
            inputType != 'email') {

            return false;
        }

        var indicators = [];

        indicators.push((input.id || '').toLowerCase());
        indicators.push((input.name || '').toLowerCase());
        indicators.push((input.placeholder || '').toLowerCase());
        indicators.push((input.className || '').toLowerCase());

        var i;
        for (i = 0; i < indicators.length; i++) {
            if (likelyString(indicators[i])) {
                return true;
            }
        }

        // If we arrive at this point, that means the <input> itself doesn't
        // indicate whether it's a username field. Let's look at sibling
        // elements for clues.

        // Check previous sibling since typically the label comes before
        if (siblingIndicatesLikelyCandidate(input.previousElementSibling)) {
            return true;
        }

        // Check next sibling. Sometimes label comes after but way less frequently.
        if (siblingIndicatesLikelyCandidate(input.nextElementSibling)) {
            return true;
        }

        var parentElement = input.parentElement;
        if (parentElement.tagName.toLowerCase() == 'td') {
            // Check if there are sibling TD to look at
            sibling = parentElement.previousElementSibling;
            if (sibling) {
                if (likelyString(sibling.innerHTML)) {
                    return true;
                }
            }
            else {
                // No siblings, so go one more level up. Should get to <tr>.
                parentElement = parentElement.parentElement;
                if (parentElement.tagName.toLowerCase() == 'tr') {
                    // Check the previous row
                    sibling = parentElement.previousElementSibling;
                    if (sibling) {
                        if (sibling.children.length > 0) {
                            var td = sibling.children[0];
                            if (td.children.length > 0) {
                                if (likelyString(td.children[0].innerHTML)) {
                                    return true;
                                }
                            }
                        }
                    }
                    else {
                        // No previous row. Give up.
                    }
                }
            }
        }

        return false;
    };

    var findUsernameInput = function(inputs, passwordInputIndex) {
        // Look in the inputs couple before password to see if there are
        // likely candidates.

        var minIndex = Math.max(0, passwordInputIndex - 4);
        var likelyInputs = inputs.slice(minIndex, passwordInputIndex);
        var i;
        var input;

        for (i = likelyInputs.length - 1; i >= 0; i--) {
            input = likelyInputs[i];

            if (isLikelyUsernameInput(input)) {
                return input;
            }
        }
    };

    var injectUsername = function(username) {
        if (!username) {
            return;
        }

        var i;

        // Need to guess at which input field is the username field.
        //
        // We'll do this by finding all the password fields, and then check
        // input fields in its vicinity to find likely candidates.

        var inputs = [].slice.call(document.getElementsByTagName('input'));
        inputs = inputs.filter(function(input) {
            var type = input.type.toLowerCase();
            if (type == 'password' || type == 'text' || type == 'email') {
                return true;
            }
            return false;
        });

        for (i = 0; i < inputs.length; i++) {
            if (inputs[i].type.toLowerCase() == 'password') {
                var usernameInput = findUsernameInput(inputs, i);
                if (usernameInput) {
                    usernameInput.value = username;
                }
            }
        }
    };

    var injectPassword = function(password) {
        if (!password) {
            return;
        }

        var inputs = document.getElementsByTagName('input');
        var i;

        for (i = 0; i < inputs.length; i++) {
            if (inputs[i].type.toLowerCase() == 'password') {
                inputs[i].value = password;
            }
        }
    };

    if (chrome && chrome.runtime) {
        // Google Chrome
        chrome.runtime.onMessage.addListener(function(message) {
            var username = message.username;
            var password = message.password;

            injectPassword(password);
            injectUsername(username);
        });
    }
    else if (self && self.port) {
        // Firefox
        self.port.on("username", function(username) {
            injectUsername(username);
        });
        self.port.on("password", function(password) {
            injectPassword(password);
        });
    }
})();
