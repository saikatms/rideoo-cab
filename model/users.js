const mongoose = require('mongoose');
const moment = require('moment');

const users = mongoose.Schema(
    {
        // _id: mongoose.Schema.Types.ObjectId,
        username: String,
        gender: {
            type: String,
            enum : ['Male','Female'],
        },
        isActive: {
            type: Number,
            default: 1
        },
        userType: {
            type: String,
            enum : ['user','admin'],
            default: 'user'
        },
        email: String,
        password: String,
        name: String,
        age: String,
        address: String,
        createdAt: { 
            type: Date,
            default: Date.now
        },
        updatedAt: { 
            type: Date,
            default: Date.now
        }
    },
    { versionKey: false }
);

users.index({username: "text"});

// Virtual for user name and age
users.virtual('name_age').get(function () {
    return this.name + ', ' + this.age;
});

// Virtual for date generation
users.virtual('updatedOn').get(function () {
    const generateTime = moment(this.updatedAt).format( 'DD-MM-YYYY h:m:ss A');
    return generateTime;
});

module.exports = mongoose.model('users', users);;