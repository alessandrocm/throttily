var fs = require('fs');

module.exports = {
	target:		{
		host:			'www.google.com'
	},
	ssl:		{
		key:            fs.readFileSync('certs/certificate.key'),
 		certificate:    fs.readFileSync('certs/certificate.pem')
	},
	limits:		{
		rate:			2,
		burst:			1
	},
	db:			{
		userName:		'[DB USER]',
		password:		'[DB PASSWORD]',
		server:			'[DB HOST]',
		database:		'[DB NAME]',
		useColumnNames:	true,
		options:		{
			encrypt:	false
		}
	}
}