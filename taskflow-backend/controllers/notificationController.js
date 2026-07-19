const { Notification, User, Project, Task } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

exports.getNotifications = asyncHandler(async (req, res, next) => {
  const notifications = await Notification.findAll({
    where: { recipientId: req.user.id },
    order: [['createdAt', 'DESC']],
    limit: 50
  });

  res.status(200).json({ success: true, count: notifications.length, data: notifications });
});

exports.markAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findByPk(req.params.id);
  
  if (!notification || notification.recipientId !== req.user.id) {
    return next(new ErrorResponse('Notification not found or not authorized', 404));
  }

  await notification.update({ isRead: true });
  res.status(200).json({ success: true, data: notification });
});

exports.markAllAsRead = asyncHandler(async (req, res, next) => {
  await Notification.update({ isRead: true }, { where: { recipientId: req.user.id, isRead: false } });
  res.status(200).json({ success: true, data: {} });
});
