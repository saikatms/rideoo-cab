const express = require('express');
const router = express.Router();
const { apiAuth, apiAuthOwner } = require('../config/authentication');
const indexCon = require('../controller/apiController/indexCon');
const driverCon = require('../controller/apiController/driverCon');
const masterCon = require('../controller/apiController/masterCon');
const driverLocations = require('../controller/apiController/driverLocationCon');
const ownerCon = require('../controller/apiController/ownerCon');
const carCon = require('../controller/apiController/carCon');

// const testCon = require('../controller/apiController/testCon');

////////////// Firebase idToken verify /////////
router.post('/fbToken-verify', indexCon.idTokenVerify);

//Owner
router.post('/owner-sign-up', indexCon.ownerRegistration);
router.post('/ownerLogin', indexCon.ownerLogin);
router.post('/owner-login-with-phone', indexCon.loginWithPhoneOwner);
router.patch('/owner-edit-profile', apiAuthOwner, indexCon.editOwnerProfile);
router.delete('/delete-owner/:phone',indexCon.deleteOwnerProfile);

//Driver
router.post('/driver-sign-up', indexCon.driverRegistration);
router.post('/driverLogin', indexCon.driverLogin);
router.post('/driver-login-with-phone', indexCon.loginWithPhoneDriver);
router.patch('/driver-edit-profile', apiAuth, indexCon.editProfile);
router.delete('/delete-driver/:phone',indexCon.deleteDriverProfile);
// router.patch('/delete-profile', apiAuth, indexCon.editProfile);


router.patch('/upload-document-driver', apiAuth, driverCon.documentsUpload);
router.patch('/update-document-driver', apiAuth, driverCon.updateDocument);
router.delete('/delete-document-driver', apiAuth, driverCon.removeDocument);


router.patch('/upload-document-owner', apiAuthOwner, ownerCon.documentsUpload);
router.patch('/update-document-owner', apiAuthOwner, ownerCon.updateDocument);
router.delete('/delete-document-owner', apiAuthOwner, ownerCon.removeDocument);


router.post('/get-new-token', indexCon.getNewTokens);
router.post('/add-category', apiAuthOwner, masterCon.addCategory);
router.get('/category-list', apiAuthOwner, masterCon.getAllCategory);
router.get('/phone-no-check-owner/:phone',  masterCon.checkPhoneNoOwner);
router.get('/phone-no-check-driver/:phone', masterCon.checkPhoneNoDriver);

router.post('/add-car', apiAuthOwner, masterCon.addCar);
router.get('/car-list/:userId', apiAuthOwner, masterCon.getAllCar);

// router.post('/file-upload-test', testCon.fileUploadDemo);
// router.get('/get-file', testCon.getFileFromBucket);


//Driver Locations
router.get('/driverLocation',driverLocations.nearbyDriverLocation);
router.put('/driverLocationSocket/:id',driverLocations.driverLocationSocket);
router.put('/driverLocation/:id',driverLocations.driverLocation);
router.post('/addDriverLocation',driverLocations.addDriverLocation);



router.get('*', async (req, res) => {
    res.status(404).json({ status: 'error', message: 'Sorry! API your are looking for has not been found'});
});
router.post('*', async (req, res) => {
    res.status(404).json({ status: 'error', message: 'Sorry! API your are looking for has not been found'});
});

module.exports = router;