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

const url       = require('url');
const acorn     = require('acorn');
const acornWalk = require('acorn/dist/walk');
const Transform = require('stream').Transform;
const debug     = require('debug')('unblocker:js-domain-prefixer');

function jsDomainPrefixer(config) {
    var re_abs_url = /("|')(https?:)\/\/((?:[A-Z0-9-]{1,63}\.){1,125}[A-Z]{2,63})/ig;

    function documentCookieFilter(nodeType, node) {
        return nodeType === 'AssignmentExpression' && node.left.object.name === 'document';
    }

    function rewriteStuff(data) {

        let output = null;

        try {
            output = acorn.parse(data, {
              sourceType: 'script'
            });
        } catch(e) {
            return data;
        }

        let index = 0;

        let cookiePos = [];

        while((index = data.indexOf('document.cookie', index + 1)) !== -1) {
            let outputWalk = acornWalk.findNodeAt(output, index, null, documentCookieFilter);
            if(outputWalk) {
                cookiePos.push([outputWalk.node.right.start, outputWalk.node.end]);
            }
        }

        cookiePos.reverse();

        for(let i = 0, ii = cookiePos.length; i < ii; i++) {
          data = (data.substring(0, cookiePos[i][0]) + 'unblockerDomain(' +
            (data.substring(cookiePos[i][0], cookiePos[i][1]) + ')' + (data.substring(cookiePos[i][1]))));
        }

        data = data.replace(re_abs_url, function(match, r1, r2, r3) {
            return r1 + 'http://' + (r2 === 'http:' ? 'h-t-t-p.' : 'h-t-t-p-s.') + r3 + '.' + config.domain;
        });

        return data;
    }

    function createStream() {

        let bigChunk = '';

        return new Transform({
            decodeStrings: false,

            transform: function (chunk, encoding, next) {
                bigChunk+= chunk;
                next();
            },

            flush: function(done) {
                this.push(rewriteStuff(bigChunk));
                done();
            }
        });
    }

    function prefixUrls(data) {
        if (['text/javascript',
           'application/javascript',
           'application/x-javascript'].indexOf(data.contentType) !== -1) {
            var uri = url.parse(data.url);
            debug('prefixing all urls with %s', config.prefix); // TODO
            data.stream = data.stream.pipe(createStream(uri));
        }
    }

    prefixUrls.rewriteStuff = rewriteStuff; // for testing
    prefixUrls.createStream = createStream;

    return prefixUrls;
}

module.exports = jsDomainPrefixer;
