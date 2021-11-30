module.exports = function(RED) {

    function AcknowledgeNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

		node.on('input', function (msg) {
			node.log('Acknowledging message');
			msg.ack();
		})
	}

    RED.nodes.registerType('Gravity AcknowledgeNode', AcknowledgeNode);
}

