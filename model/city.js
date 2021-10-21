const mongoose = require('mongoose');
const moment = require('moment');

const city = mongoose.Schema(
    {
        name: String,
        status: {
            type: String,
            enum : ['Y','N'],
            default: 'Y'
        },
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

// Virtual for date generation
city.virtual('createdOn').get(function () {
    const generateTime = moment(this.createdAt).format( 'DD-MM-YYYY h:m:ss A');
    return generateTime;
});
city.virtual('updatedOn').get(function () {
    const generateTime = moment(this.updatedAt).format( 'DD-MM-YYYY h:m:ss A');
    return generateTime;
});

module.exports = mongoose.model('city', city);