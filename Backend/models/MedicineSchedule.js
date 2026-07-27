const mongoose = require("mongoose");

const MedicineScheduleSchema = new mongoose.Schema({
    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },

    medicine : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Medicine',
        required : true
    },

    times : [{
        type : String,
        required : true,
        trim : true
    }],
    
    scheduleType : {
        type : String,
        enum : ['daily', 'specific-days'],
        required : true
    },
    
    daysOfWeek : {
        type : [String],
        enum : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        default : [],
        trim : true,
        lowercase : true
    },
        
    effectiveFrom : {
        type : Date,
        required : true
    },

    effectiveUntil : {
        type : Date,
        default : null
    },

    isActive : {
        type : Boolean,
        default : true
    },

    version : {
        type : Number,
        default : 1
    }
},
{
    timestamps : true
});

MedicineScheduleSchema.index({
    user : 1,
    medicine : 1,
    effectiveFrom : 1
});

const MedicineSchedule = mongoose.model('MedicineSchedule', MedicineScheduleSchema);

module.exports = MedicineSchedule;