const AWS = require('aws-sdk');
const DriverLocations = require('../../model/driverLocations');
const fs = require('fs');

const s3 = new AWS.S3({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
});

module.exports={
    //get nearby drivers
    nearbyDriverLocation: async (req,res)=>{
        try {
            const {longitude,latitude}=req.body
           const driver_locations=await DriverLocations.find(
                { 
                    location: {
                      $near: {
                        $geometry: {
                          type: "Point",
                          coordinates: [longitude, latitude],
                        },
                        $maxDistance: 10000,
                      },
                    },
                }
            );
            res.status(200).send(driver_locations);
        } catch (error) {
            res.status(400).send(error);
        }
    },

    //add driver location
    addDriverLocation: async (req,res)=>{
        try {
            const {longitude,latitude}=req.body
            const addLocation=new DriverLocations({
                driverId:req.body.driverId,
                location:{
                    type:"Point",
                    coordinates:[
                        longitude,
                        latitude                      
                    ]
                  },
                  socketId:req.body.socketId
            });
            // console.log(addLocation);
            addLocation.save((err,msg)=>{
               if (err) {
                console.log(err);

                   res.status(400).send(err);
               }
               res.status(200).send(msg);
           })
        } catch (error) {
            res.status(400).send(error);
        }
    },

    //update driver socket id
    driverLocationSocket : async (req,res)=>{
     try {
        const io = req.app.io
        if (!req.body.socketId) {
            res.status(400);
            res.json({
                error:'Bad Data'
            });
        }
        else{
            const driver_socketId=await DriverLocations.updateOne(
                {_id:req.param.id},
                {
                    $set: { socketId: req.body.socketId }
                },
                (err, updateDetails) => {
                    if (err) {
                      res.status(400).send(err);
                    } else {
                      res.status(200).send(updateDetails);
                    }
                  }
            );
        }  
     } catch (error) {
        res.status(400).send(error);

     }       
    },

    //Update Location by driver to user
    driverLocation: async (req,res)=>{
        try {
            const io=req.app.io;
            const latitude=parseFloat(req.body.latitude);
            const longitude=parseFloat(req.body.longitude);

            if (!latitude || !longitude) {
                res.status(400);
                res.json({
                error: "Bad Data",
                });
            }
            else{
                await DriverLocations.updateOne(                    
                { _id: req.params.id },
                {
                    $set: {
                    socketId: location.socketId,
                    location: {
                        type: "Point",
                        coordinates: [longitude, latitude],
                    },
                    },
                },
                (err, updateDetails) => {
                    if (err) {
                    console.log(updateDetails);
                    res.send(err);
                    }
                    if (updateDetails) {
                    console.log(updateDetails);
                    //Get updated location
                    DriverLocations.findOne(
                        {
                        _id: req.params.id,
                        },
                        (error, updateLocation) => {
                        if (error) {
                            res.status(400).send(error);
                        }
                        res.status(200).send(updateLocation);
                        }
                    );
                    }
                }
                );
            }
        } catch (error) {
            res.status(400).send(error);
        }
    }
        
}