var redirect = require('../lib/redirects.js');
var test = require('tap').test;

var regularRedirect = redirect({domainPrefixing: false});

var domainPrefixRedirect = redirect({domainPrefixing: true, domain: 'foobar.com'});

test('should correctly redirect with http://', function(t) {
    var expected = 'http://foobar.com/proxy/http://example.com/not-a-test/';
    var data = {
        url: 'http://example.com/test/',
        headers: {
            location: 'http://example.com/not-a-test/'
        },
        clientRequest: {
            thisSite: function() {
                return 'http://foobar.com/proxy/';
            }
        }
    };
    regularRedirect(data);
    t.equal(data.headers.location, expected);
    t.end();
});

test('should correctly redirect with //', function(t) {
    var expected = 'http://foobar.com/proxy/http://example.com/not-a-test/';
    var data = {
        url: 'http://example.com/test/',
        headers: {
            location: '//example.com/not-a-test/'
        },
        clientRequest: {
            thisSite: function() {
                return 'http://foobar.com/proxy/';
            }
        }
    };
    regularRedirect(data);
    t.equal(data.headers.location, expected);
    t.end();
});

test('should correctly redirect with // and https', function(t) {
    var expected = 'http://foobar.com/proxy/https://example.com/not-a-test/';
    var data = {
        url: 'https://example.com/test/',
        headers: {
            location: '//example.com/not-a-test/'
        },
        clientRequest: {
            thisSite: function() {
                return 'http://foobar.com/proxy/';
            }
        }
    };
    regularRedirect(data);
    t.equal(data.headers.location, expected);
    t.end();
});


// Tests with domainprefixing!

test('should domainprefix correctly redirect with http://', function(t) {
    var expected = 'http://h-t-t-p.example.com.foobar.com/not-a-test/';
    var data = {
        url: 'http://example.com/test/',
        headers: {
            location: 'http://example.com/not-a-test/'
        },
        clientRequest: {
            thisSite: function() {
                return 'http://foobar.com/proxy/';
            }
        }
    };
    domainPrefixRedirect(data);
    t.equal(data.headers.location, expected);
    t.end();
});

test('should domainprefix correctly redirect with https://', function(t) {
    var expected = 'http://h-t-t-p-s.example.com.foobar.com/not-a-test/';
    var data = {
        url: 'https://example.com/test/',
        headers: {
            location: 'https://example.com/not-a-test/'
        },
        clientRequest: {
            thisSite: function() {
                return 'http://foobar.com/proxy/';
            }
        }
    };
    domainPrefixRedirect(data);
    t.equal(data.headers.location, expected);
    t.end();
});

test('should domainprefix correctly redirect with //', function(t) {
    var expected = 'http://h-t-t-p.example.com.foobar.com/not-a-test/';
    var data = {
        url: 'http://example.com/test/',
        headers: {
            location: '//example.com/not-a-test/'
        },
        clientRequest: {
            thisSite: function() {
                return 'http://foobar.com/proxy/';
            }
        }
    };
    domainPrefixRedirect(data);
    t.equal(data.headers.location, expected);
    t.end();
});

test('should domainprefix correctly redirect with // and https', function(t) {
    var expected = 'http://h-t-t-p-s.example.com.foobar.com/not-a-test/';
    var data = {
        url: 'https://example.com/test/',
        headers: {
            location: '//example.com/not-a-test/'
        },
        clientRequest: {
            thisSite: function() {
                return 'http://foobar.com/proxy/';
            }
        }
    };
    domainPrefixRedirect(data);
    t.equal(data.headers.location, expected);
    t.end();
});


test('should not domainprefix since redirect with path only', function(t) {
    var expected = '/not-a-test/';
    var data = {
        url: 'http://example.com/test/',
        headers: {
            location: '/not-a-test/'
        },
        clientRequest: {
            thisSite: function() {
                return 'http://foobar.com/proxy/';
            }
        }
    };
    domainPrefixRedirect(data);
    t.equal(data.headers.location, expected);
    t.end();
});
