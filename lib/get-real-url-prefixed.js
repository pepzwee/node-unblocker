var URL = require('url');

module.exports = function(config) {


    function getRealUrlPrefixed(domain, path) {
        var port = '';
        var re_port = /\.port-([0-9]{1,5})-port\./i;
        if (re_port.test(domain)) {
            port = ':' + domain.match(re_port)[1];
            domain = domain.replace(re_port, '.');
        }
        if (domain.indexOf('h-t-t-p') === 0) {
            if (domain.indexOf('h-t-t-p-s') === 0) {
                return 'https://' + domain.substring(10, domain.lastIndexOf(config.domain) - 1) + port + path;
            } else {
                return 'http://'  + domain.substring(8,  domain.lastIndexOf(config.domain) - 1) + port + path;
            }
        } else { 
            // Handle missing h-t-t-p(-s)
            return 'http://'  + domain.substring(0,  domain.lastIndexOf(config.domain) - 1) + port + path;
        }
    }

    return getRealUrlPrefixed;
};
