(function() {

var charsets = new Array(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`~!@#$%^&*()_-+={}|[]\\:\";'<>?,./"
);

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

function updateConfig(domain, config) {
    for (var i = 0; i < configs.length; i++) {
        if (configs[i].domain == domain) {
            configs.splice(i, 1, config);
            break;
        }
    }
}

function findConfig(domain) {
    for (var i = 0; i < configs.length; i++) {
        if (configs[i].domain == domain) {
            return configs[i];
        }
    }
    return null;
}

function generatePassword(symbol, length, param, number, salt, master) {

    // Generate HMAC-SHA512 as the basis for generating password
    var hmac = CryptoJS.HmacSHA512(param+number, salt+master);

    // Apply 100 rounds of HMAC-SHA512
    for (var i = 0; i < 100; i++) {
        hmac = CryptoJS.HmacSHA512(''+hmac, salt);
    }

    var charset = charsets[0];
    if (symbol == 'on') {
        charset = charsets[1];
    }

    var password = PasswordMaker_HashUtils.rstr2any(
        PasswordMaker_HashUtils.binb2rstr(hmac.words),
        charset
    );

    // truncate password to desired length
    password = password.substring(0, length);

    return password;
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
        var newpassword = $('#newpassword').val();

        if (domain == '') {
            domain = param;
        }

        // Generate different salt per site to make master password more secure
        var salt = ''+CryptoJS.lib.WordArray.random(128/8);
        var number = 0;
        var config = findConfig(domain);
        if (config == null || newpassword == 'on') {
            newconfig = {
                'domain': domain,
                'param': param,
                'salt': salt,
                'number': number,
                'symbol': symbol,
                'length': length,
            };

            if (config != null) {
                // Allow creation of new password for a particular site
                number = newconfig.number = config.number + 1;
                updateConfig(domain, newconfig);
            } else {
                configs.push(newconfig);
            }
        } else {
            // Use cached config values
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

        var password = generatePassword(symbol, length, param, number, salt, master);

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
