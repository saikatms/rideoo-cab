const AWS = require('aws-sdk');
const CarCategory = require('../../model/carCategory');
const Car = require('../../model/car');
const Driver = require('../../model/drivers');
const Owner = require('../../model/owner');

const fs = require('fs');

const s3 = new AWS.S3({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
});
module.exports = {

    addCategory: async (req, res) => {
        try {
            const { name } = req.body;
            let imageName = "";
            if(req.files){
                const allowType = ['image/png', 'image/jpeg', 'image/jpg'];
                if(req.files.image_file){
                    const uploadedFile = req.files.image_file;
                    imageName = await fileUpload(uploadedFile,name,allowType);
                }
            }
            const car = new CarCategory({
                name: name,
                image: ((imageName !== "")?imageName:null)
            });
            await car.save();
            res.status(200).json({ status:'success', message: "Category added successfully" });
        } catch (error) {
            res.status(400).json({ status:'error', error: error });
        }
    },

    getAllCategory: async (req, res) => {
        try {
            const categoryList = await CarCategory.find({ status: '1'}, {name:1, image: 1}).sort({ id: 1 });
            for(let i=0; i < categoryList.length; i++){
                categoryList[i].image = await getSignedUrl(categoryList[i].image);
            }
            res.status(200).json({ status:'success', data: categoryList });
        } catch (error) {
            res.status(400).json({ status:'error', error: error.message });
        }
    },

    checkPhoneNoOwner : async (req, res) => {
        try {
            const phoneNo = req.params.phone;
            if(phoneNo && (phoneNo !== "") && (phoneNo !== null)){
                const checkUser = await Owner.find({ $or: [{ phone: phoneNo }] });
                console.log(checkUser);
                if(checkUser.length === 0){
                    res.status(200).json({ status:'success' });
                }else{
                    res.status(203).json({ status:'error', error: 'Already registered' });
                }
            }else{
                res.status(203).json({ status:'error', error: 'Sorry! Something went wrong.' });
            }
        } catch (error) {
            res.status(400).json({ status:'error', error: error.message });
        }
    },

    checkPhoneNoDriver : async (req, res) => {
        try {
            const phoneNo = req.params.phone;
            if(phoneNo && (phoneNo !== "") && (phoneNo !== null)){
                const checkUser = await Driver.find({ $or: [{ phone: phoneNo }] });
                console.log(checkUser);
                if(checkUser.length === 0){
                    res.status(200).json({ status:'success' });
                }else{
                    res.status(203).json({ status:'error', error: 'Already registered' });
                }
            }else{
                res.status(203).json({ status:'error', error: 'Sorry! Something went wrong.' });
            }
        } catch (error) {
            res.status(400).json({ status:'error', error: error.message });
        }
    },

    addCar: async (req, res) => {
        try {
            const { categoryId, phoneNo, userId, carModel, vehicleNo } = req.body;
            if(categoryId && userId && phoneNo && (userId !== "") && (categoryId !== "") && (phoneNo !== "") && carModel && vehicleNo && (carModel !== "") && (vehicleNo !== "")){
                const checkPhone = await Car.find({ $and: [{ phoneNo: phoneNo }] });
                if(checkPhone.length === 0){
                    let profileImage ="", carImage = "", insuranceDoc = "", rcDoc = "", permitDoc = "", fitnessDoc = "";
                    if(req.files){
                        const allowType = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
                        if(req.files.profileImage){
                            const uploadedFile = req.files.profileImage;
                            profileImage = await fileUpload(uploadedFile,"Profile Photo",allowType);
                        }
                        if(req.files.carImage){
                            const uploadedFile = req.files.carImage;
                            carImage = await fileUpload(uploadedFile,"Car Photo",allowType);
                        }
                        if(req.files.insuranceDoc){
                            const uploadedFile = req.files.insuranceDoc;
                            insuranceDoc =await fileUpload(uploadedFile,"Insurance Paper",allowType);
                        }
                        if(req.files.rcDoc){
                            const uploadedFile = req.files.rcDoc;
                            rcDoc = await fileUpload(uploadedFile,"RC Paper",allowType);
                        }
                        if(req.files.permitDoc){
                            const uploadedFile = req.files.permitDoc;
                            permitDoc = await fileUpload(uploadedFile,"Permit Paper",allowType);
                        }
                        if(req.files.fitnessDoc){
                            const uploadedFile = req.files.fitnessDoc;
                            fitnessDoc = await fileUpload(uploadedFile,"Fitness Paper",allowType);
                        }
                    }
                    const driverCar = new Car({
                        carModel: carModel,
                        phoneNo: phoneNo,
                        vehicleNo: vehicleNo,
                        owner: userId,
                        carCategory: categoryId,
                        profileImage: profileImage,
                        carImage: carImage,
                        insuranceDoc: insuranceDoc,
                        rcDoc: rcDoc,
                        permitDoc: permitDoc,
                        fitnessDoc: fitnessDoc,
                    });
                    const data = await driverCar.save();
                    const driverById = await Owner.findById(userId);
                    driverById.cars.push(driverCar);
                    await driverById.save();

                    const categoryById = await CarCategory.findById(categoryId);
                    categoryById.cars.push(driverCar);
                    await categoryById.save();
                    res.status(200).json({ status:'success', message: "Car added successfully" });
                }else{
                    res.status(203).json({ status:'error', error: "Phone no already used for adding a car" });
                }
            }else{
                res.status(203).json({ status:'error', error: "Sorry! Category misssing" });
            }
        } catch (error) {
            console.log(error);
            res.status(400).json({ status:'error', error: error.message });
        }
    },

    getAllCar: async (req, res) => {
        try {
            const { userId } = req.params;
            if(userId && userId !== ""){
                // const userCars = await Car.remove({owner: userId});
                const userCars = await Car.find({owner: userId}).populate("owner", "name email phone").populate("carCategory", "name image").populate("driverId","_id name phone ");
                for(let i=0; i < userCars.length; i++){
                    if(userCars[i].carCategory.image) {
                        userCars[i].carCategory.image = await getSignedUrl(userCars[i].carCategory.image);
                    }
                    if(userCars[i].profileImage){
                         userCars[i].profileImage = await getSignedUrl(userCars[i].profileImage);
                    }
                    if(userCars[i].carImage) {
                        userCars[i].carImage = await getSignedUrl(userCars[i].carImage);
                    }
                    if(userCars[i].insuranceDoc){
                        userCars[i].insuranceDoc = await getSignedUrl(userCars[i].insuranceDoc);
                    }
                    if(userCars[i].rcDoc) {
                        userCars[i].rcDoc = await getSignedUrl(userCars[i].rcDoc);
                    }
                    if(userCars[i].permitDoc) {
                        userCars[i].permitDoc = await getSignedUrl(userCars[i].permitDoc);
                    }
                    if(userCars[i].fitnessDoc) {
                        userCars[i].fitnessDoc = await getSignedUrl(userCars[i].fitnessDoc);
                    }
                    return res.status(200).json({ status:'success', data: userCars });

                }
            }
        } catch (error) {
            return res.status(400).json({ status:'error', error: error.message });
        }
    }
}

