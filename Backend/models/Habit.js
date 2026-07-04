const mongoose = require('mongoose');

const HabitSchema = new mongoose.Schema({
    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required : true,
    },

    title : {
        type : String,
        required : true,
        trim : true,
        minlength : 2,
        maxlength : 100
    },

    description : {
        type : String,
        minlength : 2,
        trim : true
    },

    durationDays : {
        type : Number,
        required : true,
        min : 1,
        max : 365
    },

    startDate : {
        type : Date,
        required : true
    },

    endDate : {
        type : Date,
        required : true
    }
},
    {
        timestamps : true
    }
);

const Habit = mongoose.model('Habit', HabitSchema);

module.exports = Habit;