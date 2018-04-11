var alexa = require('alexa-app');

// Allow this module to be reloaded by hotswap when changed
module.change_code = 1;

// Define an alexa-app
var app = new alexa.app('hello_world');
app.id = require('./package.json').alexa.applicationId;

app.launch(function (req, res) {
	res.say('ask me to say a number');
	res.shouldEndSession(false, 'ask me to say a number');
});

app.intent('helloworld', {
    "slots": { "number": "AMAZON.NUMBER" },
    "utterances": [
      "say the number {-|number}"
    ]
}, function (req, res) {
	res.say('Your number is ' + req.slot('number'));
});

app.error = function(e, req, res) {
	console.log(e);
};

module.exports = app;