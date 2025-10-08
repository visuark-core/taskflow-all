// models/Project.js
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a project name'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'on-hold', 'completed', 'archived'],
    default: 'planning'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'member', 'admin'],
      default: 'member'
    }
  }],
  tags: [{
    type: String
  }],
  color: {
    type: String,
    default: '#3B82F6'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate progress based on completed tasks
projectSchema.methods.calculateProgress = async function() {
  const Task = mongoose.model('Task');
  const tasks = await Task.find({ project: this._id });
  
  if (tasks.length === 0) return 0;
  
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  return Math.round((completedTasks / tasks.length) * 100);
};

module.exports = mongoose.model('Project', projectSchema);

