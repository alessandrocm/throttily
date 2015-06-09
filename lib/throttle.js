function throttle(options) {
	function rateLimiter(req, res, next) {
		console.info('Determining rate limit...');
		
		next();
	}
	
	return rateLimiter;
}

module.exports = throttle;