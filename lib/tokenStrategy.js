var LRU = require('lru-cache');
var util = require('util');
var Connection = require('tedious').Connection;
var Request = require('tedious').Request;
var config = require('./../config');

var options = {
	max:	1000,				//Keep a maximum of 1000 items in memory
	maxAge:	1000 * 60 *	30,		//Keep items in memory up to 30 minutes
	stale:	true				//Return stale items before discarding them
};
var clients = new LRU(options);
var tokens = new LRU(options);

function loadClientLimits(opts) {
	console.info('Loading limits from storage for ' + JSON.stringify(opts));
	var query = 'SELECT 4 as Rate, 8 as Burst'; 		//TODO: This needs to be a stored proc
	var connection = new Connection(config.db);
	connection.on('connect', function(err){
		if (err) {
			console.error(err.message);
		}
		else {
			console.info('Connected to db');
			var request = new Request(query, function(error){
				connection.close();
				console.info('Connection to db closed.');
			});
			
			request.on('row', function(columns){
				var throttle;
				var cache;
				var key;
				
				if(opts.clientid) {
					key = opts.clientid;
					cache = clients;
				}
				else if (opts.token){
					key = opts.token;
					cache = tokens;
				}
				
				throttle = {};
				throttle.key = key;
				throttle.limits = {};
				throttle.limits.rate = columns[0].value;
				throttle.limits.burst = columns[1].value;
				cache.set(key, throttle);
				console.info('Limits loaded from db for ' + JSON.stringify(opts));
			});
			
			connection.execSql(request);
		}
	});
}

function clientLimits(opts) {
	var temp = {};
	temp.key = opts.clientid || opts.token;
	temp.limits = util._extend({}, config.limits);		//clone default limit object
	loadClientLimits(opts) 								//Load limits from storage.
	
	return temp;
}

function parseToken(header) {
	if (!header) {
		return null;
	} 
	else {
		var rex = /bearer\s(.*)/i;
		var token = header.replace(rex, "$1");

		return token;
	}
}

function tokenThrottleStrategy(req) {
	console.info('Token Strategy initialized.');
	var ip = req.headers['X-Forwarded-For'] || req.connection.remoteAddress;
	var clientid = req.headers['client_id'] || req.params.client_id;
	var token = parseToken(req.headers['authorization']);
	var throttle;
	
	if (clientid) {
		console.info('Throttling by clientid.');
		throttle = clients.get(clientid);
		if (!throttle) {
			console.info('Temporary limits applied.');
			throttle = clientLimits({clientid: clientid});
			clients.set(throttle.key, throttle);
		}
	}
	else if (token) {
		console.info('Throttling by token.');
		throttle = tokens.get(token);
		if (!throttle) {
			console.info('Temporary limits applied.');
			throttle = clientLimits({token:token});
			tokens.set(throttle.key, throttle);
		}
	}
	else {
		console.info('Throttling by ip.');
		throttle = {
			key:	ip,
			limits:	{
				rate:	config.limits.rate	|| 1,
				burst:	config.limits.burst	|| 1
			}
		};
	}
	
	return throttle;
}

module.exports = tokenThrottleStrategy;