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

    var key = ''+CryptoJS.PBKDF2(master, salt, { hasher: CryptoJS.algo.SHA512, keySize: 512/32, iterations: 100 });
    var hmac = CryptoJS.HmacSHA512(param+number, key);

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

function downloadSettings() {
    if (!defined(localStorage['encryptionPassword']) ||
        !defined(localStorage['settingsURL']) ||
        localStorage['settingsURL'] == '') {
        // No-op if these are not defined
        return;
    }

    var encryptionPassword = localStorage['encryptionPassword'];
    var settingsURL = localStorage['settingsURL'];
    $.ajax({
        url: settingsURL,
        success: function(result) {
            if (result.success) {
                // Decrypt settings
                var decrypted = sjcl.decrypt(encryptionPassword, result.data);
                var json = JSON.parse(decrypted);

                configs = json.configs;
                downloadedConfigs = JSON.stringify(json.configs);
                localStorage['configs'] = downloadedConfigs;

                mappings = json.mappings;
                localStorage['mappings'] = JSON.stringify(json.mappings);
            } else {
                if (defined(window.addon)) {
                    console.log('Failed to synchronize settings');
                }
                else {
                    alert('Failed to synchronize settings');
                }
            }
        },
        error: function() {
            if (defined(window.addon)) {
                console.log('Failed to synchronize settings');
            }
            else {
                alert('Failed to synchronize settings');
            }
        },
        dataType: 'json'
    });
}

function uploadSettings(force) {
    if (!defined(localStorage['encryptionPassword']) ||
        !defined(localStorage['settingsURL']) ||
        localStorage['settingsURL'] == '') {
        // No-op if these are not defined
        return;
    }

    if (!force && localStorage['configs'] == downloadedConfigs) {
        // No-op if configs have not changed
        return;
    }

    if (!defined(localStorage['mappings'])) {
        localStorage['mappings'] = JSON.stringify(mappings);
    }

    var data = '{"mappings":'+localStorage['mappings']+',"configs":'+localStorage['configs']+'}';

    var encryptionPassword = localStorage['encryptionPassword'];
    var encrypted = sjcl.encrypt(encryptionPassword, data);

    var settingsURL = localStorage['settingsURL'];
    $.ajax({
        url: settingsURL,
        success: function(result) {
            if (!result.success) {
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
    // Load mappings from local storage if available
    if (defined(localStorage['mappings'])) {
        mappings = JSON.parse(localStorage['mappings']);
    }

    // If master password for encryption or settings URL are not configured yet,
    // go configure them first
    if (!defined(localStorage['encryptionPassword']) ||
        !defined(localStorage['settingsURL'])) {
        $.mobile.changePage("#setup");
    } else {
        downloadSettings();
    }

    $('#submit').bind('click', function() {
        var notes = $('#notes').val();
        var param = $('#param').val();
        var master = $('#master').val();
        var length = $('#length').val();
        var symbol = $('#symbol').val();
        var newpassword = $('#newpassword').val();

        // Generate different salt per site to make master password more secure
        var salt = ''+CryptoJS.lib.WordArray.random(128/8);
        var number = 0;

        // Don't use unique salt per site if there is nowhere to store it
        if (!defined(localStorage['encryptionPassword']) ||
            !defined(localStorage['settingsURL']) ||
            localStorage['settingsURL'] == '') {
            salt = '';
        } else {
            var mapping = findMapping(param);
            if (mapping != null) {
                param = mapping.to;
            }

            var config = findConfig(param);
            if (config == null || newpassword == 'on') {
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

        var password = generatePassword(symbol, length, param, number, salt, master);

        $('#output').val(password);
        $('#master').val('');
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
        uploadSettings(false);

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
        $.mobile.changePage('#generator');
    });

    $('#setup_save').bind('click', function() {
        // generate the encryption password derived from the master password
        var password = $('#setup_master').val();
        localStorage['encryptionPassword'] = generatePassword('on', 30, 'zerobin', '1337', 'saltysnacks', password);

        var url = $('#setup_url').val();
        localStorage['settingsURL'] = url;

        // Check if there is existing settings
        if (defined(localStorage['settingsURL']) &&
            defined(localStorage['encryptionPassword'])) {

            // If there is, then ask whether to migrate data
            if (confirm('Migrate existing data to new location?')) {
                // Migrating data is just uploading what's currently there to
                // another location and with potentially new encryption password
                uploadSettings(true);
            }
            else {
                downloadSettings();
            }
        }
        else {
            downloadSettings();
        }

        $.mobile.changePage('#generator');
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

        uploadSettings(true);

        $.mobile.changePage('#generator');
    });

    $('#param').change(function(e) {
        var config = findConfig(this.value, true);
        if (config) {
            alert("Found config for '" + config.param + "'");
        }
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
