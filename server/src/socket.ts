import { Server } from 'socket.io';
import http from 'http';
import { processService } from './services/ProcessService';

let io: Server;

export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Allow all origins for now, configure for production later
      methods: ["GET", "POST"]
    }
  });

  processService.on('log', (log: string) => {
    io.emit('console-log', log);
  });

  processService.on('status', (status: string) => {
    io.emit('server-status', status);
  });

  processService.on('stats', (stats: any) => {
    io.emit('server-stats', stats);
  });

  io.on('connection', (socket) => {
    console.log('A user connected');
    socket.emit('server-status', processService.getStatus());

    
    socket.emit('server-status', processService.getStatus());

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
