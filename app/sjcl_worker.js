importScripts('./dependencies/sjcl/sjcl.js');

onmessage = function(e) {
    var data = e.data;

    // Convert hex string salt into SJCL's bitArray type.
    // Doing so preserves the range of numbers in the salt.
    var saltBitArray = sjcl.codec.hex.toBits(data.salt);
    var key = sjcl.misc.pbkdf2(data.masterPassword, saltBitArray, data.iterations, 512);

    postMessage(key);
};
