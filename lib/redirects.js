'use strict';

var debug = require('debug')('unblocker:redirects');

var url   = require('url');

module.exports = function(config) {
    function proxyRedirects(data) {
        var location;

        if (config.domainPrefixing) {
            if (data.headers.location && (data.headers.location.substr(0, 4) === 'http' || data.headers.location.substr(0, 2) === '//')) {
                var uri;
                if(data.headers.location.substr(0, 2) === '//') {
                    uri = url.parse((data.url.substr(0, 5) === 'https' ? 'https:' : 'http:')+data.headers.location);
                } else {
                    uri = url.parse(data.headers.location);
                }

                if(uri.port) {
                    uri.port = parseInt(uri.port);
                    if(uri.port === 443 && uri.protocol === 'https:') {
                        uri.port = null;
                    } else if(uri.port === 80) {
                        uri.port = null;
                    }
                }
                var protocol = data.url.indexOf('https') > -1 ? 'https://' : 'http://';
                var rmString = protocol + uri.hostname + '/';
                var searchString = data.headers.location.replace(rmString, '');
                debug('search', uri.search);
                debug('path', uri.pathname);
                location = 'http://h-t-t-p' +
                    (data.headers.location.substr(0, 2) === '//' ?
                        (data.url.substr(0, 5) === 'https' ? '-s.' : '.') :
                        (data.headers.location.substr(0, 5) === 'https' ? '-s.' : '.')) +
                    uri.hostname + (uri.port ? '.port-' + uri.port + '-port.' : '.') + config.domain + uri.pathname +
                    (uri.search ? uri.search : '');
                //If path contains # it doesn't get added, fix below
                if (!uri.search && uri.pathname === '/'){
                    location += (searchString ? searchString : '');
                }
            }
        } else {
            // fix absolute url redirects
            // (relative redirects will be re-redirected to the correct path, and they're disallowed by the RFC anyways)
            // '//' redirects makes unblocker add the http/https before appending the url to it
            if (data.headers.location && (data.headers.location.substr(0, 4) == 'http' || data.headers.location.substr(0, 2) == '//')) {
                location = data.clientRequest.thisSite() +
                    (data.headers.location.substr(0, 2) == '//' ? (data.url.substr(0, 5) === 'https' ? 'https:' : 'http:') : '') +
                    data.headers.location;
            }
        }
        if(location) {
            data.redirectUrl = (data.headers.location.substr(0, 2) == '//' ? (data.url.substr(0, 5) === 'https' ? 'https:' : 'http:') : '') +
                    data.headers.location; // the cookie handler uses this to know to possibly copy cookies between protocols or subdomains
            debug('rewriting redirect from %s to %s', data.headers.location, location);
            data.headers.location = location;
        }
    }

    return proxyRedirects;
};
