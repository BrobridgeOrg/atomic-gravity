module.exports = function (RED) {
  function GravityServerNode (n) {
    RED.nodes.createNode(this, n)
    this.server = n.server
    this.port = n.port
  }
  RED.nodes.registerType('gravity-server', GravityServerNode)
}
