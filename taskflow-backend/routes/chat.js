const express = require('express');
const {
    getMessages,
    sendMessage,
    markRead,
    getUnreadCounts,
    editMessage,
    deleteMessage
} = require('../controllers/chatController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.use((req, res, next) => {
    console.log(`Chat Route Hit: ${req.method} ${req.url}`);
    next();
});

router.get('/unread', getUnreadCounts);
router.get('/:userId', getMessages);
router.post('/', sendMessage);
router.put('/read/:userId', markRead);
router.put('/:id', editMessage);
router.delete('/:id', deleteMessage);

module.exports = router;
