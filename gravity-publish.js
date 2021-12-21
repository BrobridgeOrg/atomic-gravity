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
			case 'registering':
				node.status({
					fill: 'yellow',
					shape: 'ring',
					text: 'registering'
				});
				break;
			case 'initializing':
				node.status({
					fill: 'yellow',
					shape: 'ring',
					text: 'initializing'
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
		let client = new Gravity.Client();
		let adapter;

		(async () => {

			try {
				setStatus('connecting');

				// Connect to gravity
				await client.connect(node.server.server + ':' + node.server.port);

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

			setStatus('registering');

			// Creating adapter
			adapter = client.createAdapter({
				verbose: true,
			});

			try {
				let adapterID = config.adapterID || uuid.v1(); 
				let componentName = 'atomic-adapter.' + adapterID; 
				let adapterName = config.name || 'Atomic Adapter'; 

				// Register adapter
				await adapter.register(componentName, adapterID, adapterName);
			} catch(e) {
				node.error(e);
				client.disconnect();
				return;
			}

			setStatus('connected');

		})();

        node.on('input', async (msg, send, done) => {

			if (!msg.eventName) {
				return done();
			}

			try {
				await adapter.publish(msg.eventName, JSON.stringify(msg.payload));
				done();
			} catch(e) {
				node.error(e);
			}
        });

		node.on('close', () => {
			client.disconnect();
		});
    }

    RED.nodes.registerType('Gravity Publish', PublishNode, {
		credentials: {
			appID: { type: 'text' },
			accessKey: { type: 'text' }
		}
	});
}
