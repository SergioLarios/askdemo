var alexa = require('alexa-app');
var AlexaFuncs = require('./funcs.js');

// Allow this module to be reloaded by hotswap when changed
module.change_code = 1;

// Define an alexa-app
var app = new alexa.app('vass_test');
app.id = require('./package.json').alexa.applicationId;

app.launch(AlexaFuncs.launch);
app.intent('newOrder', {}, AlexaFuncs.newOrder);
app.intent('addItem', {}, AlexaFuncs.addItem);
app.intent('menu', {}, AlexaFuncs.menu);
app.intent('finishOrder', {}, AlexaFuncs.finishOrder);
app.intent('listOrder', {}, AlexaFuncs.listOrder);
app.intent('AMAZON.CancelIntent', {}, AlexaFuncs.amazonCancel);
app.intent('AMAZON.HelpIntent', {}, AlexaFuncs.amazonHelp);
app.intent('AMAZON.StopIntent', {}, AlexaFuncs.amazonStop);
app.intent('AMAZON.YesIntent', {}, AlexaFuncs.amazonYes);
app.intent('AMAZON.NoIntent', {}, AlexaFuncs.amazonNo);

app.error = function(e, req, res) {
	if (e === 'NO_INTENT_FOUND') {
		res.say('I couldn\'t understand, please say again');
		res.shouldEndSession(false, 'Please try again');
	}
	console.log('ERROR !', e);
};

module.exports = app;