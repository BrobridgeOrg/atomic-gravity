module.exports = function(RED) {

    function PublishNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

		// Initializing gravity client
		let uuid = require('uuid');
		let Gravity = require('gravity-sdk');
		let client = new Gravity.Client();

		(async () => {

			try {
				// Connect to gravity
				await client.connect(node.server.server + ':' + node.server.port);
			} catch(e) {
				console.log(e.message);
			}

			// Creating adapter
			let adapter = client.createAdapter({
				verbose: true,
			});

			try {
				let adapterID = config.adapterID || uuid.v1(); 
				let componentName = 'atomic-adapter.' + adapterID; 
				let adapterName = config.name || 'Atomic Adapter'; 

				// Register adapter
				await adapter.register(componentName, adapterID, adapterName);
			} catch(e) {
				console.log(e.message);
			}

		})();

        node.on('input', async (msg) => {

			if (!msg.eventName)
				return;

			await adapter.publish(msg.eventName, JSON.stringify(msg.payload));
        });
    }

    RED.nodes.registerType('Gravity Publish', PublishNode);
}
