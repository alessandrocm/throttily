var fs = require('fs');

module.exports = {
	target:		{
		host:	'www.google.com'//'services-stage0.globaledit.com'
	},
	ssl:		{
		key:            fs.readFileSync('certs/certificate.key'),
 		certificate:    fs.readFileSync('certs/certificate.pem')
	},
}