const AWS = require('aws-sdk');
const Car = require('../../model/car');
const fs = require('fs');

const s3 = new AWS.S3({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY
});

module.exports = {

    documentsUpload: async (req, res) => {
        try {
            const { name, userId } = req.body;
            if((userId) && (userId !== "") && (name) && (name !== "")){
                if(req.files){
                    const allowType = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
                    if(req.files.document_file){
                        const uploadedFile = req.files.document_file;
                        const uploadResult = await fileUpload(uploadedFile,name + userId.substr(userId.length - 4),allowType);
                        const uploadData = await Car.findByIdAndUpdate(userId,{$push:{documents:{name:name, filename:uploadResult}}}, {new: true});
                        if(uploadData.profilePic){
                            uploadData.profilePic = await getSignedUrl(uploadData.profilePic);
                        }
                        for(let i=0; i < uploadData.documents.length; i++){
                            uploadData.documents[i].filename = await getSignedUrl(uploadData.documents[i].filename);
                            uploadData.documents[i].documentName=documentName;
                            uploadData.documents[i].verifyStatus=false;
                        }
                        return res.status(200).json({ status: 'success', data: uploadData });
                    }else{
                        return res.status(203).json({ status:'error', error: "Sorry! Please upload a file." });
                    }
                } else {
                    return res.status(203).json({ status:'error', error: "Sorry! Please upload a file." });
                }
            }else{
                return res.status(203).json({ status:'error', error: "Sorry! Parameter misssing." });
            }
        } catch (error) {
            console.log(error);
            res.status(400).json({ status:'error', error: error.message });
        }
    },

    removeDocument: async (req, res) => {
        try {
            const { docId, userId, imageName } = req.body;
            if((docId) && (docId !== "") && (userId) && (userId !== "") && (imageName) && (imageName !== "")){
                const fileLocation = 'images/'+imageName;
                s3.deleteObject({
                    Bucket: process.env.BUCKET_NAME,
                    Key: fileLocation
                },async (err,data) => {
                    if(err) {
                        return res.status(203).json({ status:'error', error: err.message });
                    }else{
                        const removeData = await Car.findByIdAndUpdate(userId,{$pull:{documents:{_id: docId}}}, {new: true});
                        if(removeData){
                            return res.status(200).json({ status: 'success' });
                        }else{
                            return res.status(203).json({ status:'error', error: "Sorry! Something went wrong." });
                        }
                    }
                });
            }else{
                return res.status(203).json({ status:'error', error: "Sorry! Parameter misssing." });
            }
        } catch (error) {
            res.status(400).json({ status:'error', error: error.message });
        }
    },

    updateDocument: async (req, res) => {
        try {
            const { docId, userId } = req.body;
            const cars = await Car.findOne({_id: userId}, {"documents": 1});
            // console.log(users.documents.length);
            for(let i=0; i<cars.documents.length; i++){
                if(cars.documents[i]._id == docId){
                    if((req.files) && (req.files.document_file)){
                        const uploadedFile = req.files.document_file;
                        const allowType = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
                        const uploadResult = await fileUpload(uploadedFile,cars.documents[i].name + userId.substr(userId.length - 4),allowType);
                        // console.log(uploadResult);
                        if((uploadResult) && (uploadResult !== "")){
                            fs.readFile(uploadedFile.tempFilePath, (err, uploadedData) => {
                                // const fileContent  = Buffer.from(req.files.document_file.data, 'binary');
                                const params = {
                                    Bucket: process.env.BUCKET_NAME,
                                    Key: "images/"+ uploadResult, // File name you want to save as in S3
                                    Body: uploadedData 
                                };
                                s3.upload(params, async (err, data) => {
                                    if (err) {
                                        return res.status(203).json({ status:'error', error: "Sorry! File upload failed." + err.message });
                                    }else{
                                        const updateData = await Car.updateOne({userId, "documents._id": docId},{$set:{'documents.$.filename':data.Key}}, {new: true});
                                        // console.log(updateData);
                                        if(updateData){
                                            //// Delete Old File //////
                                            const oldFile = cars.documents[i].filename;
                                            s3.deleteObject({
                                                Bucket: process.env.BUCKET_NAME,
                                                Key: oldFile
                                            },function (err,data){});
                                            return res.status(200).json({ status: 'success' });
                                        }else{
                                            return res.status(203).json({ status:'error', error: "Sorry! Update Failed." });
                                        }
                                    }
                                });
                            })
                        }else{
                            return res.status(203).json({ status:'error', error: "Sorry! File upload failed." });
                        }
                    } else {
                        return res.status(203).json({ status:'error', error: "Sorry! Please upload a file." });
                    }
                }
            }
        } catch (error) {
            res.status(400).json({ status:'error', error: error.message });
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