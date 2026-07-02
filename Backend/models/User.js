const mongoose = require('mongoose');

const UserSChema = new mongoose.Schema({
    name : {
        type : String,
        required : true,
        trim : true
    },

    email : {
        type : String,
        required : true,
        unique : true,
        trim : true,
        lowercase : true
    },

    password : {
        type : String,
        required : true,
        select : false
    },

    phone : {
        type : String,
    },

    role : {
        type : String,
        enum : ['user', 'admin'],
        default : 'user'
    },
},
{
    timestamps : true
}
)

const User = mongoose.model('User', UserSChema);

module.exports = User;