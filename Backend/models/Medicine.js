const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },

    name : {
        type : String,
        required : true,
        trim : true
    },

    dosage : {
        type : String,
        required : true,
        trim : true
    },

    notes : {
        type : String,
        trim : true
    },

    times : {
        type : [String],
        required : true,
        validate : {
            validator : function(value){
                return value.length > 0;
            },
            message : 'At least one time must be specified'
        }
    },

    scheduleType : {
        type : String,
        enum : ['daily', 'specific-days'],
        required : true
    },

    daysOfWeek : {
        type : [String],
        enum : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        default : [],
        validate : {
            validator : function(value){
                if(this.scheduleType === 'specific-days') {
                    return value.length > 0;
                }
                return true;
            },
            message : 'At least one day of the week must be specified for specific-days schedule type'
        }
    },

    startDate : {
        type : Date,
        required : true
    },

    endDate : {
        type : Date,
        required : true
    },
},
{
    timestamps : true
}
);

MedicineSchema.index({user : 1});

const Medicine = mongoose.model('Medicine', MedicineSchema);

module.exports = Medicine;