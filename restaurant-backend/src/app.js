const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const corsOptions = {
  origin: process.env.CLIENT_URL || '*',
};
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

io.on('connection', (socket) => {
  socket.on('join_room', (room) => {
    if (['admin', 'staff', 'kitchen'].includes(room)) {
      ['admin', 'staff', 'kitchen'].forEach((roleRoom) => {
        socket.leave(roleRoom);
      });
      socket.join(room);
    }
  });
});

app.use(cors(corsOptions));
app.use(express.json());
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const qrRoutes = require('./routes/qrRoutes');
app.use('/api/qr', qrRoutes);

const menuRoutes = require('./routes/menuRoutes');
app.use('/api/menu', menuRoutes);

const tableRoutes = require('./routes/tableRoutes');
app.use('/api/tables', tableRoutes);

const orderRoutes = require('./routes/orderRoutes');
app.use('/api/orders', orderRoutes);

const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payment', paymentRoutes);

const inventoryRoutes = require('./routes/inventoryRoutes');
app.use('/api/inventory', inventoryRoutes);

const reportRoutes = require('./routes/reportRoutes');
app.use('/api/reports', reportRoutes);

const customerRoutes = require('./routes/customerRoutes');
app.use('/api/customers', customerRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});
const settingsRoutes = require('./routes/settingsRoutes');
app.use('/api/settings', settingsRoutes);