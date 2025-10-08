// controllers/notificationController.js
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Get user notifications
exports.getNotifications = asyncHandler(async (req, res, next) => {
  const notifications = await Notification.find({ 
    recipient: req.user.id 
  })
  .populate('relatedProject', 'name')
  .populate('relatedTask', 'title')
  .sort('-createdAt')
  .limit(parseInt(req.query.limit) || 50);

  const unreadCount = await Notification.countDocuments({
    recipient: req.user.id,
    isRead: false
  });

  res.status(200).json({
    success: true,
    count: notifications.length,
    unreadCount,
    data: notifications
  });
});

// Mark notification as read
exports.markAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user.id
  });

  if (!notification) {
    return next(new ErrorResponse('Notification not found', 404));
  }

  await notification.markAsRead();

  res.status(200).json({
    success: true,
    data: notification
  });
});

// Mark all as read
exports.markAllAsRead = asyncHandler(async (req, res, next) => {
  await Notification.updateMany(
    { recipient: req.user.id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read'
  });
});

// Delete notification
exports.deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: req.user.id
  });

  if (!notification) {
    return next(new ErrorResponse('Notification not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {}
  });
});

// Clear all notifications
exports.clearNotifications = asyncHandler(async (req, res, next) => {
  await Notification.deleteMany({ recipient: req.user.id });

  res.status(200).json({
    success: true,
    message: 'All notifications cleared'
  });
});

