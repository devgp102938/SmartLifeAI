const mongoose = require('mongoose');

const dailyCheckinSchema = new mongoose.Schema({
    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },

    date : {
        type : String,
        required : true,
        trim : true,
        match : [
            /^\d{4}-\d{2}-\d{2}$/,
            "Date must be in YYYY-MM-DD Format"
        ]
    },
     
    moodScore : {
        type : Number,
        required : true,
        min : 1,
        max : 5,
        validate : {
            validator : Number.isInteger,
            message : "Number must be an Integer"
        }
    },

    mood : {
        type : String,
        trim : true,
        lowercase : true,
        enum :  [
                "happy",
                "calm",
                "excited",
                "neutral",
                "tired",
                "stressed",
                "anxious",
                "sad",
                "frustrated"
            ],
        required : true
    },

    energy : {
        type : Number,
        required : true,
        min : 1,
        max : 5,
        validate : {
            validator : Number.isInteger,
            message : "Number must be an Integer"
        }
    },

    productivity : {
        type : Number,
        required : true,
        min : 1,
        max : 5,
        validate : {
            validator : Number.isInteger,
            message : "Number must be an Integer"
        }
    },

    reflection : {
        type : String,
        trim : true,
        default : "",
        maxlength : 1000
    }
},
{
    timestamps : true
});

dailyCheckinSchema.index({user : 1, date : 1},{unique : true});

const DailyCheckIn = mongoose.model('DailyCheckIn', dailyCheckinSchema);

module.exports = DailyCheckIn;