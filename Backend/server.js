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


app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

app.listen(process.env.PORT, () => {
    console.log(`sever is running on port ${process.env.PORT}`);
})