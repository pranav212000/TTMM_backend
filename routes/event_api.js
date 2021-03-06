const express = require('express');
const Event = require('../models/event');
const constants = require('../constants');
const User = require('../models/user');
const { model } = require('mongoose');
const Group = require('../models/group');
const { eventId, toGet, split, amount, totalCost, phoneNumber } = require('../constants');
const getOrder = require('./split').getOrder;
const Transaction = require('../models/transaction');
const getEventOrders = require('./split').getEventOrders;
const splitByOrder = require('./split').splitByOrder;
const splitEvenly = require('./split').splitEvenly;
const router = express.Router();


router.post('/addEvent', function (req, res, next) {


    Event.create({ [constants.eventId]: req.body[constants.eventId], [constants.eventName]: req.body[constants.eventName] })
        .then(function (event) {
            Group.findOneAndUpdate(
                { [constants.groupId]: req.query.groupId },
                { $push: { [constants.groupEvents]: event[constants.eventId] } },
                { new: true },
                function (error, success) {
                    if (error) {
                        console.log("ERROR");
                        console.log(error);
                    }
                    else {
                        // console.log('Success');
                        // console.log(success);
                        Transaction.create({ [constants.transactionId]: event.transactionId, [constants.split]: req.query.split }).then(function (transaction) {
                            if (transaction === null) {
                                console.log('Transaction not created, transaction Id: ' + event.transactionId);
                                res.send({ isSuccess: false, message: 'Could not create transaction' });
                            } else {
                                res.send(event);
                            }
                        }).catch(next);
                    }
                }
            );

            // res.send(event);
        }).catch(next);
});

router.get('/', function (req, res, next) {
    Event.findOne({ [constants.eventId]: req.query.eventId }).then(function (event) {
        if (event === null) {
            console.log('Could not find the event');
            res.status(404).send({ isSuccess: false, error: 'Could not find the event' });
        }
        res.send(event);
    }).catch(next);
});

var getEventByOrder = function (order) {
    return new Promise(function (resolve, reject) {
        Event.findOne({ [constants.eventId]: order[constants.eventId] }, function (error, event) {
            if (error) {
                console.log(error);
                reject(error);
            } else {
                if (event === null)
                    resolve({ message: 'Event NOT FOUND!' });
                else
                    resolve(event);
            }
        });
    });
}



var getEvent = function (eventId) {
    return new Promise(function (resolve, reject) {
        Event.findOne({ [constants.eventId]: eventId }, function (error, event) {
            if (error) {
                console.log(error);
                reject(error);
            } else {
                if (event === null)
                    resolve({ message: 'Event NOT FOUND!' });
                else
                    resolve(event);
            }
        })
    })
}


var getEventByTransactionId = function (transactionId) {
    return new Promise(function (resolve, reject) {
        Event.findOne({ [constants.transactionId]: transactionId }, function (error, event) {
            if (error) {
                console.log(error);
                reject(error);
            } else {
                if (event === null)
                    reject({ message: 'Event NOT FOUND!' });
                else
                    resolve(event);
            }
        });
    });
}

// TODO get events by group id!!

router.get('/multiple', function (req, res, next) {
    var eventIds = req.body.eventIds;


    Promise.all(eventIds.map(getEvent))
        .then(events => res.send(events))
        .catch(error => res.send(error));
})


