(function() {

var charsets = new Array(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`~!@#$%^&*()_-+={}|[]\\:\";'<>?,./"
);

var configs = new Array();
var downloadedConfigs = '';

var settings = false;
var mobile = false;

function defined(value) {
    if (typeof(value) == 'undefined') {
        return false;
    }
    return true;
}

function updateConfig(param, config) {
    for (var i = 0; i < configs.length; i++) {
        if (configs[i].param == param) {
            configs.splice(i, 1, config);
            break;
        }
    }
}

function findConfig(param) {
    for (var i = 0; i < configs.length; i++) {
        if (configs[i].param == param) {
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

    // Add param input box either in settings area or on front page.
    // On desktop, the param box can be hidden to simplify the UI.
    var paramLocation = "#desktop_param";
    if (mobile) {
        paramLocation = "#mobile_param";
    }
    $(paramLocation).append('<label for="param">Parameter:</label><input type="text" id="param" name="param" value="">').trigger("create");

    // Load configs from local storage if available
    if (defined(localStorage['configs'])) {
        configs = JSON.parse(localStorage['configs']);
    }

    // Prompt for master password used to generate an encryption password
    if (!defined(localStorage['encryptionPassword'])) {
        // Prompt for encryption password
        var encryptionPassword = prompt('Enter your master password');
        if (encryptionPassword != null) {
            localStorage['encryptionPassword'] = generatePassword('on', 30, 'zerobin', '1337', 'saltysnacks', encryptionPassword);
        }
    }

    // Prompt for settings URL if not known (only relevant if encryption password is given)
    if (defined(localStorage['encryptionPassword'])) {
        var encryptionPassword = localStorage['encryptionPassword'];

        var settingsURL = null;
        var initialSetup = false;
        if (defined(localStorage['settingsURL'])) {
            settingsURL = localStorage['settingsURL'];
        } else {
            // Prompt for settings URL
            var settingsURL = prompt('Enter settings URL for synchronization');
            if (settingsURL != null) {
                localStorage['settingsURL'] = settingsURL;
            }
            initialSetup = true;
        }

        if (settingsURL != null) {
            $.ajax({
                url: settingsURL,
                success: function(result) {
                    if (result.success) {
                        // Decrypt settings
                        var decrypted = sjcl.decrypt(encryptionPassword, result.data);
                        configs = JSON.parse(decrypted);
                        localStorage['configs'] = decrypted;
                        downloadedConfigs = decrypted;
                    } else {
                        if (!initialSetup) {
                            alert('Failed to synchronize settings');
                        }
                    }
                },
                error: function() {
                    if (!initialSetup) {
                        alert('Failed to synchronize settings');
                    }
                },
                dataType: 'json'
            });
        }
    }

    $('#submit').bind('click', function() {
        var param = $('#param').val();
        var master = $('#master').val();
        var length = $('#length').val();
        var symbol = $('#symbol').val();
        var newpassword = $('#newpassword').val();

        // Generate different salt per site to make master password more secure
        var salt = ''+CryptoJS.lib.WordArray.random(128/8);
        var number = 0;
        var config = findConfig(param);
        if (config == null || newpassword == 'on') {
            newconfig = {
                'param': param,
                'salt': salt,
                'number': number,
                'symbol': symbol,
                'length': length,
            };

            if (config != null) {
                // Allow creation of new password for a particular site
                number = newconfig.number = config.number + 1;
                updateConfig(param, newconfig);
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

        // Encrypt and update server if configs have changed
        if (localStorage['configs'] != downloadedConfigs) {
            if (defined(localStorage['encryptionPassword']) && defined(localStorage['settingsURL'])) {
                var encryptionPassword = localStorage['encryptionPassword'];
                var encrypted = sjcl.encrypt(encryptionPassword, localStorage['configs']);

                var settingsURL = localStorage['settingsURL'];
                $.ajax({
                    url: settingsURL,
                    success: function(data) {
                        if (!data.success) {
                            alert('Failed to synchronize settings');
                        }
                    },
                    error: function(a, status) {
                        alert('Failed to synchronize settings ' + status);
                    },
                    dataType: 'json',
                    type: 'POST',
                    data: encrypted,
                    processData: false
                });
            }
        }

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
            $('#param').val(domain);
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
