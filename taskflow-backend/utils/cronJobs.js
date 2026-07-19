// utils/cronJobs.js
const cron = require('node-cron');
const { Task, Notification, Project, Activity, User } = require('../models');
const emailService = require('./emailService');
const { Op } = require('sequelize');

// Check for due tasks and send notifications

const checkDueTasks = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    dayAfter.setHours(0, 0, 0, 0);

    // Find tasks due tomorrow
    const dueTasks = await Task.findAll({
      where: {
        dueDate: {
          [Op.gte]: tomorrow,
          [Op.lt]: dayAfter
        },
        status: { [Op.ne]: 'done' }
      },
      include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'email', 'preferences'] }]
    });

    for (const task of dueTasks) {
      if (task.assignee) {
        // Create notification
        await Notification.create({
          recipientId: task.assignee.id,
          type: 'deadline_approaching',
          title: 'Task Due Tomorrow',
          message: `Task "${task.title}" is due tomorrow`,
          link: `/tasks/${task.id}`,
          relatedTaskId: task.id,
          relatedProjectId: task.projectId
        });

        // Send email if user has email notifications enabled
        if (task.assignee.preferences?.notifications?.email) {
          // ensure emailService does not use Mongoose internals
          await emailService.sendDueDateReminderEmail(task.assignee, task);
        }
      }
    }

    console.log(`Checked ${dueTasks.length} tasks due tomorrow`);
  } catch (error) {
    console.error('Error checking due tasks:', error);
  }
};

// Update project progress
const updateProjectProgress = async () => {
  try {
    const projects = await Project.findAll({ where: { status: 'active' } });
    
    for (const project of projects) {
      const progress = await project.calculateProgress();
      await project.update({ progress });
    }

    console.log(`Updated progress for ${projects.length} projects`);
  } catch (error) {
    console.error('Error updating project progress:', error);
  }
};

// Clean up old activities
const cleanupOldActivities = async () => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const deletedCount = await Activity.destroy({
      where: {
        createdAt: { [Op.lt]: ninetyDaysAgo }
      }
    });

    console.log(`Cleaned up ${deletedCount} old activities`);
  } catch (error) {
    console.error('Error cleaning up activities:', error);
  }
};

const startCronJobs = () => {
  // Check for due tasks every day at 9 AM
  cron.schedule('0 9 * * *', checkDueTasks);

  // Update project progress every hour
  cron.schedule('0 * * * *', updateProjectProgress);

  // Clean up old activities every Sunday at 2 AM
  cron.schedule('0 2 * * 0', cleanupOldActivities);

  console.log('Cron jobs started');
};

module.exports = { startCronJobs };
