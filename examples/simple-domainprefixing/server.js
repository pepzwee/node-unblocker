var http = require('http');
var Unblocker = require('../../lib/unblocker');


var unblocker = Unblocker({
  prefix: null,
  domainPrefixing: true,
  domain: 'u.fabicutv.com'
});

http.createServer(function(req, res) {
    // first let unblocker try to handle the requests
    unblocker(req, res, function(err) {
        // this callback will be fired for any request that unblocker does not serve
        var headers = {'content-type': 'text/plain'};
        if (err) {
            res.writeHead(500, headers);
            return res.end(err.stack || err.message);
        }
        if (req.url == '/') {
            res.writeHead(200, headers);
            return res.end('Use the format http://site-i-want.com.thissite.com/path-i-want to access the proxy.');
        } else {
            res.writeHead(404, headers);
            return res.end('Error 404: file not found.');
        }
    });
}).listen(43536);

