var restify = require('restify');
var request = require('request');
var config = require('./config.js');
var throttle = require('./lib/throttle');

function requestHandler(req, res, next) {
	var target = config.target.host;
	console.info('Forwarding ' + req.url + ' to ' + target);
	req.pipe(request('https://services-stage0.globaledit.com' + req.url)).pipe(res);
	
	next();
}

function bootstrapServer(server) {
	server.get(/.*/,requestHandler);
	server.put(/.*/,requestHandler);
	server.post(/.*/,requestHandler);
	server.patch(/.*/,requestHandler);
	server.del(/.*/,requestHandler);
	server.head(/.*/,requestHandler);
}

var proxySecure = restify.createServer(config.ssl);
proxySecure.use(throttle());
bootstrapServer(proxySecure);

proxySecure.listen(1337, function(){
	console.info('Proxy server listening at https://127.0.0.1:1337');
});