module.exports = function(RED) {

    function PublishNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
		this.server = RED.nodes.getNode(config.server)

		function setStatus(type) {
			switch(type) {
			case 'connected':
				node.status({
					fill: 'green',
					shape: 'dot',
					text: 'connected'
				});
				break;
			case 'connecting':
				node.status({
					fill: 'yellow',
					shape: 'ring',
					text: 'connecting'
				});
				break;
			case 'disconnected':
				node.status({
					fill: 'red',
					shape: 'ring',
					text: 'disconnected'
				});
				break;
			}
		}

		setStatus('disconnected');

		// Initializing gravity client
		let uuid = require('uuid');
		let Gravity = require('gravity-sdk');

		(async () => {

			if (!node.server) {
				setStatus('disconnected');
				return;
			}

			let accessToken = '';
			if (node.credentials) {
				accessToken = node.credentials.accessToken || '';
			}

			let client = new Gravity.Client({
				servers: node.server.server + ':' + node.server.port,
				domain: config.domain || 'default',
				token: accessToken,
			});
			node.gravityClient = client;

			try {
				setStatus('connecting');

				// Connect to gravity
				await client.connect();

				client.on('disconnect', () => {
					setStatus('disconnected');
				});

				client.on('reconnect', () => {
					setStatus('connecting');
				});
			} catch(e) {
				node.error(e);
				return;
			}

			setStatus('connected');

		})();

        node.on('input', async (msg, send, done) => {

			if (!msg.eventName) {
				return done();
			}

			try {
				await node.gravityClient.publish(msg.eventName, JSON.stringify(msg.payload));
				done();
			} catch(e) {
				node.error(e);
			}
        });

		node.on('close', () => {
			node.gravityClient.disconnect();
		});
    }

    RED.nodes.registerType('Gravity Publish', PublishNode, {
		credentials: {
			appID: { type: 'text' },
			accessToken: { type: 'text' }
		}
	});
}
