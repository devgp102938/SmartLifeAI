const User = require('../models/User.js');
const bcrypt = require('bcrypt');
const cookieOptions = require('../config/cookieConfig.js');

const generateToken = require('../utils/generateToken.js');

const register = async (req, res) => {
    try
    {
        const {name, email, password, phone} = req.body;

        if(!name || !email || !password || !phone){
            return res.status(401).json({
                message : "All feilds are required to fill"
            });
        }
        if(!email.includes('@') || !email.includes('.')){
            return res.status(422).json({
                message : "Enter valid email address"
            });
        }

        const ExistingUser = await User.findOne({email});

        if(ExistingUser){
            return res.status(400).json({
                message : "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password : hashedPassword,
            phone,
        });

        const token = generateToken(user._id);
        
        res.cookie("token", token, cookieOptions);

        res.status(201).json({
            success : true,
            message : "User has been created",
            user : {
                _id : user._id,
                name : user.name,
                email : user.email,
                role : user.role,
            }
        });
    }
    catch(err)
    {
        res.status(500).json({
            message : err.message
        });
    }
}

const login = async (req, res) => {
    try
    {
        const {email, password} = req.body;

        if(!email || !password ){
            return res.status(401).json({
                message : "All feilds are required to fill"
            });
        }
        if(!email.includes('@') || !email.includes('.')){
            return res.status(422).json({
                message : "Enter valid email address"
        });
        }

        const user = await User.findOne({email}).select("+password");

        if(!user){
            return res.status(404).json({
                message : "invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if(!isMatch){
            return res.status(403).json({
                message : "Incorrect Password!"
            });
        }

        const token = generateToken(user._id);

        res.cookie("token", token, cookieOptions);

        res.status(200).json({
            success : true,
            message : "Log in Successful"
        });
    }
    catch(err){
        res.status(500).json({
            message : err.message
        })
    }
}

const logout = (req, res) => {
    try
    {
        res.clearCookie("token", {
            httpOnly : true,
            secure : false,
            sameSite : "lax",
            path : "/"
        });

        res.status(200).json({
            success : true,
            message : "Logged out"
        })
    }
    catch(err)
    {
        res.status(500).json({
            message : err.message
        })
    }
}

const getMe = async (req, res) => {
    try
    {
        res.status(200).json({
            success : true,
            user : req.user
        })
    }
    catch(err)
    {
        res.status(500).json({
            message : err.message
        })
    }
}

module.exports = {
    register,
    login,
    logout,
    getMe,
}