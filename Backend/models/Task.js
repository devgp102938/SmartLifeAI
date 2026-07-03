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
        trim : true
    },

    description : {
        type : String,
        trim : true
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
    }
},
{
    timestamps : true
}
);

const Task = mongoose.model('Task', TaskSchema);

module.exports = Task;