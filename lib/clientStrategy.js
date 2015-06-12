var LRU = require('lru-cache');
var util = require('util');
var cacheConfig = {
	max:	1000,
	maxAge:	1000 * 60 * 30,
	stale:	true	
}

function throttleStrategy(options) {
	options = options || {};
	var store = options.store || new LRU(cacheConfig);
	var clientKey = options.clientKey || 'X-Forwarded-For';
	
	function clientStrategy(req) {
		console.info('Client strategy utilized.');
		var throttleRate;
		var identifier = req.headers[clientKey];
		
		if(identifier) {
			throttleRate = store.get(identifier);
		}
		
		return throttleRate;
	}
	
	return clientStrategy;
}

module.exports = throttleStrategy;