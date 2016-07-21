/**
 * This file creates a node.js Stream that re-writes chunks of HTML on-the-fly so that all
 * non-relative URLS are prefixed with the given string.
 *
 * For example, If you set the config.prefix to '/proxy/' and pass in this chunk of html:
 *   <a href="http://example.com/">link to example.com</a>
 * It would output this:
 *   <a href="http://h-t-t-p.example.com.configured-domainname/">link to example.com</a>
 *
 * It buffers a small amount of text from the end of each chunk to ensure that it properly
 * handles links that are split between two chunks (packets).
 */

 'use strict';

var URL = require('url');
var Transform = require('stream').Transform;
var debug = require('debug')('unblocker:js-domain-prefixer');

function jsDomainPrefixer(config) {
    var re_document_cookie = /document\.cookie ?=/ig;
    var re_abs_url = /("|')(https?:)\/\/((?:[A-Z0-9-]{1,63}\.){1,125}[A-Z]{2,63})/ig;


    function rewriteDomains(chunk) {

        chunk = chunk.replace(re_document_cookie, "setTimeout(function(){document.cookie = unblockerDomain(unblockerToSet)}, 0);var unblockerToSet =");

        chunk = chunk.replace(re_abs_url, function(match, r1, r2, r3) {
            return r1 + 'http://' + (r2 === 'http:' ? 'h-t-t-p.' : 'h-t-t-p-s.') + r3 + '.' + config.domain;
        });

        return chunk;
    }

    function createStream(uri) {

        return new Transform({
            decodeStrings: false,

            transform: function (chunk, encoding, next) {
                chunk = chunk.toString();

                chunk = rewriteDomains(chunk, uri, config.prefix);

                this.push(chunk);
                next();
            },

            flush: function(done) {
                done();
            }
        });
    }

    function prefixUrls(data) {
        if (['text/javascript',
           'application/javascript',
           'application/x-javascript'].indexOf(data.contentType) !== -1) {
            var uri = URL.parse(data.url);
            debug('prefixing all urls with %s', config.prefix); // TODO
            data.stream = data.stream.pipe(createStream(uri));
        }
    }

    prefixUrls.rewriteDomains = rewriteDomains; // for testing
    prefixUrls.createStream = createStream;

    return prefixUrls;
}

module.exports = jsDomainPrefixer;
