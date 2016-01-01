// TODO: Handle disconnections
// TODO: Handle zookeeper offline
// TODO: Handle reconnection (network)

var zk = require('node-zookeeper-client'),
    EventEmitter = require('events').EventEmitter;


var ZK_CONFIG = {
  // Local MacOSX docker instance
  hosts: '192.168.99.100:2181',
  // Coordination znode
  leader_znode: '/tasks/_leader'
}, Events = {
  GAINED_LEADERSHIP: 'gained_leadership',
  LEADER_CHANGED: 'leader_changed',
  UNEXPECTED_ZK_ERROR: 'unexpected_zk_error'
};

var coordinator = function () {
  var self = this;
  self._client = zk.createClient(ZK_CONFIG.hosts)
  self._client.once('connected', self.lookForLeader.bind(self));
  self._self._client.connect();
  self.isLeader = false;
  self.emiter = new EventEmitter();
};

coordinator.prototype.claimLeadership = function () {
  var self = this;
  if (self.isLeader) {
    return;
  }
  self._client.create(ZK_CONFIG.leader_znode, zk.CreateMode.EPHEMERAL, function (error, path) {
    if (error) {
      if (error.code == zk.Exception.NODE_EXISTS) {
        // Oops too late
        return self.lookForLeader();
      } else {
        return self.emiter.emit(Events.UNEXPECTED_ZK_ERROR, error);
      }
    }
    self.isLeader = true;
    self.emiter.emit(Events.GAINED_LEADERSHIP);
  });
};

coordinator.prototype.lookForLeader = function () {
  var self = this;

  self._client.getData(ZK_CONFIG.leader_znode,
    function watch (event) {
    // Someone else is already the leader
    if (event.type == zk.Event.NODE_DELETED) {
      self.emiter.emit(Events.LEADER_CHANGED);
      self.claimLeadership();
    }
  }, function (error) {
    if (error && error.code == zk.Exception.NO_NODE) {
      // Leader spot available
      return self.claimLeadership();
    } else if (error) {
      return self.emiter.emit(Events.UNEXPECTED_ZK_ERROR, error);
    }
  });
};

var instance = new coordinator();
instance.emiter.on(Events.GAINED_LEADERSHIP, function () {
  console.log("I'm the leader now!")
});
instance.emiter.on(Events.LEADER_CHANGED, function () {
  console.log("Leader changed... let me try...")
});
instance.emiter.on(Events.LEADER_CHANGED, function (error) {
  console.log("Oops! We got an error boss: %s", error);
});

var cleanup = function () {
  console.log('Bye!');
  instance._client.close();
};

process.on('exit', cleanup);
process.on('SIGINT', cleanup);
process.on('uncaughtException', cleanup);