// Add new order also check if exists and update if already exists!
router.post('/:eventId/addOrder', function (req, res, next) {

    Order.findOne({
        [constants.itemName]: req.body[constants.itemName],
        [constants.eventId]: req.params.eventId,
        [constants.cost]: req.body[constants.cost]
    }).then(function (order) {
        if (order === null) {
            Order.create(req.body).then(function (order) {
                addOrderToEvent(order, req.params.eventId, res);

            }).catch(next);
        } else {


            res.send({ message: 'Order already exists please edit existing order' });


            // if(req.body[constants.phoneNumber] === order[constants.creator]) {
            //     order[constants.quantity] += req.body[constants.quantity];
            //     order[constants.totalCost] += req.body[constants.totalCost];

            // } else {

            // }

            // order[constants.quantity] += req.body[constants.quantity];
            // order[constants.totalCost] += req.body[constants.totalCost];
            // var phoneNumbers = order[constants.phoneNumber];
            // order[constants.phoneNumber].push(phoneNumbers[0]);

            // order.markModified([constants.quantity]);
            // order.markModified([constants.totalCost]);
            // order.markModified([constants.phoneNumber]);


            // order.save(function (error) {
            //     if (error) {
            //         console.log(error);
            //         res.status(500).send({ isSuccess: false, error: error });
            //     } else {
            //         res.send({ 'order': order });
            //     }
            // });
        }
    })





    // Order.findOne({
    //     [constants.uid]: req.body[constants.uid],
    //     [constants.eventId]: req.body[constants.eventId],
    //     [constants.itemName]: req.body[constants.itemName]
    // }).countDocuments().then(function (cnt) {
    //     if (cnt !== 0) {
    //         Order.findOneAndUpdate(
    //             {
    //                 [constants.uid]: req.body[constants.uid],
    //                 [constants.eventId]: req.body[constants.eventId],
    //                 [constants.itemName]: req.body[constants.itemName]
    //             },
    //             {
    //                 $inc: {
    //                     [constants.quantity]: req.body[constants.quantity],
    //                     [constants.totalCost]: req.body[constants.totalCost]
    //                 },
    //             },
    //             { new: true },
    //             function (error, order) {
    //                 if (error)
    //                     console.log(error);
    //                 else {
    //                     console.log("Order Updated");
    //                     console.log(order);
    //                     addToTransaction(event, order, false);
    //                     res.send(order);
    //                     // console.log('SUCCESS');
    //                     // console.log(order);
    //                     // addToFinalOrder(order, req.params.eventId, res);
    //                 }
    //             }
    //         );
    //     }
    //     else {
    // Order.create(req.body).then(function (order) {
    //     addOrderToEvent(order, req.params.eventId, res);

    // }).catch(next);
    // }
    // }).catch(next);
});

function addOrderToEvent(order, eventId, res) {
    Event.findOneAndUpdate(
        { [constants.eventId]: eventId },
        { $push: { [constants.orders]: order[constants.orderId] } },
        { new: true },
        function (error, event) {
            if (error) {
                console.error(error);
                res.status(500).send({
                    message: 'Failed: to add order to event',
                    isSuccess: false,
                    error: error
                })
            } else {
                if (event === null) {
                    console.log('Could not find the event');
                    res.status(404).send('Could not find the event');
                } else {
                    console.log("Order add to event");
                    console.log({
                        'event': event,
                        'order': order
                    });

                    addToTransaction(event, order, true, res);
                    console.log(event[constants.transactionId]);
                    console.log(order[constants.totalCost]);
                }
            }
        }
    )
}


