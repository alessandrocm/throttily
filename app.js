var restify = require('restify');
var request = require('request');
var config = require('./config.js');
var throttle = require('./lib/throttle');
var tokenStrategy = require('./lib/tokenStrategy');
var securePort = process.env.HTTPS_PORT || 3000;
var unsecurePort = process.env.HTTP_PORT || 3001;

function requestHandler(req, res, next) {
	var protocol = (req.isSecure()) ? 'https://' : 'http://';
	var target = config.target.host;
	console.info('Forwarding ' + req.url + ' to ' + protocol + target);
	req.pipe(request(protocol + target + req.url)).pipe(res); //The magic happens here.
	
	next();
}

function afterHandler(req, res, route, error) {
	if (error) {
		console.info('Handlers complete with errors.');
		console.error(error);
	}
	else {
		console.info('Handlers complete.');
	}
}

function bootstrapServer(server) {
	server.use(throttle({
		throttleStrategy:	tokenStrategy		//This handles the throttling
	}));
	server.get(/.*/,requestHandler);
	server.put(/.*/,requestHandler);
	server.post(/.*/,requestHandler);
	server.patch(/.*/,requestHandler);
	server.del(/.*/,requestHandler);
	server.head(/.*/,requestHandler);
	server.on('after', afterHandler);
}

var proxyUnsecure = restify.createServer();
bootstrapServer(proxyUnsecure);

proxyUnsecure.listen(unsecurePort, function() {
	console.info('Proxy server listening at http://127.0.0.1:' + unsecurePort);
});

var proxySecure = restify.createServer(config.ssl);
bootstrapServer(proxySecure);

proxySecure.listen(securePort, function(){
	console.info('Proxy server listening at https://127.0.0.1:' + securePort);
});