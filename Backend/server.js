require('dotenv').config();

const express = require('express');
const app = express();
app.use(express.json());

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const connectDB = require('./config/db.js');
connectDB();

const authRoutes = require('./routes/authRoutes.js');
const taskRoutes = require('./routes/taskRoutes.js');
const habitRoutes = require('./routes/habitRoutes.js');


app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/habits', habitRoutes);

app.listen(process.env.PORT, () => {
    console.log(`sever is running on port ${process.env.PORT}`);
})