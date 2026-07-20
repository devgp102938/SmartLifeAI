const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required : true
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
        trim : true,
        minlength : 2,
    },

    dueDate : {
        type : Date,
        required : true
    },

    priority : {
        type : String,
        enum : ['low', 'medium', 'high'],
        default : 'medium'
    },

    status : {
        type : String,
        enum : ['pending', 'completed'],
        default : 'pending'
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

const Task = mongoose.model('Task', TaskSchema);

module.exports = Task;