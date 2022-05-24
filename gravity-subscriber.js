module.exports = function(RED) {

    function SubscriberNode(config) {

        RED.nodes.createNode(this, config);
        var node = this;

		// Getting server information from gravity server node
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
			case 'receiving':
				node.status({
					fill: 'blue',
					shape: 'ring',
					text: 'receiving'
				});
				break;
			}
		}

		function ack() {
			this.ack();
			setStatus('connected');
		}

		setStatus('disconnected');

		let uuid = require('uuid');
		let Gravity = require('gravity-sdk');

		(async () => {
			let client = new Gravity.Client({
				servers: node.server.server + ':' + node.server.port,
				domain: config.domain || 'default',
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
				console.log(e);
				setStatus('disconnected');
				return;
			}

			// Not specify product
			if (!config.product || config.product.length == 0) {
				setStatus('connected');
				return;
			}

			// Subscribe to product
			let product = await client.getProduct(config.product);
			let sub = await product.subscribe([], { seq: 110 });

			setStatus('initializing');

			sub.on('event', (m) => {

				setStatus('receiving');

				node.send({
					payload: {
						seq: m.seq,
						eventName: m.data.eventName,
						table: m.data.table,
						primaryKeys: m.data.primaryKeys,
						primaryKey: m.data.primaryKey,
						time: m.time,
						timeNano: m.timeNano,
						record: m.data.record,
					},
					ack: ack.bind(m),
				});

				// Sent acknoledgement automatically
				if (!config.manuallyAck)
					ack.bind(m)();
			});

			setStatus('connected');

			node.on('close', async () => {
				await sub.unsubscribe();
				client.disconnect();
			});
		})();
    }

    RED.nodes.registerType('Gravity Subscriber', SubscriberNode, {
		credentials: {
			appID: { type: 'text' },
			accessKey: { type: 'text' }
		}
	});
}
