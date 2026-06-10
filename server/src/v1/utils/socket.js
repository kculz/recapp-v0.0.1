const { Server } = require('socket.io');
const { verifyToken } = require('./jwt');
const { User } = require('../../models');

let io = null;
const activeCalls = new Map();

const getRoomName = (userId) => `user:${userId}`;

const isUserBusy = (userId) => {
  for (const call of activeCalls.values()) {
    if ((call.callerId === userId || call.recipientId === userId) && call.status !== 'ended') {
      return true;
    }
  }

  return false;
};

const removeCall = (roomId) => {
  activeCalls.delete(roomId);
};

const initIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  // Handshake Token Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = verifyToken(token);
      if (!decoded || !decoded.id) {
        return next(new Error('Authentication error: Invalid token'));
      }

      const user = await User.findByPk(decoded.id);
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      if (user.status !== 'Active') {
        return next(new Error('Authentication error: Account is inactive'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: ' + err.message));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    const userId = user.id;

    console.log(`[Socket] Connection established: ${user.name} (${user.role}) - ID: ${socket.id}`);

    // Route user to personal room
    socket.join(getRoomName(userId));

    // If Admin/Counselor, route to safety notifications room
    if (user.role === 'Admin' || user.role === 'SuperAdmin' || user.role === 'Counselor') {
      socket.join('admin:alerts');
      console.log(`[Socket] Authorized administrative room routing: user:${userId} joined admin:alerts`);
    }

    socket.on('call:invite', async (payload, ack) => {
      try {
        const { roomId, callType, recipientId, recipientName } = payload || {};
        if (!roomId || !callType || !recipientId) {
          throw new Error('Call room, type, and recipient are required.');
        }

        if (Number(recipientId) === userId) {
          throw new Error('You cannot call yourself.');
        }

        if (isUserBusy(userId) || isUserBusy(Number(recipientId))) {
          throw new Error('One of the participants is already in another call.');
        }

        const recipientSockets = await io.in(getRoomName(recipientId)).fetchSockets();
        if (!recipientSockets.length) {
          throw new Error(`${recipientName || 'The recipient'} is currently offline.`);
        }

        const call = {
          roomId,
          callType,
          callerId: userId,
          callerName: user.name,
          callerEmail: user.email,
          recipientId: Number(recipientId),
          recipientName: recipientName || 'Participant',
          status: 'ringing',
          createdAt: new Date().toISOString()
        };

        activeCalls.set(roomId, call);
        io.to(getRoomName(recipientId)).emit('call:incoming', call);
        io.to(getRoomName(userId)).emit('call:outgoing', call);

        if (typeof ack === 'function') {
          ack({ success: true, data: call });
        }
      } catch (error) {
        if (typeof ack === 'function') {
          ack({ success: false, error: error.message });
        }
      }
    });

    socket.on('call:accept', (payload, ack) => {
      try {
        const { roomId } = payload || {};
        const call = activeCalls.get(roomId);

        if (!call) {
          throw new Error('That call is no longer available.');
        }

        if (call.recipientId !== userId) {
          throw new Error('You are not authorized to accept this call.');
        }

        call.status = 'accepted';
        call.acceptedAt = new Date().toISOString();
        activeCalls.set(roomId, call);

        io.to(getRoomName(call.callerId)).emit('call:accepted', call);
        io.to(getRoomName(call.recipientId)).emit('call:accepted', call);

        if (typeof ack === 'function') {
          ack({ success: true, data: call });
        }
      } catch (error) {
        if (typeof ack === 'function') {
          ack({ success: false, error: error.message });
        }
      }
    });

    socket.on('call:decline', (payload, ack) => {
      try {
        const { roomId, reason } = payload || {};
        const call = activeCalls.get(roomId);

        if (!call) {
          throw new Error('That call is no longer available.');
        }

        if (call.recipientId !== userId && call.callerId !== userId) {
          throw new Error('You are not authorized to decline this call.');
        }

        io.to(getRoomName(call.callerId)).emit('call:declined', {
          ...call,
          declinedById: userId,
          declinedByName: user.name,
          reason: reason || 'declined'
        });
        io.to(getRoomName(call.recipientId)).emit('call:declined', {
          ...call,
          declinedById: userId,
          declinedByName: user.name,
          reason: reason || 'declined'
        });

        removeCall(roomId);

        if (typeof ack === 'function') {
          ack({ success: true });
        }
      } catch (error) {
        if (typeof ack === 'function') {
          ack({ success: false, error: error.message });
        }
      }
    });

    socket.on('call:end', (payload, ack) => {
      try {
        const { roomId, reason } = payload || {};
        const call = activeCalls.get(roomId);

        if (!call) {
          if (typeof ack === 'function') {
            ack({ success: true });
          }
          return;
        }

        if (call.callerId !== userId && call.recipientId !== userId) {
          throw new Error('You are not authorized to end this call.');
        }

        io.to(getRoomName(call.callerId)).emit('call:ended', {
          ...call,
          endedById: userId,
          endedByName: user.name,
          reason: reason || 'ended'
        });
        io.to(getRoomName(call.recipientId)).emit('call:ended', {
          ...call,
          endedById: userId,
          endedByName: user.name,
          reason: reason || 'ended'
        });

        removeCall(roomId);

        if (typeof ack === 'function') {
          ack({ success: true });
        }
      } catch (error) {
        if (typeof ack === 'function') {
          ack({ success: false, error: error.message });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Connection closed: ${user.name} - ID: ${socket.id}`);

      for (const [roomId, call] of activeCalls.entries()) {
        if (call.callerId === userId || call.recipientId === userId) {
          io.to(getRoomName(call.callerId)).emit('call:ended', {
            ...call,
            endedById: userId,
            endedByName: user.name,
            reason: 'disconnected'
          });
          io.to(getRoomName(call.recipientId)).emit('call:ended', {
            ...call,
            endedById: userId,
            endedByName: user.name,
            reason: 'disconnected'
          });
          removeCall(roomId);
        }
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io server not initialized');
  }
  return io;
};

const sendDirectMessage = (receiverId, messageData) => {
  if (!io) return;
  io.to(`user:${receiverId}`).emit('new_message', messageData);
  console.log(`[Socket] Dispatched new_message event to room: user:${receiverId}`);
};

const broadcastCrisisAlert = (alertData) => {
  if (!io) return;
  io.to('admin:alerts').emit('crisis_alert', alertData);
  console.log(`[Socket] Broadcasted crisis_alert event to room: admin:alerts`);
};

const broadcastAppointmentEvent = (eventName, appointmentData) => {
  if (!io) return;

  const payload = {
    ...appointmentData,
    eventName
  };

  io.to('admin:alerts').emit(eventName, payload);

  if (appointmentData.clientId) {
    io.to(getRoomName(appointmentData.clientId)).emit('appointment:update', payload);
  }

  if (appointmentData.counselorId) {
    io.to(getRoomName(appointmentData.counselorId)).emit('appointment:update', payload);
  }

  console.log(`[Socket] Broadcasted ${eventName} event for appointment #${appointmentData.id}`);
};

module.exports = {
  initIO,
  getIO,
  sendDirectMessage,
  broadcastCrisisAlert,
  broadcastAppointmentEvent
};
