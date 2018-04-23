var levenshtein = require('fast-levenshtein');
var request = require('request');

/**
 * Private constants
 */
const session_order = 'order';
const menu = [];
const restEndpoint = 'https://188.79.1.60:9002/rest/v2';
const authEndpoint = 'https://188.79.1.60:9002/authorizationserver/oauth/token';
const searchQuery = ':BASIC:category:597';
const userId = 'alexa_client';
const securityCode = '123';
const oauthUser = 'ALEXA_APP';
const oauthPsw = 'ALEXA_APP';
const clientUser = 'ALEXA_CLIENT';
const clientPsw = 'ALEXA_CLIENT';

const token, cartId, code, addresses, deliveryModeId, paymentDetailsId;

/**
 * Class that contains all the alexa events
 */
class AlexaFuncs {
	/**
	 * Public methods
	 */

	static launch(req, res) {

		AlexaFuncs._getToken();
		AlexaFuncs._getProducts(); // TODO: añadir productos a menu, debe guardarse el nombre y el código para poder añadirlo al carrito
		res.say('Hi, welcome to VASS test. Would you like to start a new order or listen the menu?');
		res.shouldEndSession(false);

	}

	static newOrder(req, res) {

		// Create new cart
		request({
			url: restEndpoint + '/electronics/users/' + userId + '/carts',
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Authorization': 'Bearer ' + token
			}
		}, function (err, res) {
			if (err) {
				console.log('Error req new cart', err);
			} else {
				var json = JSON.parse(res.body);
				cartId = json.code;
			}
		});
		res.say('You have started a new order, what would you like to add?');
		AlexaFuncs._initOrder(req);
		res.shouldEndSession(false);

	}

	static addItem(req, res) {

		if (AlexaFuncs._hasOrder(req)) {
			const item = req.slot('item');
			const quantity = req.slot('quantity') || 1;


			let scores = [];
			menu.forEach(el => {
				const elms = el.name.split(" ");
				const itemElms = item.split(" ");
				let distance = 0;
				elms.forEach(elemnt => {
					itemElms.forEach(item => {
						let ld = levenshtein.get(elemnt, item);
						if (ld < distance || distance == 0) {
							distance = ld;
						}
					});
				});
				const score = [el, distance];
				scores.push(score);
			});

			const sortedScores = scores.sort(AlexaFuncs.sortfunc);
			//console.log(sortedScores);

			const orderItem = { item: sortedScores[0][0].code, quantity: quantity, accepted: false };
			AlexaFuncs._pushToOrder(req, orderItem);
			res.say(`${quantity} ${sortedScores[0][0].name} added, is it correct?`);

		}
		else {
			res.say(`No order found`);
		}
		res.shouldEndSession(false);
	}

	static sortfunc(a, b) {
		return a[1] - b[1];
	}

	static menu(req, res) {

		// Send menu to alexa
		let result = 'The current menu has:';
		menu.forEach(item => {
			result = `${result} ${item.name}, `;
		});
		result = result.slice(0, -2);

		res.say(result);
		res.shouldEndSession(false);

	}

	static finishOrder(req, res) {

		if (AlexaFuncs._hasOrder(req)) {
			if (AlexaFuncs._orderIsEmpty(req, true)) {
				res.say('Your order is empty.');
			} else {
				res.say('Your order will be processed.');

				// Start the process in hybris
				AlexaFuncs._getUserAddresses();
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
				result = result.slice(0, -2);
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
		AlexaFuncs._cancelCart();

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

				request({
					url: restEndpoint + '/electronics/users/' + userId + '/carts/' + cartId + '/entries',
					method: 'POST',
					headers: {
						'Accept': 'application/json',
						'Authorization': 'Bearer ' + token,
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					form: {
						'code': order[order.length - 1].item
					}
				}, function (err, res) {
					if (err) {
						console.log('Error req add to cart', err);
					} else {
						var json = JSON.parse(res.body);
						//console.log("Item added to Hybris cart:", json);
					}
				});

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
				order.splice(-1, 1);
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

	// Get token
	static _getToken() {
		request({
			url: authEndpoint,
			method: 'POST',
			form: {
				'client_id': clientUser,
				'client_secret': clientPsw,
				'username': oauthUser,
				'password': oauthPsw,
				'grant_type': 'client_credentials'
			}
		}, function (err, res) {
			if (err) {
				console.log('Error req token', err);
			} else {
				var json = JSON.parse(res.body);
				token = json.access_token;
				//console.log("Access Token:", token);
			}
		});
	}

	// Get Products
	static _getProducts() {
		request({
			url: restEndpoint + '/electronics/products/search?query=' + searchQuery + '&pageSize=10&fields=products(code,name,price),pagination',
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		}, function (err, res) {
			if (err) {
				console.log('Error search products', err);
			} else {
				var json = JSON.parse(res.body);
				json.products.forEach((el) => {
					var product = {};
					product.code = el.code;
					product.name = el.name;
					menu.push(product);
				});
				//console.log("Menu:", menu);
			}			
		});
	}

	// Get user addresses
	static _getUserAddresses() {
		request({
			url: restEndpoint + '/electronics/users/' + userId + '/addresses',
			method: 'GET',
			headers: {
				'Accept': 'application/json',
				'Authorization': 'Bearer ' + token,
			}
		}, function (err, res) {
			if (err) {
				console.log('Error get user addresses', err);
			} else {
				var json = JSON.parse(res.body);
				//console.log("Addresses:", json);
				AlexaFuncs._setCartUserAddresses();
			}			
		});
	}

	// Definir addresses al cart
	static _setCartUserAddresses() {
		request({
			url: restEndpoint + '/electronics/users/' + userId + '/carts/' + cartId + '/addresses/delivery',
			method: 'PUT',
			headers: {
				'Accept': 'application/json',
				'Authorization': 'Bearer ' + token,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			form: {
				'addressId': '8796125822999', // TODO: poner address de _getUserAddresses
			}
		}, function (err, res) {
			if (err) {
				console.log('Error set cart user addresses', err);
			} else {
				AlexaFuncs._getCartDeliveryModes();
			}
		});
	}

	// Get user delivery modes
	static _getCartDeliveryModes() {
		request({
			url: restEndpoint + '/electronics/users/' + userId + '/carts/' + cartId + '/deliverymodes',
			method: 'GET',
			headers: {
				'Accept': 'application/json',
				'Authorization': 'Bearer ' + token
			}
		}, function (err, res) {
			if (err) {
				console.log('Error get cart delivery mode', err);
			} else {
				var json = JSON.parse(res.body);
				//console.log("Delivery modes:", json);
				AlexaFuncs._setCartDeliveryMode();
			}
		});
	}

	// Definir user delivery mode al cart
	static _setCartDeliveryMode() {
		request({
			url: restEndpoint + '/electronics/users/' + userId + '/carts/' + cartId + '/deliverymode',
			method: 'PUT',
			headers: {
				'Accept': 'application/json',
				'Authorization': 'Bearer ' + token,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			form: {
				'deliveryModeId': 'standard-gross', // TODO: poner deliveryModeId de _getCartDeliveryModes
			}
		}, function (err, res) {
			if (err) {
				console.log('Error set cart delivery mode', err);
			} else {
				AlexaFuncs._getUserPaymentMethods();
			}
		});
	}

	// Get user payment methods
	static _getUserPaymentMethods() {
		request({
			url: restEndpoint + '/electronics/users/' + userId + '/carts/paymentdetails?saved=false',
			method: 'GET',
			headers: {
				'Accept': 'application/json',
				'Authorization': 'Bearer ' + token
			}
		}, function (err, res) {
			if (err) {
				console.log('Error get ser payment methods', err);
			} else {
				var json = JSON.parse(res.body);
				//console.log("Payment Methods:", json);
				AlexaFuncs._setCartPaymentMethods();
			}
		});
	}

	// Definir payment methods al cart
	static _setCartPaymentMethods() {
		request({
			url: restEndpoint + '/electronics/users/' + userId + '/carts/' + cartId + '/paymentdetails',
			method: 'PUT',
			headers: {
				'Accept': 'application/json',
				'Authorization': 'Bearer ' + token,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			form: {
				'paymentDetailsId': '8796093186090', // TODO: poner paymentDetailsId de _getCartDeliveryModes
			}
		}, function (err, res) {
			if (err) {
				console.log('Error set cart payment method', err);
			} else {
				AlexaFuncs._cartCheckout();
			}
		});
	}

	// Checkout cart
	static _cartCheckout() {
		request({
			url: restEndpoint + '/electronics/users/' + userId + '/orders',
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Authorization': 'Bearer ' + token,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			form: {
				'cartId': cartId,
				'securityCode': securityCode // TODO: quitar securityCode hardcoded
			}
		}, function (err, res) {
			if (err) {
				console.log('Error checkout cart', err);
			} else {
				var json = JSON.parse(res.body);
				//console.log("Checkout:", json);
			}		
		});
	}

	// Cancell cart
	static _cancelCart() {
		request({
			url: restEndpoint + '/electronics/users/' + userId + '/carts/' + cartId,
			method: 'DELETE',
			headers: {
				'Accept': 'application/json',
				'Authorization': 'Bearer ' + token
			}
		}, function (err, res) {
			if (err) {
				console.log('Error cancel cart', err);
			} else {
				//console.log("Cart Cancelled");
			}
		});
	}
}

module.exports = AlexaFuncs;