Leader Election with Zookeeper
===

One program run in `n` hot copies. Only one process is allowed to be run at the
same time. The other `n-1` copies must wait until the running copies finishes or
dies before executing.

The idea is to use Zookeeper as a leader election. Only the leader will be allowed
to run the program. The other copies must wait until the running process dies
before electing a new leader.

The idea is achieve high availability for singleton processes. So, if the running
process crashes, we are sure that the programmed task will still be executed.

We assume the programmed task is atomic. That is, it won't matter in what state
the last leader left, the new leader will continue performing the task from the
beginning. Note that this implies that the task is stateless loop, or that the
source of the state is external to the process (e.g. database, redis, etc.)

# Handling state and recovery

Given a task with `m` steps (not including loops), we can still setup Zookeeper
as a leader election coordinator with the ability to recover state from a crashing
leader.

## Asynchronously

The current leader should publish it's current state to a known and reliable
source after completing each one of the `m` steps. Given a state, each step
should be idempotent, that is, it should do exactly the same subtask and should
have the same resulting state every time it runs with a given initial state.

Once a new process is elected as a leader it should fetch the last published
state from the known source. The publish state should include the next step to
be executed at the time this state was published.

This should be enough for the new leader to run where the last leader left.

**Cons:** The new leader will take longer to boot itself given the latency
it takes to fetch the last state.


## Synchronously



# Leader election mechanism

The mechanism behind this idea using Zookeeper, is to use ZK's ephemeral znodes
to watch on leader disconnection. The leader will be re-chosen when the current
leader crashes and it's session times out or when the leader disconnects.

All `n` processes first check if there is an active leader (the task znode exists).
If it doesn't, they will all try to claim the leadership by creating the ephemeral
znode. Thanks to Zookeeper, only one process should successfully create the znode,
thus claiming leadership.

If the is already an active leader znode, the process should subscribe a watcher
to the znode and watch for a znode deletion event. When this event is triggered,
all processes should re-try to claim leadership.

If the active leader crashes, there might be a recovery mechanism that tries to
reclaim the old ZK session, and the process will maintain leadership.

When no recovery mechanism is present, the old leader ZK session will expire,
deleting the ephemeral znode and triggering the deletion event on all other processes.

It's important to setup a proper session timeout in the ZK configuration, this way
disconnected sessions won't linger on for two long, enhancing availability.

# Coordinator resiliency

How to deal with Zookeeper crashing?
- keep internal consistency
- Reduce singleton critical zones
- ZK clusters
