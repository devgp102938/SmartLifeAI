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

    startDate : {
        type : Date,
        required : true
    },

    endDate : {
        type : Date,
        required : true
    },

    isDeleted : {
        type : Boolean,
        default : false
    },

    deletedAt : {
        type : Date,
        default : null
    }
},
{
    timestamps : true
}
);

MedicineSchema.index({user : 1});

const Medicine = mongoose.model('Medicine', MedicineSchema);

module.exports = Medicine;