const mongoose = require('mongoose');

const TaskCompletionSchema = new mongoose.Schema({
    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required : true
    },

    task : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Task',
        required : true
    },

    completedAt : {
        type : Date,
        default : Date.now
    }
},
{
    timestamps : true
}
);

const TaskCompletion = mongoose.model('TaskCompletion', TaskCompletionSchema);

module.exports = TaskCompletion;