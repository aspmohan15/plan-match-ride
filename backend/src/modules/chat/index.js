export default async function (fastify, opts) {
  // Store connected clients grouped by groupId
  const rooms = new Map();

  fastify.get('/group/:groupId', { websocket: true }, (connection, req) => {
    const { groupId } = req.params;

    if (!rooms.has(groupId)) {
      rooms.set(groupId, new Set());
    }
    const room = rooms.get(groupId);
    room.add(connection);

    connection.socket.on('message', message => {
      let parsedMessage;
      try {
        parsedMessage = JSON.parse(message.toString());
      } catch (err) {
        // Ignore non-JSON messages for this mock
        return;
      }

      // Broadcast the message back to all clients in the same group
      for (const client of room) {
        if (client.socket.readyState === 1) { // 1 = OPEN
          client.socket.send(JSON.stringify(parsedMessage));
        }
      }
    });

    connection.socket.on('close', () => {
      room.delete(connection);
      if (room.size === 0) {
        rooms.delete(groupId);
      }
    });
  });
}
