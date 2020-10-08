const express = require('express');
const User = require('../models/user');
const Group = require('../models/group');
const Order = require('../models/order');
const constants = require('../constants');
const { uid, cost } = require('../constants');
const Transaction = require('../models/transaction');
const router = express.Router();


router.post('/addUser', function (req, res, next) {
    if (req.body[constants.profileUrl] === null || req.body[constants.profileUrl] === "")
        req.body[constants.profileUrl] = "https://firebasestorage.googleapis.com/v0/b/ttmm-d9b4f.appspot.com/o/placeholders%2Fprofile_placeholder.jpg?alt=media&token=1cd39587-5053-47ee-a575-5aede7eddc9b";
    User.create(req.body).then(function (user) {
        console.log("User added");
        res.send(user);
    }).catch(next);
});


// Get user data
router.get('/', function (req, res, next) {
    console.log(req.query.phoneNumber);
    User.findOne({ [constants.phoneNumber]: req.query.phoneNumber }).then(function (user) {
        if (user != null)
            res.send(user);
        else
            res.status(404).send({ 'message': 'Could not find the user!!' })
    }).catch(next);
});



// Check if user is present or not      if present -> true
router.get('/checkUser/:uid', function (req, res, next) {
    User.find({ [constants.uid]: req.params.uid }).count().then(function (cnt) {
        if (cnt === 0)
            res.send(false);
        else
            res.send(true);
    }).catch(next);
});


var getUser = function (phoneNumber) {
    return new Promise(function (resolve, reject) {
        User.findOne({ [constants.phoneNumber]: phoneNumber }, function (error, user) {
            if (error) {
                console.log(error);
                reject(error);
            } else {
                if (user === null)
                    resolve({ message: 'User NOT FOUND!' });
                else
                    resolve(user);
            }
        })
    })
}

router.get('/multiple', function (req, res, next) {
    var phoneNumbers = req.body.phoneNumbers;
    Promise.all(phoneNumbers.map(getUser))
        .then(users => res.send(users))
        .catch(error => res.send(error));

})


// Get user groups
router.get('/:uid/orders', function (req, res, next) {
    Order.find({ [constants.uid]: req.params.uid }).then(function (orders) {
        res.send(orders);
    }).catch(next);
});


var checkUser = function (phoneNumber) {
    return new Promise(function (resolve, reject) {
        User.findOne({ [constants.phoneNumber]: phoneNumber }, function (error, user) {
            if (error) {
                console.log(error);
                reject(error);
            } else {
                if (user === null)
                    resolve({ [phoneNumber]: false });
                else
                    resolve({ [phoneNumber]: true });
            }
        });
    });
}


router.get('/syncContacts', function (req, res, next) {

    var contacts = req.body.contacts;

    Promise.all(contacts.map(checkUser))
        .then(response => {
            res.send(response);
        })
        .catch(error => res.send(error));

});

// ? Query -> phoneNumber
router.get('/toGive', function (req, res, next) {
    Transaction.find({ [constants.toGive]: { $elemMatch: { [constants.phoneNumber]: req.query[constants.phoneNumber] } } }).then(function (transactions) {
        console.log(req.query[constants.phoneNumber]);
        if (transactions === null) {
            console.log('Could not find transaction');
            res.status(404).send('Could not find transaction');
        } else {
            res.send(transactions);
        }
    }).catch(next);

});




module.exports = router;