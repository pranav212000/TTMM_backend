const express = require('express');
const Event = require('../models/event');
const constants = require('../constants');
const User = require('../models/user');
const { model } = require('mongoose');
const Group = require('../models/group');
const Cash = require('../models/cash');
const { eventId, totalPaid, phoneNumber, toGet, toGive } = require('../constants');
const Transaction = require('../models/transaction');
const splitByOrder = require('./split').splitByOrder;
const splitEvenly = require('./split').splitEvenly;

const router = express.Router();


router.get('/', function (req, res, next) {

    Event.findOne({ [constants.eventId]: req.query.eventId }).then(function (event) {
        if (event === null) {
            res.status(404).send({ isSuccess: false, error: 'Could not find the event : ' + req.query.eventId });
        } else {
            Transaction.findOne({ [constants.transactionId]: event[constants.transactionId] }).then(function (transaction) {
                if (transaction === null) {
                    res.status(404).send({ isSuccess: false, error: 'Could not find the transaction: ' + event[constants.transactionId] });
                } else {
                    res.send(transaction);
                }
            });
        }
    });
});





// Get toGet of a transaction
router.get('/allToGets', function (req, res, next) {
    var eventId = req.query.eventId;
    Event.findOne({ [constants.eventId]: eventId }).then(function (event) {
        if (event === null) {
            console.log('Could not find the event with eventId: ' + eventId);
            res.status(404).send({ isSuccess: false, error: 'Could not find the event with eventId: ' + eventId });
        } else {

            var transactionId = event[constants.transactionId];

            Transaction.findOne({ [constants.transactionId]: transactionId }).then(function (transaction) {
                if (transaction === null) {
                    console.log('Could not find the transaction with transactionId : ' + transactionId);
                    res.status(404).send({ isSuccess: false, error: 'Could not find the transaction with transactionId : ' + transactionId });
                } else {
                    console.log(transaction);
                    var toGet = transaction[constants.toGet];
                    res.send(toGet);
                }
            }).catch(next);
        }
    }).catch(next);
});


router.post('/payBill', function (req, res, next) {
    var body = req.body;

    getEvent(req.query.eventId, function (event) {
        if (event === null) {
            res.status(404).send({ isSuccess: false, error: 'Could not find event' });
        } else {
            var transactionId = event[constants.transactionId];

            Transaction.findOne({ [constants.transactionId]: transactionId })
                .then(function (transaction) {
                    if (transaction === null) {
                        console.log('Could not find transaction');
                        res.status(404).send({ isSuccess: false, error: 'Could not find transaction' });
                    }
                    else {
                        var paid = transaction[constants.paid];
                        var paidIndex = paid.findIndex(obj =>
                            obj[constants.phoneNumber] === body[constants.phoneNumber] &&
                            obj[constants.paymentMode] === body[constants.paymentMode]);
                        if (paidIndex === -1) {
                            paid.push({
                                [constants.phoneNumber]: body[constants.phoneNumber],
                                [constants.amount]: body[constants.amount],
                                [constants.paymentMode]: body[constants.paymentMode],
                                [constants.time]: new Date()

                            });
                            transaction[constants.paid] = paid;
                        } else {
                            var paidAmount = paid[paidIndex][constants.amount];
                            paid[paidIndex][constants.amount] = paidAmount + Number.parseInt(body[constants.amount]);
                            paid[paidIndex][constants.time] = new Date();
                            transaction[constants.paid] = paid;
                        }
                        var toGet = transaction[constants.toGet];
                        var toGive = transaction[constants.toGive];

                        var index = toGive.findIndex(ele => ele[constants.phoneNumber] === body[constants.phoneNumber]);


                        if (index === -1) {
                            // TODO search in to get
                            var index1 = toGet.findIndex(ele => ele[constants.phoneNumber] === body[constants.phoneNumber]);
                            if (index1 === -1) {
                                toGet.push({
                                    [constants.phoneNumber]: body[constants.phoneNumber],
                                    [constants.amount]: body[constants.amount]
                                });
                            } else {
                                toGet[index1][constants.amount] += body[constants.amount];
                            }

                        } else {
                            var amount = toGive[index][constants.amount];
                            if (body[constants.amount] > amount) {       //paid more than toGive => remove from toGive and add to toGet
                                toGive.splice(index, 1);
                                toGet.push({
                                    [constants.phoneNumber]: body[constants.phoneNumber],
                                    [constants.amount]: body[constants.amount] - amount
                                });

                            } else {
                                if (amount - body[constants.amount] === 0)
                                    toGive.splice(index, 1);
                                else
                                    toGive[index][constants.amount] = amount - body[constants.amount];
                            }
                        }

                        transaction[constants.toGive] = toGive;
                        transaction[constants.toGet] = toGet;
                        transaction[constants.totalPaid] += body[constants.amount];

                        transaction.markModified([constants.toGive]);
                        transaction.markModified([constants.toGet]);
                        transaction.markModified([constants.paid]);


                        transaction.save(function (error) {
                            if (error) {
                                console.log(error);
                                res.status(500).send({ isSuccess: false, error: error });
                            } else {
                                res.send(transaction);
                            }
                        });
                    }


                }).catch(next);



            // Transaction.findOneAndUpdate(
            //     { [constants.transactionId]: transactionId },
            //     {
            //         $push: {
            //             [constants.paid]: {
            //                 [constants.phoneNumber]: body[constants.phoneNumber],
            //                 [constants.amount]: body[constants.amount]
            //             }
            //         },
            //         $inc: {
            //             [constants.totalPaid]: body[constants.amount]
            //         }
            //     },
            //     { new: true },
            //     function (error, transaction) {
            //         if (error) {
            //             console.log(error);
            //             res.status(500).send({ isSuccess: false, error: error });
            //         } else {

            //         }

            //     }
            // )
        }
    });
});






