var it = require('tap').test,
    getRealUrlPrefixed = require('../lib/get-real-url-prefixed.js');

var config = {
    domainPrefixing: true,
    prefix: false,
    domain: 'example.org'
};

var instance = getRealUrlPrefixed(config);

it("should extract the insecure url", function(t) {
    t.equal(instance('h-t-t-p.example.com.example.org', '/'), 'http://example.com/');
    t.end();
});

it("should extract the secure url", function(t) {
    t.equal(instance('h-t-t-p-s.example.com.example.org', '/'), 'https://example.com/');
    t.end();
});

it("should extract the url with a port", function(t) {
    t.equal(instance('h-t-t-p.example.com.port-1337-port.example.org', '/'), 'http://example.com:1337/');
    t.end();
});


it("should keep querystring data", function(t) {
    t.equal(instance('h-t-t-p.example.com.example.org', '/?foo=bar'), 'http://example.com/?foo=bar');
    t.end();
});

