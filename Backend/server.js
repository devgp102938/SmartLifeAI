const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

const connectDB = require('./config/db.js');
connectDB();

const authRoutes = require('./routes/authRoutes.js');
const taskRoutes = require('./routes/taskRoutes.js');
const habitRoutes = require('./routes/habitRoutes.js');
const medicineRoutes = require('./routes/medicineRoutes.js');
const dailyCheckInRoutes = require('./routes/dailyCheckInRoutes.js');
const dashboardRoutes = require('./routes/dashboardRoutes.js');
const aiRoutes = require('./routes/aiRoutes.js');

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/medicine', medicineRoutes);
app.use('/api/check-ins', dailyCheckInRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});