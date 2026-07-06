const mongoose = require('mongoose');

const MedicineLogSchema = new mongoose.Schema({
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

    scheduledDate : {
        type : Date,
        required : true
    },

    scheduledTime : {
        type : String,
        required : true
    },

    status : {
        type : String,
        enum : ['taken', 'skipped'],
        required : true
    },

    takenAt : {
        type : Date,
        required : function() {
            return this.status === 'taken'; 
        }
    }
},
{
    timestamps : true
});

MedicineLogSchema.index({
    user: 1,
    medicine: 1,
    scheduledDate: 1,
    scheduledTime: 1
}, {
    unique: true
})

const MedicineLog = mongoose.model('MedicineLog', MedicineLogSchema);

module.exports = MedicineLog;