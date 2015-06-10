var errors = require('./errors');
var tokens = require('./tokenStorage');
var config = require('./../config');
var TooManyRequestsError = errors.TooManyRequestsError;

//Default strategy throttles based on IP
function defaultStrategy(req) {
	var strategy = {};
	strategy.key = req.headers['X-Forwarded-For'] || req.connection.remoteAddress;
	strategy.limits = {};
	strategy.limits.rate = config.limits.rate;
	strategy.limits.burst = config.limits.burst;
	return strategy;
}

function throttle(options) {
	options = options || {};
	var table = options.tokenTable || new tokens.Table({size: options.maxKeys});
	var strategy = options.throttleStrategy || defaultStrategy;
	
	function rateLimiter(req, res, next) {
		console.info('Determining rate limit...');
		var rate;
		var burst;
		var key;
		var bucket;
		
		var rateStrategy = strategy(req);
		
		//If no valid rateStrategy is returned do not bother throttling
		if (!rateStrategy || !rateStrategy.key ||
			!rateStrategy.limits || !rateStrategy.limits.rate || !rateStrategy.limits.burst){
			console.info('No rateStrategy utilized.');
			return next();
		}
		else {
			console.info(JSON.stringify(rateStrategy) + ' strategy utilized.')
			key = rateStrategy.key;
			rate = rateStrategy.limits.rate;
			burst = rateStrategy.limits.burst;
		}
		
		if (options.overrides &&
			options.overrides[key] &&
			options.overrides[key].rate !== undefined &&
			options.overrides[key].burst !== undefined) {

			burst = options.overrides[key].burst;
			rate = options.overrides[key].rate;
			console.info('Overrides applied: rate - ' + rate + ' burst - ' + burst);
		}
		
		//If rate or burst is zero do not bother throttling
		if (!rate || !burst) {
			console.info('Rate or burst not set. Throttling disabled.');
			return next();
		}
		
		bucket = table.get(key);
		if (!bucket) {
			bucket = new tokens.Bucket({
				capacity:	burst,
				fillRate:	rate
			});
			table.put(key, bucket);
		}
		
		if (!bucket.consume(1)) {
			console.warn('Request rate exceeded by ' + key);
			return next(new TooManyRequestsError('You have exceeded your request rate.'));
		}
		
		next();
	}
	
	//Return rate limiting middleware
	return rateLimiter;
}

module.exports = throttle;