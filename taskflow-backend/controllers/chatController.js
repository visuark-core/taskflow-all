const asyncHandler = require('../utils/asyncHandler');
const { Op } = require('sequelize');

exports.getMessages = asyncHandler(async (req, res, next) => {
  const { Message } = req.tenant.models;
  const messages = await Message.findAll({
    where: {
      [Op.or]: [
        { senderId: req.user.id, recipientId: req.params.userId },
        { senderId: req.params.userId, recipientId: req.user.id }
      ]
    },
    order: [['createdAt', 'ASC']]
  });

  const userIds = [...messages.map(m => m.senderId), ...messages.map(m => m.recipientId)];
  const userMap = await req.tenant.getUsers(userIds);
  messages.forEach(m => {
    m.setDataValue('sender', userMap[m.senderId] || null);
    m.setDataValue('recipient', userMap[m.recipientId] || null);
  });

  res.status(200).json({ success: true, count: messages.length, data: messages });
});

exports.sendMessage = asyncHandler(async (req, res, next) => {
  const { Message } = req.tenant.models;
  const message = await Message.create({
    content: req.body.content,
    senderId: req.user.id,
    recipientId: req.body.recipientId
  });

  res.status(201).json({ success: true, data: message });
});

exports.markRead = asyncHandler(async (req, res, next) => {
  const { Message } = req.tenant.models;
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
  const { Message } = req.tenant.models;
  await Message.update(
    { content: req.body.content, isEdited: true },
    { where: { id: req.params.id, senderId: req.user.id } }
  );
  res.status(200).json({ success: true, data: {} });
});

exports.deleteMessage = asyncHandler(async (req, res, next) => {
  const { Message } = req.tenant.models;
  await Message.update(
    { isDeleted: true },
    { where: { id: req.params.id, senderId: req.user.id } }
  );
  res.status(200).json({ success: true, data: {} });
});