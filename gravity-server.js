
module.exports = function (RED) {

	var prefix = '/nodes/atomic-gravity/apis';

	RED.httpAdmin.get(prefix + '/products', RED.auth.needsPermission('flows.write'), function(req, res) {

		let Gravity = require('gravity-sdk');
		let client = new Gravity.Client({
			servers: req.query.server + ':' + req.query.port,
			domain: req.query.domain || 'default',
			token: req.query.token,
		});

		(async () => {

			let items = [];
			try {
				// Connect to gravity
				await client.connect();

				// Getting products
				let products = await client.getProducts();

				client.disconnect();

				items = products.map(function(product) {
					return {
						name: product.name,
						settings: product.settings
					}
				});
			} catch(e) {
				console.error(e);
			}

			res.json({
				products: items
			});
		})();
	});

	function GravityServerNode (n) {
		RED.nodes.createNode(this, n)
		this.server = n.server
		this.port = n.port
	}

	RED.nodes.registerType('Gravity Server', GravityServerNode)
}
