
/*
 *
 * JSON parsing is tricky since any data could be present in the field values.
 * It could be HTML or just a raw link.
 *
 */

'use strict';

const URL = require('url');
const Transform = require('stream').Transform;
const debug = require('debug')('unblocker:json-domain-prefixer');

function jsonDomainPrefixer(config) {
    const re_abs_url = /("|'|=|url\(\s*|url=| )(https?:)(?:\\\/\\\/|\/\/)((?:[A-Z0-9-]{1,63}\.){1,125}[A-Z]{2,63})/ig;
    const re_rel_proto = /("|'|=|url\(\s*|url=| )((?:\\\/\\\/|\/\/)((?:[A-Z0-9-]{1,63}\.){1,125}[A-Z]{2,63}))/ig;
    const re_html_partial = /((url\(\s*)?\s[^\s]+\s*)$/;

    function rewriteDomains(chunk, uri) {

        chunk = chunk.replace(re_rel_proto, "$1" + uri.protocol + "$2");

        debug(re_abs_url.test(chunk));

        chunk = chunk.replace(re_abs_url, function(match, r1, r2, r3) {
            return r1 + 'http://' + (r2 === 'http:' ? 'h-t-t-p.' : 'h-t-t-p-s.') + r3 + '.' + config.domain;
        });


        chunk = chunk.replace(re_abs_url, function(match, r1, r2) {
            return '"http://' + (r1 === 'http:' ? 'h-t-t-p.' : 'h-t-t-p-s.') + r2 + '.' + config.domain;
        });

        return chunk;
    }

    function createStream(uri) {

        var chunk_remainder;

        return new Transform({
            decodeStrings: false,

            transform: function (chunk, encoding, next) {
                chunk = chunk.toString();
                if (chunk_remainder) {
                    chunk = chunk_remainder + chunk;
                    chunk_remainder = undefined;
                }

                var partial_hits = chunk.match(re_html_partial);
                if (partial_hits && partial_hits[1]) {
                    var snip = partial_hits[1].length;
                    chunk_remainder = chunk.substr(-1 * snip);
                    chunk = chunk.substr(0, chunk.length - snip);
                }

                chunk = rewriteDomains(chunk, uri);

                this.push(chunk);
                next();
            },

            flush: function(done) {

                if (chunk_remainder) {
                    this.push(rewriteDomains(chunk_remainder, uri, config.prefix));
                    chunk_remainder = undefined;
                }
                done();
            }
        });
    }

    function prefixUrls(data) {
        if(config.domainPrefixing) {
            if (['application/json'].indexOf(data.contentType) !== -1) {
                var uri = URL.parse(data.url);
                debug('prefixing all urls');
                data.stream = data.stream.pipe(createStream(uri));
            }
        }
        // Not implemented for regular node-unblocker
    }

    prefixUrls.rewriteDomains = rewriteDomains; // for testing
    prefixUrls.createStream = createStream;

    return prefixUrls;
}

module.exports = jsonDomainPrefixer;