// TODO test!
router.post('/payPerson', function (req, res, next) {
    var body = req.body;
    getEvent(req.query.eventId, function (event) {
        if (event === null) {
            res.status(404).send({ isSuccess: false, error: 'Could not find event' });
        } else {
            var transactionId = event[constants.transactionId];

            Transaction.findOne({ [constants.transactionId]: transactionId })
                .then(function (transaction) {
                    if (transaction === null) {
                        console.log('Could not find transaction');
                        res.status(404).send({ isSuccess: false, error: 'Could not find transaction' });
                    }
                    else {

                        // ! BODY structure : 
                        var phoneNumber = body[constants.phoneNumber];
                        var to = body[constants.to];
                        var amount = body[constants.amount];
                        var paymentMode = body[constants.paymentMode];
                        var toGet = transaction[constants.toGet];
                        var toGive = transaction[constants.toGive];
                        // var got = transaction[constants.got];
                        var given = transaction[constants.given];

                        var toGetIndex = toGet.findIndex(ele => ele[constants.phoneNumber] === to);
                        if (toGetIndex !== -1) {
                            var toGetAmount = toGet[toGetIndex][constants.amount];
                            if (toGetAmount > amount) {
                                toGet[toGetIndex][constants.amount] -= amount;
                            } else if (toGetAmount < amount) {
                                toGet.splice(toGetIndex, 1);
                                var toGiveIndex = toGive.findIndex(obj => obj[constants.phoneNumber] === to);
                                if (toGiveIndex !== -1) {
                                    toGive[toGiveIndex][constants.amount] += amount;
                                } else
                                    toGive.push({ [constants.phoneNumber]: to, [constants.amount]: amount - toGetAmount });
                            } else {
                                toGet.splice(toGetIndex, 1);
                            }
                        } else {
                            var toGiveIndex = toGive.findIndex(obj => obj[constants.phoneNumber] === to);
                            if (toGiveIndex !== -1) {
                                toGive[toGiveIndex][constants.amount] += amount;
                            } else
                                toGive.push({ [constants.phoneNumber]: to, [constants.amount]: amount });
                        }

                        //!  REDUCE from toGive the one who is paying
                        var toGiveIndex = toGive.findIndex(obj => obj[constants.phoneNumber] === phoneNumber);
                        if (toGiveIndex !== -1) {
                            if (toGive[toGiveIndex][constants.amount] > amount) {
                                toGive[toGiveIndex][constants.amount] -= amount;
                            } else if (toGive[toGiveIndex][constants.amount] < amount) {
                                toGive.splice(toGiveIndex, 1);
                                toGet.push({ [constants.phoneNumber]: phoneNumber, [constants.amount]: amount - toGive[toGiveIndex][constants.amount] })
                            } else {
                                toGive.splice(toGiveIndex, 1);
                            }
                        } else {
                            toGetIndex = toGet.findIndex(obj => obj[constants.phoneNumber] === phoneNumber);
                            if (toGetIndex !== -1) {
                                toGet[toGetIndex][constants.amount] += amount;
                            } else {
                                toGet.push({ [constants.phoneNumber]: phoneNumber, [constants.amount]: amount })
                            }
                        }

                        var givenIndex = given.findIndex(obj => obj[constants.phoneNumber] === phoneNumber && obj[constants.to] === to);
                        if (givenIndex === -1) {

                            given.push({ [constants.phoneNumber]: phoneNumber, [constants.to]: to, [constants.amount]: amount, [constants.time]: new Date(), [constants.paymentMode]: paymentMode });
                        }
                        else {
                            given[givenIndex][constants.amount] += amount;
                            given[givenIndex][constants.time] = new Date();
                        }
                        // got.push({ [constants.phoneNumber]: to, [constants.from]: phoneNumber, [constants.amount]: amount });




                        transaction[constants.toGive] = toGive;
                        transaction[constants.toGet] = toGet;
                        // transaction[constants.got] = got;
                        transaction[constants.given] = given;

                        transaction.markModified([constants.toGet]);
                        transaction.markModified([constants.toGive]);
                        // transaction.markModified(got);
                        transaction.markModified([constants.given]);

                        transaction.save(function (error) {
                            if (error) {
                                console.log(error);
                                res.status(500).send({ isSuccess: false, error: error });
                            } else {
                                if (paymentMode === constants.cash) {
                                    Cash.findOne({ [constants.paymentId]: body[constants.paymentId] }).then(function (cash) {
                                        cash[constants.got] = 'true';
                                        cash.markModified([constants.got]);
                                        cash.save(function (error) {
                                            if (error) {
                                                console.log(error);
                                            } else {
                                                console.log(cash);
                                            }
                                        })
                                    })
                                }
                                res.send(transaction);
                            }
                        });
                    }
                }).catch(next);


        }
    });
})


function getEvent(eventId, callback) {
    console.log(eventId);
    Event.findOne({ [constants.eventId]: eventId }).then(function (event) {
        console.log(event);
        callback(event);
    });
}





// ASSUMES total cost is correct maybe changed later
router.post('/splitEvenly', function (req, res, next) {
    splitEvenly(req.query.eventId, res, next, true);
});


// FIXME take got and given into consideration
// TODO SPLIT BY QUANTITY one orders one roti
//! Therse split apis are kept so that in case user change the split mode to even to byorder these can be called.
router.post('/splitByOrder', function (req, res, next) {
    splitByOrder(req.query.eventId, res, next, true);
});





module.exports = {
    router: router,
    splitEvenly: splitEvenly,
};