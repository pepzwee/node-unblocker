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

var URL = require('url');
var Transform = require('stream').Transform;
var contentTypes = require('./content-types.js');
var debug = require('debug')('unblocker:domain-prefixer');

function domainPrefixer(config) {
    var re_abs_url = /("|'|=|url\(\s*|url=| )(https?:)\/\/((?:[A-Z0-9-]{1,63}\.){1,125}[A-Z]{2,63})/ig, // "http:, 'http:, =http:, or url( http:, also matches https versions
        re_rel_proto = /("|'|=|url\(\s*|url=| )(\/\/((?:[A-Z0-9-]{1,63}\.){1,125}[A-Z]{2,63}))/ig, // matches //site.com style urls where the protocol is auto-sensed
        // no need to match relative or root-relative urls - those will work without modification

        // partial's dont cause anything to get changed, they just cause last few characters to be buffered and checked with the next batch
        re_html_partial = /((url\(\s*)?\s[^\s]+\s*)$/, // capture the last two "words" and any space after them handles chunks ending in things like `<a href=` and `background-image: url( ` or `url h`

        // things that shouldn't be proxied
        // (in order to keep this a little bit simpler, the initial regex proxies it, and then the second one unproxies it)
        // matches broken xmlns attributes like xmlns="http://h-t-t-p.www.w3.org.unblocker/1999/xhtml" and
        // xmlns:og="http://h-t-t-p.ogp.me.unblocker/ns#"
        re_proxied_xmlns = new RegExp('(xmlns(?::[a-z]+)?=")http:\/\/(h-t-t-p(?:-s)?\\.)((?:[A-Z0-9-]{1,63}\\.){1,125}[A-Z]{2,63})\\.' + config.domain.replace(/\./g, '\\.'), 'ig'),
        // This one is special
        re_proxied_doctype = new RegExp('http:\/\/(h-t-t-p(?:-s)?\\.)((?:[A-Z0-9-]{1,63}\\.){1,125}[A-Z]{2,63})\\.' + config.domain.replace(/\./g, '\\.'), 'i');
        // re_proxied_xmlns = new RegExp('(xmlns(:[a-z]+)?=")' + config.prefix, 'ig'),
        // re_proxied_doctype = new RegExp('(<!DOCTYPE[^>]+")' + config.prefix, 'i');

    var re_script = /<script/i;


    function rewriteDomains(chunk, uri, prefix) {

        // first upgrade // links to regular http/https links because otherwise they look like root-relative (/whatever.html) links
        chunk = chunk.replace(re_rel_proto, "$1" + uri.protocol + "$2");
        // next replace urls that are relative to the root of the domain (/whatever.html) because this is how proxied urls look
        // chunk = chunk.replace(re_rel_root, "$1" + uri.protocol + "//" + uri.host + "$3");
        // last replace any complete urls
        //chunk = chunk.replace(re_abs_url, "$1" + prefix + "$2");
        chunk = chunk.replace(re_abs_url, function(match, r1, r2, r3) {
            return r1 + 'http://' + (r2 === 'http:' ? 'h-t-t-p.' : 'h-t-t-p-s.') + r3 + '.' + config.domain;
        });

        // fix xmlns attributes that were broken because they contained urls.
        // (JS RegExp doesn't support negative lookbehind, so breaking and then fixing is simpler than trying to not break in the first place)
        chunk = chunk.replace(re_proxied_xmlns, function(match, m1, m2, m3) {
            return m1 + (m2 === 'h-t-t-p.' ? 'http://' : 'https://') + m3;
        });

        // We do it this way to improve performance compared to a search for <!DOCTYPE
        // Test with a regex replacement only showed a delay of 600 ms...
        if(chunk.toUpperCase().indexOf('<!DOCTYPE') !== -1 && chunk.toUpperCase().indexOf('>', chunk.indexOf('<!DOCTYPE') + 10) !== -1) {
            var indexOfDoctype = chunk.toUpperCase().indexOf('<!DOCTYPE') + 10;
            chunk = chunk.substring(0, indexOfDoctype) +
                    chunk.substring(indexOfDoctype, chunk.indexOf('>', indexOfDoctype)).replace(re_proxied_doctype, function(match, m1, m2) {
                        return (m1 === 'h-t-t-p.' ? 'http://' : 'https://') + m2;
                    }) +
                    chunk.substring(chunk.indexOf('>', indexOfDoctype));
        }

        chunk = chunk.replace(re_script, '<script type="application/javascript">function unblockerDomain(cookies) {return cookies.replace(/(domain ?= ?)\\.?([\\w\.]+)/ig, "$1.$2.'+config.domain+'")}</script>$&');

        return chunk;
    }

    function createStream(uri) {

        // sometimes a chunk will end in data that may need to be modified, but it is impossible to tell
        // in that case, buffer the end and prepend it to the next chunk
        var chunk_remainder;

        return new Transform({
            decodeStrings: false,

            transform: function (chunk, encoding, next) {
                chunk = chunk.toString();
                if (chunk_remainder) {
                    chunk = chunk_remainder + chunk;
                    chunk_remainder = undefined;
                }

                // second, check if any urls are partially present in the end of the chunk,
                // and buffer the end of the chunk if so; otherwise pass it along
                var partial_hits = chunk.match(re_html_partial);
                if (partial_hits && partial_hits[1]) {
                    var snip = partial_hits[1].length;
                    chunk_remainder = chunk.substr(-1 * snip);
                    chunk = chunk.substr(0, chunk.length - snip);
                }

                chunk = rewriteDomains(chunk, uri, config.prefix);

                this.push(chunk);
                next();
            },

            flush: function(done) {
                // if we buffered a bit of text but we're now at the end of the data, then apparently
                // it wasn't a url - send it along

                if (chunk_remainder) {
                    this.push(rewriteDomains(chunk_remainder, uri, config.prefix));
                    chunk_remainder = undefined;
                }
                done();
            }
        });
    }

    function prefixUrls(data) {
        if (contentTypes.shouldProcess(config, data)) {
            var uri = URL.parse(data.url);
            debug('prefixing all urls with %s', config.prefix); // TODO
            data.stream = data.stream.pipe(createStream(uri));
        }
    }

    prefixUrls.rewriteDomains = rewriteDomains; // for testing
    prefixUrls.createStream = createStream;

    return prefixUrls;
}



module.exports = domainPrefixer;
