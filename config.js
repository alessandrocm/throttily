var fs = require('fs');

module.exports = {
	target:		{
		host:			'dev2.globaledit.com'
	},
	ssl:		{
		key:            fs.readFileSync('certs/certificate.key'),
 		certificate:    fs.readFileSync('certs/certificate.pem')
	},
	limits:		{
		rate:			2,
		burst:			1
	},
	throttle:	{
		defaultLimit:	{
			rate:	1,
			burst:	1
		},
		clientKey:		'authorization'
	}
};