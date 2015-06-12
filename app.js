var restify = require('restify');
var request = require('request');
var LRU = require('lru-cache');
var config = require('./config.js');
var throttle = require('./lib/throttle');
var clientStrategy = require('./lib/clientStrategy');
var securePort = process.env.HTTPS_PORT || 3000;
var unsecurePort = process.env.HTTP_PORT || 3001;
var clientConfig = {
	store:	new LRU({max:1000, maxAge: 1000 * 60 * 30, stale: true}),
	clientKey: config.throttle.clientKey
};
var strategy = clientStrategy(clientConfig);

function requestHandler(req, res, next) {
	var protocol = (req.isSecure()) ? 'https://' : 'http://';
	var target = config.target.host;
	console.info('Forwarding ' + req.url + ' to ' + protocol + target);
	req.pipe(request(protocol + target + req.url)).pipe(res); //The magic happens here.
	
	next();
}

function afterHandler(req, res, route, error) {
	function refreshRate() {
		console.log('Response sent.');
		var identifier = req.headers[clientConfig.clientKey];
		var limits = res.headers['X-Rate-Limits'];
		var rate = {};
		if (identifier && limits) {
			rate.key = identifier;
			rate.limits = limits;
			clientConfig.store.set(identifier, rate);
			console.log('Rate limit refreshed for ' + identifier + ' at ' + JSON.stringify(limits));
		}
	}
		
	if (error) {
		console.info('Handlers complete with errors.');
		console.error(error);
	}
	else {
		res.on('finish', refreshRate);
		console.info('Handlers complete.');
	}
}

function bootstrapServer(server) {
	server.use(throttle({				//This handles the throttling
		throttleStrategy:	strategy	//This tries to identify the user
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

if (config.ssl) {
	var proxySecure = restify.createServer(config.ssl);
	bootstrapServer(proxySecure);
	
	proxySecure.listen(securePort, function(){
		console.info('Proxy server listening at https://127.0.0.1:' + securePort);
	});
}