const mongoose = require('mongoose');
const constants = require('../constants');
const uuid = require('uuid');

Schema = mongoose.Schema;


EventSchema = new Schema({

    [constants.eventId]: { type: String, required: [true, "Event id not specified"]},
    [constants.eventName]: { type: String, required: [true, 'Event name not specified'] },
    [constants.transactionId]: { type: String, default: uuid.v1() },
    [constants.orders]: { type: [String], default: [] },

}, {
    timestamps: true
}
);







Event = mongoose.model('event', EventSchema);

module.exports = Event;