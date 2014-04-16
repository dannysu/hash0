(function() {

var charsets = new Array(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`~!@#$%^&*()_-+={}|[]\\:\";'<>?,./"
);

var mappings = new Array();

var configs = new Array();
var downloadedConfigs = '';

var settings = false;
var mobile = false;

var master_password = null;

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

function findConfig(param, partial_match) {
    for (var i = 0; i < configs.length; i++) {
        if (configs[i].param == param) {
            return configs[i];
        }

        if (partial_match && configs[i].param.indexOf(param) >= 0) {
            return configs[i];
        }
    }
    return null;
}

function findMapping(from) {
    for (var i = 0; i < mappings.length; i++) {
        if (mappings[i].from == from) {
            return mappings[i];
        }
    }
    return null;
}

function generatePassword(symbol, length, param, number, salt, master) {

    var key = CryptoJS.PBKDF2(master, param+number+salt, { hasher: CryptoJS.algo.SHA512, keySize: 512/32, iterations: 1000 });

    var charset = charsets[0];
    if (symbol == 'on') {
        charset = charsets[1];
    }

    var password = PasswordMaker_HashUtils.rstr2any(
        PasswordMaker_HashUtils.binb2rstr(key.words),
        charset
    );

    // truncate password to desired length
    password = password.substring(0, length);

    return password;
}

function downloadSettings(callback) {
    if (!defined(localStorage['settingsURL']) ||
        localStorage['settingsURL'] == '') {
        // No-op if these are not defined
        return callback(null);
    }

    var settingsURL = localStorage['settingsURL'];
    $.ajax({
        url: settingsURL,
        success: function(result) {
            var loaded = false;
            if (result.success) {
                var urldecoded = decodeURIComponent(result.data);
                var encrypted = JSON.parse(urldecoded);
                if (encrypted.hash0) {
                    var salt = encrypted.hash0.salt;
                    delete encrypted.hash0;

                    var encryptionKey = generatePassword('on', 30, 'hash0.dannysu.com', '1', salt, master_password);

                    // Decrypt settings
                    var decrypted = sjcl.decrypt(encryptionKey, JSON.stringify(encrypted));
                    var json = JSON.parse(decrypted);

                    configs = json.configs;
                    downloadedConfigs = JSON.stringify(json.configs);
                    localStorage['configs'] = downloadedConfigs;

                    mappings = json.mappings;
                    localStorage['mappings'] = JSON.stringify(json.mappings);

                    loaded = true;
                }
            }

            if (!loaded) {
                return callback('Failed to synchronize settings');
            }
            return callback(null);
        },
        error: function(err) {
            if (err.status == 404) {
                callback(null);
            }
            else {
                callback('Failed to synchronize settings');
            }
        },
        dataType: 'json'
    });
}

function uploadSettings(force, callback) {
    if (!defined(localStorage['settingsURL']) ||
        localStorage['settingsURL'] == '') {
        // No-op if these are not defined
        return callback('no settings URL');
    }

    if (!force && localStorage['configs'] == downloadedConfigs) {
        // No-op if configs have not changed
        return callback(null);
    }

    if (!defined(localStorage['mappings'])) {
        localStorage['mappings'] = JSON.stringify(mappings);
    }

    var data = '{"mappings":'+localStorage['mappings']+',"configs":'+localStorage['configs']+'}';

    // Let's use a different encryption key each time we upload
    var salt = getSalt(true);
    var encryptionKey = generatePassword('on', 30, 'hash0.dannysu.com', '1', salt, master_password);
    var encrypted = sjcl.encrypt(encryptionKey, data);
    encrypted = JSON.parse(encrypted);
    encrypted.hash0 = {};
    encrypted.hash0.salt = salt;

    var settingsURL = localStorage['settingsURL'];
    $.ajax({
        url: settingsURL,
        success: function(result) {
            if (!result.success) {
                return callback('Failed to synchronize settings');
            }
            callback(null);
        },
        error: function(a, status) {
            callback(a);
        },
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(encrypted),
        processData: false
    });
}

function initWithUrl(url) {
    var domain = url.match(/:\/\/(.[^\/]+)/);
    if (domain !== null) {
        domain = domain[1];
    }
    else {
        domain = '';
    }
    $('#param').val(domain);

    var key = domain;
    var mapping = findMapping(key);
    if (mapping !== null) {
        key = mapping.to;
        $('#param').val(key);
    }

    var config = findConfig(key);
    if (config !== null) {
        if (defined(config.notes)) {
            $('#notes').val(config.notes);
        }
        $('#submit').parent().find('span[class=ui-btn-text]').html('submit');
    } else {
        $('#submit').parent().find('span[class=ui-btn-text]').html('create');
    }

}

function getSalt(avoid_user_input) {
    var words = null;
    var sigBytes = 128/8;

    // First check if browser provides a CSPRNG
    if ((window && Uint32Array) && ((window.crypto && window.crypto.getRandomValues) || (window.msCrypto && window.msCrypto.getRandomValues))) {
        try {
            words = sjcl.random.randomWords(sigBytes/4, 10);
        }
        catch(e) {
            // If something goes wrong then salt remains null
        }
    }

    // Otherwise, prompt user to randomly type a whole bunch of characters
    if (words === null) {
        if (avoid_user_input) {
            words = CryptoJS.lib.WordArray.random(sigBytes).words;
        }
        else {
            // Keep on adding entropy until there's enough
            while (!sjcl.random.isReady(10)) {
                var randomTyping = prompt("Please randomly type random characters in order to generate random number");
                if (randomTyping === null) {
                    break;
                }
                sjcl.random.addEntropy(randomTyping);
            }

            try {
                words = sjcl.random.randomWords(sigBytes/4, 10);
            }
            catch(e) {
                alert("Couldn't get a good random number to use for salt. Fall back on Math.random().");
                words = CryptoJS.lib.WordArray.random(sigBytes).words;
            }
        }
    }

    var hexChars = [];
    for (var i = 0; i < sigBytes; i++) {
        var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        hexChars.push((bite >>> 4).toString(16));
        hexChars.push((bite & 0x0f).toString(16));
    }
    return hexChars.join('');
}

function init() {
    // Load configs from local storage if available
    if (defined(localStorage['configs'])) {
        configs = JSON.parse(localStorage['configs']);
    }
    // Load mappings from local storage if available
    if (defined(localStorage['mappings'])) {
        mappings = JSON.parse(localStorage['mappings']);
    }

    // If master password for encryption or settings URL are not configured yet,
    // go configure them first
    if (!defined(localStorage['settingsURL'])) {
        $.mobile.changePage("#setup");
    } else {
        $.mobile.changePage("#password");
    }

    $('#submit').bind('click', function() {
        var notes = $('#notes').val();
        var param = $('#param').val();
        var length = $('#length').val();
        var symbol = $('#symbol').val();
        var newpassword = $('#newpassword').val();

        var salt = null;
        var number = 0;

        // Don't use unique salt per site if there is nowhere to store it
        if (!defined(localStorage['settingsURL']) ||
            localStorage['settingsURL'] == '') {
            salt = '';
        } else {
            var mapping = findMapping(param);
            if (mapping != null) {
                param = mapping.to;
            }

            var config = findConfig(param);
            if (config == null || newpassword == 'on') {
                // Generate different salt per site to make master password more secure
                salt = getSalt(false);

                var newconfig = {
                    'param': param,
                    'salt': salt,
                    'number': number,
                    'symbol': symbol,
                    'length': length,
                    'notes': notes,
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

                config.notes = notes;
            }
        }

        var password = generatePassword(symbol, length, param, number, salt, master_password);

        $('#output').val(password);
        $('#result').trigger('expand');
        $('#settings').trigger('collapse');

        password = password.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/"/g, '\\\"');
        var code = "                                              \
            var inputs = document.getElementsByTagName('input');  \
            var password = '"+password+"';                        \
            for (var i = 0; i < inputs.length; i++) {             \
                if (inputs[i].type.toLowerCase() == 'password') { \
                    inputs[i].value = password;                   \
                }                                                 \
            }                                                     \
        ";

        if (defined(window.chrome) && defined(window.chrome.tabs)) {
            // Insert password directly into password field for Google Chrome
            window.chrome.tabs.executeScript({
                code: code
            });
        }
        else if (defined(window.addon)) {
            window.addon.port.emit("password", code);
        }

        // Update local storage
        if (salt != '') {
            localStorage['configs'] = JSON.stringify(configs);
        }

        // Encrypt and update server if configs have changed
        uploadSettings(false, function(err) {
            if (err) {
                alert('Failed to synchronize settings');
            }
        });
    });

    $('#settingsbtn').bind('click', function() {
        if (settings) {
            $('#settings').trigger('collapse');
        } else {
            $('#settings').trigger('expand');
        }
        settings = !settings;
    });

    $('#setup_cancel, #map_cancel').bind('click', function() {
        if (defined(localStorage['settingsURL'])) {
            $.mobile.changePage('#generator');
        }
        else {
            $.mobile.changePage('#password');
        }
    });

    $('#setup_save').bind('click', function() {
        var upload = false;

        // If there are existing settings, then user might be trying to migrate to a different URL.
        // In that case, prompt and ask.
        if (defined(localStorage['settingsURL'])) {

            // If there is, then ask whether to migrate data
            if (confirm('Migrate existing data to new location?')) {
                // Migrating data is just uploading what's currently there to
                // another location and with potentially new encryption password
                upload = true;
            }
        }

        master_password = $('#setup_master').val();
        $('#setup_master').val('');

        var url = $('#setup_url').val();
        localStorage['settingsURL'] = url;

        if (upload) {
            uploadSettings(true, function(err) {
                if (err) {
                    $('#setup_error').html('Failed to migrate settings');
                }
                else {
                    $.mobile.changePage('#generator');
                }
            });
        }
        else {
            downloadSettings(function(err) {
                if (err) {
                    $('#setup_error').html('Failed to download settings');
                }
                else {
                    $.mobile.changePage('#generator');
                }
            });
        }
    });

    $('#map_save').bind('click', function() {

        var from = $('#map_from').val();
        var to = $('#map_to').val();

        var newmapping = {
            'from': from,
            'to': to,
        };

        mappings.push(newmapping);
        localStorage['mappings'] = JSON.stringify(mappings);

        uploadSettings(true, function(err) {
            if (err) {
                $('#map_error').html('Failed to save settings');
            }
            else {
                $.mobile.changePage('#generator');
            }
        });
    });

    $('#param').change(function(e) {
        var config = findConfig(this.value, true);
        if (config) {
            alert("Found config for '" + config.param + "'");
        }
    });

    $('#password_next').bind('click', function() {
        // Store master password in memory
        master_password = $('#master').val();
        $('#master').val('');

        downloadSettings(function(err) {
            if (err) {
                $('#password_error').html('Failed to download settings');
            }
            else {
                $.mobile.changePage('#generator');
            }
        });
    });

    if (defined(window.chrome) && defined(window.chrome.tabs)) {
        // Google Chrome specific code
        window.chrome.tabs.getSelected(null, function(tab) {
            initWithUrl(tab.url);
        });
    }
    else if (defined(window.addon)) {
        window.addon.port.emit('init');
        window.addon.port.on('url', function(url) {
            initWithUrl(url);
        });
    }
}

if (navigator.userAgent.match(/Windows Phone/i) ||
    navigator.userAgent.match(/Android/i)) {
    mobile = true;
    $(document).bind('pageinit', init);
} else {
    $(document).ready(init);
}


if(defined(window.addon)) {
    // Firefox specific code
    $(document.body).css('min-height', '335px');
    $(document.body).css('overflow-y', 'hidden');
}

})();
