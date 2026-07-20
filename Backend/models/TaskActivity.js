const mongoose = require('mongoose');

const TaskActivitySchema = new mongoose.Schema({
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

    action : {
        type : String,
        enum : [
            "completed",
            "uncompleted"
        ],
        required : true
    },

    actionAt : {
        type : Date,
        default : Date.now,
        required : true
    },

    dueDateAtAction: {
        type: Date,
        required: true,
        default : null
    }
},
{
    timestamps : true
}
);

TaskActivitySchema.index({user : 1, actionAt : -1});
TaskActivitySchema.index({task : 1, actionAt : -1});
TaskActivitySchema.index({user : 1, task : 1});

const TaskActivity = mongoose.model('TaskActivity', TaskActivitySchema);

module.exports = TaskActivity;