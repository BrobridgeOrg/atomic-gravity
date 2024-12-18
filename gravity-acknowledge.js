module.exports = function(RED) {

    function AcknowledgeNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

		node.on('input', function(msg, send, done) {
			//node.log('Acknowledging message');
			if (config.action === 'nak') {
				msg.nak();
			} else {
				msg.ack();
			}

			if (done) {
				return done();
			}
		})
	}

    RED.nodes.registerType('Gravity Acknowledge', AcknowledgeNode);
}

