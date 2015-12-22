'use strict';

var debug = require('debug')('unblocker:headerPrivacy');

module.exports = function( /*config*/ ) {

    function headerPrivacy(data) {
        // trims headers than can reveal the user.
        if (data.headers['x-real-ip']) {
            debug('deleting x-real-ip header');
            delete data.headers['x-real-ip'];
        }
        if (data.headers['x-forwarded-for']) {
            debug('deleting x-forwarded-for header');
            delete data.headers['x-forwarded-for'];
        }
        if (data.headers['x-nginx-proxy']) {
            debug('deleting x-nginx-proxy header');
            delete data.headers['x-nginx-proxy'];
        }
    }

    return headerPrivacy;
};


