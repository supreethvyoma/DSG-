const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true
  },
  password: String,
  isAdmin: {
    type: Boolean,
    default: false
  },
  lastActiveAt: {
    type: Date,
    default: null
  },
  totalTimeSpentSec: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model("User", userSchema);