function addToTransaction(event, order, isNew, res) {
    
    Transaction.findOne({ [constants.transactionId]: event[constants.transactionId] }).then(function (transaction) {

        if (transaction === null) {
            res.status(404).send({ isSuccess: false, error: "Could not find the transaction with id : " + event[constants.transactionId] });
        } else {
            res.send({ [constants.order]: order });
            if (transaction[constants.split] === constants.byOrder) {
                splitByOrder(event[constants.eventId], res, false);
            } else {
                splitEvenly(event[constants.eventId], res, false);
            }
        }
    });




    // Group.findOne({ [constants.groupEvents]: event[constants.eventId] }).then(function (group) {
    //     if (group === null) {
    //         console.log('Could not find group having event : ' + event[constants.eventId]);
    //         res.status(404).send({ isSuccess: false, error: 'Could not find the group having event : ' + event[constants.eventId] });
    //     } else {

    //         Transaction.findOne({ [constants.transactionId]: event[constants.transactionId] })
    //             .then(function (transaction) {
    //                 if (transaction === null) {
    //                     console.log('Could not find transaction with id: ' + event[constants.transactionId]);
    //                     res.status(404).send({ isSuccess: false, error: 'Could not find transaction with id: ' + event[constants.transactionId] })
    //                 } else {
    //                     var members = group[constants.groupMembers];

    //                     transaction[totalCost] += order[constants.totalCost];

    //                     var splitType = transaction[constants.split];

    //                     if (splitType === constants.evenly) {
    //                         var toGive = transaction[constants.toGive];
    //                         var toGet = transaction[constants.toGet];
    //                         var splitPerMember = order[constants.totalCost] / members.length;
    //                         members.forEach(member => {
    //                             var index = toGive.findIndex(obj => obj[constants.phoneNumber] === member);
    //                             if (index !== -1) {
    //                                 toGive[index][constants.amount] += splitPerMember;
    //                             } else {
    //                                 var index1 = toGet.findIndex(obj => obj[constants.phoneNumber] === member);
    //                                 if (index1 !== -1) {
    //                                     if (toGet[index1][constants.amount] > splitPerMember) {
    //                                         toGet[index1][constants.amount] -= splitPerMember;
    //                                     } else if (toGet[index1][constants.amount] < splitPerMember) {
    //                                         var temp = toGet[index1];
    //                                         toGet.splice(index1, 1);
    //                                         temp[constants.amount] = splitPerMember - temp[constants.amount];
    //                                         toGive.push(temp);
    //                                     } else {
    //                                         toGet.splice(index1, 1);
    //                                     }
    //                                 } else {
    //                                     toGive.push({ [constants.phoneNumber]: member, [constants.amount]: splitPerMember });
    //                                 }
    //                             }
    //                         });

    //                         transaction[constants.toGet] = toGet;
    //                         transaction[constants.toGive] = toGive;

    //                     } else if (splitType === constants.byOrder) {    // TODO if more splits are to be added add here
    //                         var members = order[constants.members];

    //                         var toGive = transaction[constants.toGive];
    //                         var toGet = transaction[constants.toGet];

    //                         var splitPerMember = order[constants.totalCost] / members.length;

    //                         members.forEach(member => {
    //                             var index = toGive.findIndex(obj => obj[constants.phoneNumber] === member);
    //                             if (index !== -1) {
    //                                 toGive[index][constants.amount] += splitPerMember;
    //                             } else {
    //                                 var index2 = toGet.findIndex(obj => obj[constants.phoneNumber] === member);

    //                                 if (index2 !== -1) {
    //                                     if (toGet[index2][constants.amount] > splitPerMember) {
    //                                         toGet[index2][constants.amount] -= splitPerMember;
    //                                     } else if (toGet[index2][constants.amount] < splitPerMember) {
    //                                         var remainingAmount = splitPerMember - toGet[index2][constants.amount];
    //                                         toGet.splice(index2, 1);
    //                                         toGive.push({ [constants.phoneNumber]: member, [constants.amount]: remainingAmount });
    //                                     } else {
    //                                         toGive.push({ [constants.phoneNumber]: member, [constants.amount]: splitPerMember });
    //                                     }
    //                                 } else {
    //                                     toGive.push({ [constants.phoneNumber]: member, [constants.amount]: splitPerMember });
    //                                 }
    //                             }

    //                         });
    //                         transaction[constants.toGet] = toGet;
    //                         transaction[constants.toGive] = toGive;
    //                     }
    //                 }


    //                 transaction.markModified([constants.totalCost]);
    //                 transaction.markModified([constants.toGet]);
    //                 transaction.markModified([constants.toGive]);


    //                 transaction.save(function (error) {
    //                     if (error) {
    //                         console.log(error);
    //                         res.status(500).send({ isSuccess: false, error: error });
    //                     } else {
    //                         // TODO remove transaciton from following line and jsut send the order
    //                         res.send({ order: order, transaction: transaction });
    //                     }
    //                 })
    //             });
    //     }
    // })

    // Transaction.findOne({ [constants.transactionId]: event[constants.transactionId] })
    //     .then(function (transaction) {
    //         transaction[constants.totalCost] += order[constants.totalCost];


    //         if (splitType === constants.evenly) {

    //             var toGive = transaction[constants.toGive];

    //             toGive.forEach(element => {


    //             });


    //         }




    //         transaction.markModified([constants.totalCost]);
    //     });


    // Transaction.findOneAndUpdate(
    //     { [constants.transactionId]: event[constants.transactionId] },
    //     { $inc: { [constants.totalCost]: order[constants.totalCost] } },
    //     { new: true },
    //     function (error, transaction) {
    //         if (error) {
    //             console.log(error);
    //             res.send({
    //                 isSuccess: false,
    //                 error: error
    //             });
    //         } else {
    //             if (transaction === null) {
    //                 console.log('Could not find transaction');
    //                 res.status(404).send({
    //                     isSuccess: false,
    //                     error: 'Could not find transaction'
    //                 });
    //             } else {
    //                 console.log("Amount added to transaction");
    //                 console.log(transaction);
    //                 res.send(order);
    //             }
    //         }
    //     }
    // );
}



router.get('/:eventId/orders', function (req, res, next) {
    getEventOrders(req.params.eventId, function (result) {
        if (result.isSuccess) {
            res.send(result.response);
        } else {
            res.status(result.status).send(result.error);
        }
    });
});




module.exports = {
    router: router,
    getEvent: getEvent,
    getEventByTransactionId: getEventByTransactionId,
    getEventByOrder: getEventByOrder

};