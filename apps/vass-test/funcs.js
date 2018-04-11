var levenshtein = require('fast-levenshtein');

/**
 * Private constants
 */

 const session_order = 'order';
 const TEMP_menu = [
	 'coffee',
	 'coffee with milk',
	 'stake',
	 'salad',
	 'water'
 ];

/**
 * Class that contains all the alexa events
 */
class AlexaFuncs {

	/**
	 * Public methods
	 */

	static launch(req, res) {

		res.say('Hi, welcome to VASS test. Would you like to start a new order or listen the menu?');
		res.shouldEndSession(false);

	}
	 
	static newOrder(req, res) {

		res.say('You have started a new order, what would you like to add?');
		AlexaFuncs._initOrder(req);
		res.shouldEndSession(false);

	}

	static addItem(req, res) {
		
		if (AlexaFuncs._hasOrder(req)) {
			const item = req.slot('item');
			const quantity = req.slot('quantity');
			const orderItem = { item: item, quantity: quantity, accepted: false};
			AlexaFuncs._pushToOrder(req, orderItem);
			res.say(`${quantity} ${item} added, is it correct?`);

			TEMP_menu.forEach(el => {
				console.log(item, el, levenshtein.get(item, el));
			});
		}
		else {
			res.say(`No order found`);
		}	
		res.shouldEndSession(false);
	}

	static menu(req, res) {

		let result = 'The current menu has:';
		TEMP_menu.forEach(item => {
			result = `${result} ${item}, `;
		});
		result = result.slice(0,-2);

		res.say(result);
		res.shouldEndSession(false);

	}

	static finishOrder(req, res) {

		if (AlexaFuncs._hasOrder(req)) {
			if (AlexaFuncs._orderIsEmpty(req, true)) {
				res.say('Your order is empty.');
			} else {
				res.say('Your order will be processed.');
			}
			AlexaFuncs._emptyOrder(req);
		} else {
			res.say('No order found.');
		}
		res.shouldEndSession(false);

	}

	static listOrder(req, res) {
	
		if (AlexaFuncs._hasOrder(req)) {
			if (AlexaFuncs._orderIsEmpty(req, true)) {
				res.say('Your order is empty.');
			} else {
				let result = "Your order has:";
				const order = AlexaFuncs._getOrder(req);
				order.forEach(item => {
					if (item.accepted) {
						result = `${result} ${item.quantity} ${item.item}, `;
					}			
				});
				result = result.slice(0,-2);
				res.say(result);
			}
		} else {
			res.say('No order found.');
		}
		res.shouldEndSession(false);

	}

	static amazonCancel(req, res) {

		res.say('Canceling order');
		AlexaFuncs._emptyOrder(req);
		res.shouldEndSession(false);

	}

	static amazonHelp(req, res) {

		if (AlexaFuncs._hasOrder(req)) {
			res.say('You are currently in and order, try to add items like: add one coffee. ' +
			'If you want to check your current order try saying: List order. Also you can ' +
			'cancel the current order, finish it or list the menu');
		}
		else {
			res.say('No order found. You can start a new order by saying: new order. Also ' +
			'you can list the menu or close the skill by saying: stop');
		}
		res.shouldEndSession(false);

	}

	static amazonStop(req, res) {
		res.say('Exiting VASS Test');
		res.shouldEndSession(true);
	}

	static amazonYes(req, res) {

		if (AlexaFuncs._hasOrder(req)) {
			if (AlexaFuncs._orderIsEmpty(req)) {
				res.say('Couldn\'t confirm the item, the order is empty.');
			}
			else {
				let order = AlexaFuncs._getOrder(req);
				order[order.length - 1].accepted = true;
				AlexaFuncs._saveOrder(req, order);
				res.say('Item added.');
			}
			
		}
		else {
			res.say('No order found.');
		}
		res.shouldEndSession(false);

	}

	static amazonNo(req, res) {

		if (AlexaFuncs._hasOrder(req)) {
			if (AlexaFuncs._orderIsEmpty(req)) {
				res.say('Couldn\'t cancel the item, the order is empty.');
			}
			else {
				let order = AlexaFuncs._getOrder(req);
				order.splice(-1,1);
				AlexaFuncs._saveOrder(req, order);
				res.say('Item removed.');
			}
			
		}
		else {
			res.say('No order found.');
		}
		res.shouldEndSession(false);

	}

	/**
	 * Private methods
	 */

	static _initOrder(req) {
		req.getSession().set(session_order, []);
	}

	static _emptyOrder(req) {
		req.getSession().set(session_order, null);
	}

	static _hasOrder(req) {
		return AlexaFuncs._getOrder(req) ? true : false;
	}

	static _getOrder(req) {
		return req.getSession().get(session_order);
	}

	static _saveOrder(req, order) {
		req.getSession().set(session_order, order);
	}

	static _orderIsEmpty(req, onlyAccepted) {
		const order = AlexaFuncs._getOrder(req);
		if (onlyAccepted) {
			return !order || order.filter(item => item.accepted).length <= 0;
		} else {
			return !order || order.length <= 0;
		}
	}

	static _pushToOrder(req, item) {
		var order = AlexaFuncs._getOrder(req);
		order.push(item);
		AlexaFuncs._saveOrder(req, order);
	}

}

module.exports = AlexaFuncs;