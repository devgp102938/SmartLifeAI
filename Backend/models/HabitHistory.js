const mongoose = require('mongoose');

const HabitHistorySchema = new mongoose.Schema({

    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required : true,
    },
    
    habit : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Habit',
        required : true,
    },

    date : { 
        type : Date,
        required : true,
    },

    completedAt : {
        type : Date,
        default : Date.now
    },
},{
    timestamps :true
});

HabitHistorySchema.index(
    {
        habit : 1,
        date : 1
    },
    {
        unique : true
    }
);


const HabitHistory = mongoose.model('HabitHistory', HabitHistorySchema);

module.exports = HabitHistory;