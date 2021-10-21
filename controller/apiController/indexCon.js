const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const tokens = require('../../config/tokens');
const { admin } = require('../../config/fbConfig');
const Driver = require('../../model/drivers');
const Owner = require('../../model/owner');
const Car = require('../../model/car');

const s3 = new AWS.S3({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
});
module.exports = {

    idTokenVerify: async (req, res) => {
        try {
            const { idToken } = req.body;
            if((idToken) && (idToken !== "") && (idToken !== undefined)){
                admin.auth().verifyIdToken(idToken).then((decodedToken) => {
                    const uid = decodedToken.uid;
                    console.log(decodedToken);
                    return res.status(200).json({ status:'success', data: decodedToken });
                }).catch((error) => {
                    return res.status(203).json({ status:'error', error: error.message });
                });
            }else{
                return res.status(203).json({ status:'error', error: "Sorry! Something went wrong." });
            }
        } catch (error) {
            res.status(400).json({ status:'error', error: error.message });
        }
    },

    getNewTokens: async (req, res) => {
        try {
            const { refreshToken } = req.body;
            if (refreshToken){
                let payload = null;
                payload = verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
                // console.log(payload);
                if(payload !== null){
                    const whereCon = { id: payload.userId, is_deleted: '0' };
                    const checkResult = await dbFunction.fetchData(USER_MASTER, "", "", "", whereCon);
                    if(checkResult.length > 0){
                        if(checkResult[0].refresh_token === refreshToken){
                            const accessToken = tokens.createAccessToken(checkResult[0].id);
                            const newRefreshToken = tokens.createRefreshToken(checkResult[0].id);
                            const editData = {
                                refresh_token: newRefreshToken
                            }
                            const updatewhereCon = { id: payload.userId };
                            await dbFunction.update(USER_MASTER,editData,updatewhereCon);
                            return res.status(200).json({ status: 'success', accessToken: `Bearer ${accessToken}`, refreshToken: newRefreshToken });
                        }else{
                            return res.status(203).json({ status: 'error', message: "Invalid refresh token" });
                        }
                    }else{
                        return res.status(203).json({ status: 'error', message: "Invalid refresh token" });
                    }
                }else{
                    return res.status(203).json({ status: 'error', message: "Invalid refresh token" });
                }
            }else{
                return res.status(203).json({ status: 'error', message: "Invalid refresh token" });
            }
        } catch (error) {
            return res.status(400).json({ status: 'error', message: error.message });
        }
    },
    
    driverRegistration : async (req, res) => {
        try {
            const { name,email,phone,countryCode,city,referalCode,password,ownerId,carId,signUpDate } = req.body;
            if ((ownerId) && (ownerId !== "") && (carId) && (carId !== "")) {
            if((name) && (name !== "") && (email) && (email !== "") && (phone) && (phone !== "")){
                const checkUser = await Driver.find({ $or: [{ phone: phone }, { email: email }] });
                if(checkUser.length === 0){
                    const driverUser = new Driver({
                        name: name,
                        countryCode: countryCode,
                        phone: phone,
                        email: email,
                        city: city,
                        owner:ownerId,
                        car:carId,
                        signUpDate:signUpDate,
                        password: await bcrypt.hash(password, 10),
                        referalCode: referalCode,
                    });
                    const driverResult= await driverUser.save();

                    const result=await Driver.findOne({_id:driverResult._id}).populate("car","_id carModel phoneNo vehicleNo");
                    const updateCar=await Car.findByIdAndUpdate(carId,{
                        driverId:driverResult._id
                    })

                    const accesstoken = tokens.createAccessToken(result._id);
                    const refreshToken = tokens.createRefreshToken(result._id);
                    await Driver.findByIdAndUpdate(result._id,{
                        refreshToken: refreshToken,
                        updatedAt: Date.now()
                    }, {new: true});
                    res.status(200).json({ status: 'success', data: result, accessToken: accesstoken, refreshToken: refreshToken });
                }else{
                    return res.status(400).json({ status: 'error', error: 'Phone OR Email ID already exists' });
                }
            }else{
                return res.status(400).json({ status: 'error', error: 'Sorry! Parameter missing.' });
            }   
           } else {
            return res.status(400).json({ status: 'error', error: 'Sorry! OwnerId missing.' });
           }
           
        } catch (error) {
            res.status(400).json({ status:'error', error: error.message });
        }
    },

    ownerRegistration: async (req,res)=>{
        try {            
            const {name,email,phone,countryCode,city,referalCode,password,signUpDate}=req.body;
            if((name) && (name !== "") && (email) && (email !== "") && (phone) && (phone !== "")){            
                const checkOwner=await Owner.find(
                    { $or: [{ phone: phone }, { email: email }] }
                );
                if (checkOwner.length===0) {
                    const ownerUser=new Owner({
                        name,
                        phone,
                        email,
                        city,
                        countryCode,
                        signUpDate,
                        password: await bcrypt.hash(password,10),
                        referalCode,
                    });
                    const result=await ownerUser.save();
                    const accessToken=tokens.createAccessToken(result._id);
                    const refreshToken=tokens.createRefreshToken(result._id);
                    await Owner.findByIdAndUpdate(result._id,
                        {
                            refreshToken:refreshToken,
                            updatedAt: Date.now()
                        },
                        {new:true}
                        );
                        res.status(200).json({
                            status:"success",
                            data:result,
                            accessToken: accessToken,
                            refreshToken: refreshToken
                        });
                }
                else{
                    res.status(400).json({
                        status:"error",
                        error:"Phone or Email ID already exists"
                    });
                }
            }
            else{
                return res.status(400).json({
                    status: 'error', 
                    error: 'Sorry! Parameter missing.' 
                });
            }
        } catch (error) {
            res.status(400).json({ status:'error', error: error.message });
        }
    },

    loginWithPhoneDriver: async (req, res) => {
        try {
            const { phone } = req.body;
            if(phone && (phone !== "")){
                const result = await Driver.findOne({ $or: [{ phone: phone }] });
                if(result){
                    if(result.status === 'A' || result.status === 'P'){
                        const accesstoken = tokens.createAccessToken(result._id);
                        const refreshToken = tokens.createRefreshToken(result._id);
                        await Driver.findByIdAndUpdate(result._id,{
                            refreshToken: refreshToken,
                            updatedAt: Date.now()
                        }, {new: true});
                        if(result.profilePic){
                            result.profilePic = await getSignedUrl(result.profilePic);
                        }
                        for(let i=0; i < result.documents.length; i++){
                            result.documents[i].filename = await getSignedUrl(result.documents[i].filename);
                        }
                        return res.status(200).json({ status: 'success', data: result, accessToken: accesstoken, refreshToken: refreshToken });
                    }else{
                        return res.status(400).json({ status: 'error', error: "Sorry! account is Temporarily blocked by administrator." });
                    }
                }else{
                    return res.status(400).json({ status: 'error', error: "Sorry! No accounts found." });
                }
            }else{
                return res.status(400).json({ status: 'error', error: "Sorry! Something went wrong" });
            }
        } catch (error) {
            return res.status(400).json({ status: 'error', error: error.message });
        }
    },

    loginWithPhoneOwner: async(req,res)=>{
        try {
            const {phone}=req.body;
            if (phone && (phone!=="")) {
                console.log(phone);
                const result=await Owner.findOne({
                    $or:[
                        {phone:phone}
                    ]
                });
                // console.log(result);
                if (result) {
                    if (result.status === 'A' || result.status === 'P') {
                        const accesstoken = tokens.createAccessToken(result._id);
                        const refreshToken = tokens.createRefreshToken(result._id);
                        await Owner.findByIdAndUpdate(result._id,{
                            refreshToken: refreshToken,
                            updatedAt: Date.now()
                        },{new: true});
                        if(result.profilePic){
                            result.profilePic = await getSignedUrl(result.profilePic);
                        }

                        for(let i=0; i < result.documents.length; i++){
                            result.documents[i].filename = await getSignedUrl(result.documents[i].filename);
                        }
                        return res.status(200).json({ status: 'success', data: result, accessToken: accesstoken, refreshToken: refreshToken });
                    } else {
                        return res.status(400).json({ status: 'error', error: "Sorry! account is Temporarily blocked by administrator." });
                    }
                } else {
                    return res.status(400).json({ status: 'error', error: "Sorry! No accounts found." });
                }
            } else {
                return res.status(400).json({ status: 'error', error: "Sorry! Something went wrong" });
            }
        } catch (error) {
            return res.status(400).json({ status: 'error', error: error.message });
        }
    },
    
    driverLogin: async (req, res) => {
        try {
            const { username, password } = req.body;
            if(username && (username !== "") && password && (password !== "")){
                const result = await Driver.findOne({ $or: [{ phone: username }, { email: username }] });
                if(result){
                    if(result.status === 'A' || result.status === 'P'){
                        const matchResult = await bcrypt.compare(password, result.password);
                        if(matchResult === true){
                            const accesstoken = tokens.createAccessToken(result._id);
                            const refreshToken = tokens.createRefreshToken(result._id);

                            await Driver.findByIdAndUpdate(result._id,{
                                refreshToken: refreshToken,
                                updatedAt: Date.now()
                            }, {new: true});

                            if(result.profilePic){
                                result.profilePic = await getSignedUrl(result.profilePic);
                            }
                            for(let i=0; i < result.documents.length; i++){
                                result.documents[i].filename = await getSignedUrl(result.documents[i].filename);
                            }
                            const resultDriver = await Driver.findOne({_id:result._id}).populate("car","_id carModel phoneNo vehicleNo");

                            return res.status(200).json({ status: 'success', data: resultDriver, accessToken: accesstoken, refreshToken: refreshToken });
                        }else{
                            return res.status(400).json({ status: 'error', error: "Incorrect Username Or Password." });
                        }
                    }else{
                        return res.status(400).json({ status: 'error', error: "Sorry! account is still pending Or Temporarily blocked by administrator." });
                    }
                }else{
                    return res.status(400).json({ status: 'error', error: "Sorry! No accounts found." });
                }
            }else{
                return res.status(400).json({ status: 'error', error: "Sorry! Something went wrong" });
            }
        } catch (error) {
            return res.status(400).json({ status: 'error', error: error.message });
        }
    },

    ownerLogin: async (req,res)=>{
        try {
            const {username,password}=req.body;
            if (username && (username!=="") && password && (password!=="")) {
                const result =await Owner.findOne(
                    {
                        $or:[{phone:username},{email:username}]
                    }
                );
                if (result) {
                    if (result.status==="A" || result.status==="P") {
                        const matchResult=await bcrypt.compare(password,result.password);
                        if (matchResult===true) {
                            const accesstoken = tokens.createAccessToken(result._id);
                            const refreshToken = tokens.createRefreshToken(result._id);
                            await Owner.findByIdAndUpdate(result._id,{
                                refreshToken: refreshToken,
                                updatedAt: Date.now()
                            }, {new: true});
                            if(result.profilePic){
                                result.profilePic = await getSignedUrl(result.profilePic);
                            }
                            for(let i=0; i < result.documents.length; i++){
                                result.documents[i].filename = await getSignedUrl(result.documents[i].filename);
                            }
                            const ownerResult=await Owner.findOne({_id:result._id}).populate("cars","_id carModel phoneNo vehicleNo");

                            return res.status(200).json({ status: 'success', data: ownerResult, accessToken: accesstoken, refreshToken: refreshToken });
                        } else {
                            return res.status(400).json({ status: 'error', error: "Incorrect Username Or Password." });
                        }
                    } 
                    // else {
                    //     return res.status(400).json({ status: 'error', error: "Sorry! account is still pending Or Temporarily blocked by administrator." });
                    // }
                } else {
                    return res.status(400).json({ status: 'error', error: "Sorry! No accounts found." });    
                }
            } else {
                return res.status(400).json({ status: 'error', error: "Sorry! Something went wrong" });
            }
        } catch (error) {
            return res.status(400).json({ status: 'error', error: error.message });   
        }
    },

    editProfile: async (req, res) => {
        try {
            const { name, email, password, city, userId } = req.body;
            if(userId && (userId !== "") && (userId !== null) && (userId !== undefined)){
                const updateData = { updatedAt: Date.now() };
                if(email && (email !== "") && (email !== undefined) && (email !== "")){
                    const checkUserEmail = await Driver.findOne({ 
                        $and: [
                            { _id: { $ne: userId } },
                            { $or: [{ email: email }] }
                        ]
                    });
                    if(checkUserEmail){
                        return res.status(400).json({ status: 'error', error: "Sorry! Email Id already registered." });
                    }else{
                        updateData['email'] = email;
                    }
                }
                if(req.files && req.files.profilePic){
                    const allowType = ['image/png', 'image/jpeg', 'image/jpg'];
                    const uploadedFile = req.files.profilePic;
                    updateData['profilePic'] = await fileUpload(uploadedFile,"profile-pic-"+userId,allowType);
                }
                if(name && (name !== "") && (name !== undefined)) updateData['name'] = name;
                if(password && (password !== "") && (password !== undefined)) updateData['password'] = await bcrypt.hash(password, 10);
                if(city && (city !== "") && (city !== undefined)) updateData['city'] = city;
                const updateResult = await Driver.findByIdAndUpdate(userId,updateData, {new: true});
                if(updateResult.profilePic){
                    updateResult.profilePic = await getSignedUrl(updateResult.profilePic);
                }
                if(updateResult){
                    for(let i=0; i < updateResult.documents.length; i++){
                        updateResult.documents[i].filename = await getSignedUrl(updateResult.documents[i].filename);
                    }
                    return res.status(200).json({ status: 'success', data: updateResult });
                }
            }else{
                return res.status(400).json({ status: 'error', error: "Sorry! Something went wrong" });
            }
        } catch (error) {
            return res.status(400).json({ status: 'error', message: error.message });
        }
    },

    editOwnerProfile: async (req,res)=>{
        try {
            const {name,email,password,city,userId}=req.body;
            
            if (userId && (userId !== "") && (userId !== null) && (userId !== undefined)) {
                const updateData = { updatedAt: Date.now() };
                if (email && (email !== "") && (email !== undefined) && (email !== "")) {
                    const checkUserEmail = await Owner.findOne({ 
                        $and: [
                            { _id: { $ne: userId } },
                            { $or: [{ email: email }] }
                        ]
                    });
                    if (checkUserEmail) {
                        return res.status(400).json({ status: 'error', error: "Sorry! Email Id already registered." });
                    } else {
                        updateData['email'] = email;  
                    }
                } 
                if(req.files && req.files.profilePic){
                    const allowType = ['image/png', 'image/jpeg', 'image/jpg'];
                    const uploadedFile = req.files.profilePic;
                    updateData['profilePic'] = await fileUpload(uploadedFile,"profile-pic-"+userId,allowType);
                }
                if(name && (name !== "") && (name !== undefined)) updateData['name'] = name;
                if(password && (password !== "") && (password !== undefined)) updateData['password'] = await bcrypt.hash(password, 10);
                if(city && (city !== "") && (city !== undefined)) updateData['city'] = city;
               
                const updateResult = await Owner.findByIdAndUpdate(userId,updateData, {new: true});
                if(updateResult.profilePic){
                    updateResult.profilePic = await getSignedUrl(updateResult.profilePic);
                }
                console.log(updateData);
                if(updateResult){
                    for(let i=0; i < updateResult.documents.length; i++){
                        updateResult.documents[i].filename = await getSignedUrl(updateResult.documents[i].filename);
                    }
                    return res.status(200).json({ status: 'success', data: updateResult });
                }
            } else {
                return res.status(400).json({ status: 'error', error: "Sorry! Something went wrong" });
            }
        } catch (error) {
            return res.status(400).json({ status: 'error', message: error.message });
        }
    },
    deleteDriverProfile:async(req,res)=>{
        try {
            const phone=req.params.phone;
            if (phone && (phone !== "") && (phone !== null)) {
                const checkUser = await Driver.find({ $or: [{ phone: phone }] });
                if(checkUser.length){

                 Driver.remove({
                    phone: phone
                  }, function (err, driver) {
                    if (err) return res.send(err);
                    res.status(200).json({ message: 'Driver Deleted'});
                  });
                }
                else{
                    res.status(203).json({ status:'error', error: 'Driver Not Found' });  
                }
            } else {
                res.status(203).json({ status:'error', error: 'Sorry! Something went wrong.' });
            }
        } catch (error) {
            res.status(400).json({ status:'error', error: error.message });
        }
    },
    deleteOwnerProfile:async(req,res)=>{
        try {
            const phone=req.params.phone;
            if (phone && (phone !== "") && (phone !== null)) {
                const checkUser = await Owner.find({ $or: [{ phone: phone }] });
                console.log(checkUser);
                if(checkUser.length){
                await Owner.remove({
                    phone: phone
                  }, function (err, owner) {
                    if (err) return res.send(err);
                    res.status(200).json({ message: 'Owner Deleted'});
                  });
                }
                else{
                    res.status(203).json({ status:'error', error: 'Owner Not Found' });  
                }
            } else {
                res.status(203).json({ status:'error', error: 'Sorry! Something went wrong.' });
            }
        } catch (error) {
            res.status(400).json({ status:'error', error: error.message });
        }
    },
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