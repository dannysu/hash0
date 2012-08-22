(function() {

var encryptPassword = '123456';

var configs = new Array();

var settings = false;
var mobile = false;

function defined(value) {
    if (typeof(value) == 'undefined') {
        return false;
    }
    return true;
}

function findConfig(domain) {
    for (var i = 0; i < configs.length; i++) {
        if (configs[i].domain == domain) {
            return configs[i];
        }
    }
    return null;
}

function init() {

    // Load configs from local storage if available
    if (defined(localStorage['configs'])) {
        configs = JSON.parse(localStorage['configs']);
    }

    // TODO: fetch configs from server

    $('#submit').bind('click', function() {
        var domain = $('#domain').val();
        var param = $('#param').val();
        var master = $('#master').val();
        var length = $('#length').val();
        var symbol = $('#symbol').val();

        if (domain == '') {
            domain = param;
        }

        // Generate different salt per site to make master password more secure
        var salt = ''+CryptoJS.lib.WordArray.random(128/8);
        var number = 0;
        var config = findConfig(domain);
        if (config == null) {
            // If this is a new site, then create config for it
            config = {
                'domain': domain,
                'param': param,
                'salt': salt,
                'number': number,
                'symbol': symbol,
                'length': length,
            };
            configs.push(config);
        } else {
            if (defined(config.salt)) {
                salt = config.salt;
            }
            if (defined(config.number)) {
                number = config.number;
            }
            if (defined(config.symbol)) {
                symbol = config.symbol;
            }
            if (defined(config.length)) {
                length = config.length;
            }
        }

        // Generate HMAC-SHA512 as the basis for generating password
        var hmac = ''+CryptoJS.HmacSHA512(param+number, salt+master);

        var part1 = hmac.substr(0, length);
        var part2 = hmac.substr(hmac.length - length, length);

        var i = 0;
        var part3 = $.map(part1, function(c) {
            var charCode = c.charCodeAt(0);
            if (charCode % 2 == 0) {
                charCode = charCode + part2.charCodeAt(i)
            }

            if (charCode >= 128 && symbol == "on") {
                if (charCode % 2 == 0) {
                    charCode = charCode % 15 + 33;
                }
                else {
                    charCode = charCode % 6 + 91;
                }
            }
            else {
                charCode = charCode % 128 + 33;
                if (
                    charCode >= 48 && charCode <= 57 &&
                    charCode >= 65 && charCode <= 90 &&
                    charCode >= 97 && charCode <= 122
                ) {
                }
                else if (charCode % 3 == 0) {
                    charCode = charCode % 26 + 97;
                }
                else if (charCode % 3 == 1) {
                    charCode = charCode % 10 + 48;
                }
                else {
                    charCode = charCode % 26 + 65;
                }
            }

            var newChar = String.fromCharCode(charCode);
            i++;
            return newChar;
        });

        var password = part3.join('');

        $('#output').val(password);
        $('#master').val('');
        $('#result').trigger('expand');
        $('#settings').trigger('collapse');

        // Update local storage
        localStorage['configs'] = JSON.stringify(configs);

        // TODO: Encrypt and update server
        var encrypted = sjcl.encrypt(encryptPassword, localStorage['configs']);
    });

    $('#settingsbtn').bind('click', function() {
        if (settings) {
            $('#settings').trigger('collapse');
        } else {
            $('#settings').trigger('expand');
        }
        settings = !settings;
    });

    if (defined(chrome) && defined(chrome.tabs)) {
        chrome.tabs.getSelected(null, function(tab) {
            var domain = tab.url.match(/:\/\/(.[^\/]+)/)[1];
            $('#domain').val(domain);

            // Use stored param if there is one.
            // This allows mapping of multiple domains to the same param.
            // E.g. amazon.com and amazon.ca can both use the same param.
            var config = findConfig(domain);
            if (config != null) {
                if (defined(config.param)) {
                    $('#param').val(config.param);
                } else {
                    $('#param').val(domain);
                }
            } else {
                $('#param').val(domain);
            }
        });
    }
}

if (navigator.userAgent.match(/Windows Phone/i)) {
    mobile = true;
    $(document).bind('pageinit', init);
} else {
    $(document).ready(init);
}

})();
