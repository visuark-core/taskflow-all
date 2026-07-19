const { Message, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { Op } = require('sequelize');

exports.getMessages = asyncHandler(async (req, res, next) => {
  const messages = await Message.findAll({
    where: {
      [Op.or]: [
        { senderId: req.user.id, recipientId: req.params.userId },
        { senderId: req.params.userId, recipientId: req.user.id }
      ]
    },
    include: [
      { model: User, as: 'sender', attributes: ['id', 'name', 'avatar'] },
      { model: User, as: 'recipient', attributes: ['id', 'name', 'avatar'] }
    ],
    order: [['createdAt', 'ASC']]
  });

  res.status(200).json({ success: true, count: messages.length, data: messages });
});

exports.sendMessage = asyncHandler(async (req, res, next) => {
  const message = await Message.create({
    content: req.body.content,
    senderId: req.user.id,
    recipientId: req.body.recipientId
  });

  res.status(201).json({ success: true, data: message });
});

exports.markRead = asyncHandler(async (req, res, next) => {
  await Message.update(
    { read: true },
    { where: { senderId: req.params.userId, recipientId: req.user.id } }
  );
  res.status(200).json({ success: true, data: {} });
});

exports.getUnreadCounts = asyncHandler(async (req, res, next) => {
  // Simplified
  res.status(200).json({ success: true, data: {} });
});

exports.editMessage = asyncHandler(async (req, res, next) => {
  await Message.update(
    { content: req.body.content, isEdited: true },
    { where: { id: req.params.id, senderId: req.user.id } }
  );
  res.status(200).json({ success: true, data: {} });
});

exports.deleteMessage = asyncHandler(async (req, res, next) => {
  await Message.update(
    { isDeleted: true },
    { where: { id: req.params.id, senderId: req.user.id } }
  );
  res.status(200).json({ success: true, data: {} });
});
