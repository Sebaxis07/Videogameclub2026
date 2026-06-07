const mongoose = require('mongoose');

const DirectMessageSchema = new mongoose.Schema({
  senderRut: {
    type: String,
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  receiverRut: {
    type: String,
    required: true,
  },
  receiverName: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: false,
  },
  msgType: {
    type: String,
    default: 'text', // 'text', 'gif', 'emoji', 'image'
  },
  gifUrl: {
    type: String,
  },
  gifTitle: {
    type: String,
  },
  emoji: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('DirectMessage', DirectMessageSchema);
