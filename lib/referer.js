'use strict';

var URL = require('url');
var debug = require('debug')('proxyReferer');

module.exports = function(config) {

    function proxyReferer(data) {
        var ref, uri;
        // overwrite the referer with the correct referer
        if (data.headers.referer) {
            uri = URL.parse(data.headers.referer);
            if (config.domainPrefixing) {
                ref = data.headers.referer
                        .substring(data.headers.referer.indexOf('://') + 3, data.headers.referer.lastIndexOf(config.domain) - 1)
                        .replace('h-t-t-p-s.', 'https://')
                        .replace('h-t-t-p.', 'http://');
            } else {
                if (uri.path.substr(0, config.prefix.length) == config.prefix) {
                    ref = uri.path.substr(config.prefix.length);
                }
            }
            if (ref) {
                debug('rewriting referer from %s to %s', ref, data.headers.referer);
                data.headers.referer = ref;
            }
        }
    }

    return proxyReferer;
};
