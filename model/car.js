const mongoose = require('mongoose');
const moment = require('moment');

const car = mongoose.Schema(
    {
        // _id: mongoose.Schema.Types.ObjectId,
        carModel: String,
        vehicleNo: String,
        phoneNo: String,
        owner: { type: mongoose.Schema.Types.ObjectId, ref: "rido_owner" }, 
        carCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Car_category"},
        profileImage: String,
        carImage: String,
        insuranceDoc: String,
        verifyInsuranceDoc:{
            type:Boolean,
            default:false,
        }  ,    
        rcDoc: String,
        verifyRcDoc:{
            type:Boolean,
            default:false,
        },  
        permitDoc: String,
        verifyPermitDoc:{
            type:Boolean,
            default:false,
        },
        fitnessDoc: String,
        verifyFitnessDoc:{
            type:Boolean,
            default:false,
        },
        driverId:{type:mongoose.Schema.Types.ObjectId,ref:"rido_drivers"},
        status: {
            type: Number,
            enum : [0,1],
            default: 1
        }
    },
    {timestamps:true}
);

// // Virtual for date generation
// car.virtual('createdOn').get(function () {
//     const generateTime = moment(this.createdAt).format( 'DD-MM-YYYY h:m:ss A');
//     return generateTime;
// });

// // Virtual for date generation
// car.virtual('updatedOn').get(function () {
//     const generateTime = moment(this.updatedAt).format( 'DD-MM-YYYY h:m:ss A');
//     return generateTime;
// });

module.exports = mongoose.model('Car', car);