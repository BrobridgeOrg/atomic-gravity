module.exports = function(RED) {

    function SubscriberNode(config) {

		const util = require('util');

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

		async function initSubscriber(client) {

			// Not specify product
			if (!config.product || config.product.length == 0) {
				setStatus('connected');
				return;
			}

			setStatus('initializing');

			// Subscribe to product
			let product = await client.getProduct(config.product);
			let subOpts = {
				seq: Number(config.startseq) || 1,
				delivery: config.delivery || 'new'
			};

			if (config.delivery == 'startSeq') {
				node.log(util.format('Initializing subscriber (domain=%s, product=%s, delivery=%s, seq=%d)', client.opts.domain, product.name, subOpts.delivery, subOpts.seq));
			} else {
				node.log(util.format('Initializing subscriber (domain=%s, product=%s, delivery=%s)', client.opts.domain, product.name, subOpts.delivery));
			}

			let sub = await product.subscribe([], subOpts);

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

			node.log(util.format('Subscriber is ready (domain=%s, product=%s, delivery=%s)', client.opts.domain, product.name, subOpts.delivery));

			node.on('close', async () => {
				node.log(util.format('Closing subscriber (domain=%s, product=%s, delivery=%s)', client.opts.domain, product.name, subOpts.delivery));
				await sub.unsubscribe();
			});

			setStatus('connected');
		}

		if (!node.server) {
			setStatus('disconnected');
			return;
		}

		let client = new Gravity.Client({
			servers: node.server.server + ':' + node.server.port,
			domain: config.domain || 'default',
			token: config.accessToken,
			waitOnFirstConnect: true
		});
		node.gravityClient = client;

		// Initializing event handlers
		client.on('disconnect', () => {
			setStatus('disconnected');
		});

		client.on('reconnect', () => {
			node.log('Reconnecting to Gravity... ' + client.opts.servers);
			setStatus('connecting');
		});

		client.on('connected', () => {

			setStatus('connected');

			initSubscriber(client);
		});

		// Connect to gravity
		setStatus('connecting');
		node.log('Connecting to Gravity... ' + client.opts.servers);
		client.connect();

		node.on('close', async () => {
			node.log('Close current connection');
			setStatus('disconnected');
			client.disconnect();
		});
    }

    RED.nodes.registerType('Gravity Subscriber', SubscriberNode, {
		credentials: {
			appID: { type: 'text' },
			accessToken: { type: 'text' }
		}
	});
}
