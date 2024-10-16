import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { Server } from 'socket.io';

const JWT_SECRET = process.env.JWT_SECRET;

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('authenticate', async () => {
      try {
        const cookies = socket.handshake.headers.cookie;
        if (!cookies) {
          console.error('No cookies found');
          socket.emit('auth_error', { message: 'No cookies found' });
          return;
        }

        const token = cookies.split('; ').find(row => row.startsWith('token=')).split('=')[1];

        if (!token) {
          console.error('No token found in cookies');
          socket.emit('auth_error', { message: 'No token provided' });
          return;
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Token verified successfully:', decoded);

        socket.user = decoded;

        const user = await User.findById(decoded.userId);
        if (user) {
          socket.join(user._id.toString());
          console.log(`User ${user._id} authenticated and joined their room`);
        } else {
          console.error('User not found');
          socket.emit('auth_error', { message: 'User not found' });
        }
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('auth_error', { message: 'Invalid token' });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
};

export default initializeSocket;
