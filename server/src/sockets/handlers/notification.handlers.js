export const handleJoinNotificationRoom = (io, socket, data) => {
    const { userId } = data;
    if (userId) {
        const roomName = `user_${userId}`;
        socket.join(roomName);
        console.log(`[Socket] User ${userId} joined notification room: ${roomName}`);
    }
};
