module.exports = function(RED) {

    function SubscriberNode(config) {
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

		function ack() {
			this.ack();
		}

		setStatus('disconnected');

		let uuid = require('uuid');
		let Gravity = require('gravity-sdk');

		(async () => {

			let client = new Gravity.Client();

			try {
				setStatus('connecting');

				// Connect to gravity
				await client.connect(node.server.server + ':' + node.server.port);
			} catch(e) {
				console.log(e);
			}

			setStatus('registering');

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
				console.log(e);
			}

			setStatus('initializing');

			// Event handler
			subscriber.on('event', (m) => {
				node.send({
					payload: {
						pipelineID: m.pipelineID,
						eventName: m.eventName,
						collection: m.collection,
						message: m.payload,
					},
					ack: ack.bind(m),
				});

//				m.ack();
			});

			// Snapshot handler
			subscriber.on('snapshot', (m) => {
				node.send({
					payload: {
						pipelineID: m.pipelineID,
						collection: m.collection,
						message: m.payload,
					},
					ack: ack.bind(m),
				});

//				m.ack();
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
				console.log(e);
			}

			try {
				// Subscribe to pipelines
				await subscriber.addAllPipelines();
			} catch(e) {
				console.log(e);
			}

			// start immediately
			subscriber.start();

			setStatus('connected');

			node.on('close', () => {
				subscriber.stop();
				client.disconnect();
			});
		})();
    }

    RED.nodes.registerType('Gravity Subscriber', SubscriberNode);
}
