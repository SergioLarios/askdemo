var AlexaAppServer = require('alexa-app-server');
var instance = AlexaAppServer.start({
	server_root: __dirname,     // Path to root
	public_html: "public_html", // Static content
	app_dir: "apps",            // Location of alexa-app modules
	app_root: "/alexa/",        // Service root
	port: 9090,                  // Port to use
	debug: true,
	httpsPort: 443,
	httpsEnabled: true,
	privateKey: 'private-key.pem',
	certificate: 'certificate.pem'
});
