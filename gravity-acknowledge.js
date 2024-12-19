module.exports = function(RED) {

    function AcknowledgeNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

		node.on('input', function(msg, send, done) {
			if (msg.error && config.action === 'nak') {
				msg.nak();
			} else if(!msg.error && config.action === 'ack'){
				msg.ack();
			}

			if (done) {
				return done();
			}
		})
	}

    RED.nodes.registerType('Gravity Acknowledge', AcknowledgeNode);
}

