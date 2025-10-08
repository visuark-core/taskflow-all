// models/Team.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a team name'],
    trim: true
  },
  description: {
    type: String
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      role: {
        type: String,
        enum: ['member', 'lead', 'admin'],
        default: 'member'
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  projects: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    }
  ],
  inviteCode: {
    type: String,
    unique: true
  },
  settings: {
    isPrivate: {
      type: Boolean,
      default: false
    },
    allowMemberInvites: {
      type: Boolean,
      default: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Method to generate invite code
teamSchema.methods.generateInviteCode = function () {
  this.inviteCode = crypto.randomBytes(6).toString('hex');
};

module.exports = mongoose.model('Team', teamSchema);