async function getSignedUrl(keyName){
    try {
        const s3 = new AWS.S3({
            signatureVersion: 'v4',
            accessKeyId: process.env.ACCESS_KEY_ID,
            secretAccessKey: process.env.SECRET_ACCESS_KEY
        });
        const params = {
            Bucket: process.env.BUCKET_NAME,
            Key: keyName
        };
        
        const headCode = await s3.headObject(params).promise();
        if(headCode){
            const signedUrl = s3.getSignedUrl('getObject', params);
            return signedUrl;
        }else{
            throw new Error('Sorry! File not found')
        }
    } catch (error) {
        if (error.code === 'NotFound' || error.code === 'Forbidden') {
            throw new Error('Sorry! File not found')
        }
    }
    
}
async function fileUpload(requestFile,fileName,allowType){
    try {
        return new Promise(function(resolve, reject) {
            const uploadedFile = requestFile;
            if(allowType.includes(uploadedFile.mimetype)) {
                let uploadedFileName = uploadedFile.name;
                const filenameSplit = uploadedFileName.split('.');
                const fileExtension = filenameSplit[filenameSplit.length-1];
                uploadedFileName = fileName.toLowerCase().replace(" ", "-") +'-'+ Date.now()+ '.' + fileExtension;
                fs.readFile(uploadedFile.tempFilePath, (err, uploadedData) => {
                    const params = {
                        Bucket: process.env.BUCKET_NAME,
                        Key: "images/"+ uploadedFileName, // File name you want to save as in S3
                        Body: uploadedData 
                    };
                    s3.upload(params, async (err, data) => {
                        if (err) {
                            return reject("Sorry! File upload failed. " + err.message);
                        }else{
                            resolve(data.Key);
                        }
                    });
                });
            }else{
                return reject("Sorry! Invalid File.");
            }
        });
    } catch (error) {
        return reject(error.message);
    }
}