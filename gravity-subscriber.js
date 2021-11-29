module.exports = function(RED) {

    function SubscriberNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

		this.server = RED.nodes.getNode(config.server)

		let uuid = require('uuid');
		let Gravity = require('gravity-sdk');

		(async () => {

			let client = new Gravity.Client();

			try {
				// Connect to gravity
				await client.connect(node.server.server + ':' + node.server.port);
			} catch(e) {
				console.log(e.message);
			}

			let subscriber = client.createSubscriber({
				verbose: true,
				initialLoad: {
					enabled: true,
				}
			});

			try {
				let subscriberID = config.subscriberID || uuid.v1(); 
				let componentName = 'atomic-subscriber.' + subscriberID; 
				let subscriberName = config.name || 'Atomic Subscriber'; 
				// Register subscriber
				await subscriber.register('transmitter', componentName, subscriberID, subscriberName);
			} catch(e) {
				console.log(e.message);
			}

			// Event handler
			subscriber.on('event', (m) => {
				node.send({
					payload: {
						pipelineID: m.pipelineID,
						eventName: m.eventName,
						collection: m.collection,
						message: m.payload,
					}
				});

				m.ack();
			});

			// Snapshot handler
			subscriber.on('snapshot', (m) => {
				node.send({
					payload: {
						pipelineID: m.pipelineID,
						collection: m.collection,
						message: m.payload,
					}
				});

				m.ack();
			});

			try {
				if (config.collections) {

					let subscription = {};
					config.collections.forEach(function(collection) {
						subscription[collection] = [];
					});

					// Subscribe to collections
					await subscriber.subscribeToCollections(subscription);
				}
			} catch(e) {
				console.log(e.message);
			}

			try {
				// Subscribe to pipelines
				await subscriber.addAllPipelines();
			} catch(e) {
				console.log(e.message);
			}

			// start immediately
			subscriber.start();

			node.on('close', () => {
				console.log('Closing subscriber.........');
				subscriber.stop();
				client.disconnect();
			});
		})();
    }

    RED.nodes.registerType('Gravity Subscriber', SubscriberNode);
}
