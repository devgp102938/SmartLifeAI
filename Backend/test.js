const testing = require('./services/analyticsService.js');
const connectDB = require('../Backend/config/db.js');
const userId = "6a46298747190ed5917db05e";
require('dotenv').config();
const runTest = async () => {

    try {

      await connectDB();

        const result = await testing.getAnalytics({
            userId,
            period: 'last7days',
            timezone: 'Asia/Kolkata'
        });

        console.log(JSON.stringify(result, null, 2));

    } catch (error) {

        console.error(error);

    }
};

runTest();