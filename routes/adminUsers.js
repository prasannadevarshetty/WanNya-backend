const express = require('express');
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -otp -passwordResetToken -emailVerificationToken')
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

router.get('/users/deleted', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ isDeleted: true })
      .select('-password -otp -passwordResetToken -emailVerificationToken')
      .sort({ deletedAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch deleted users' });
  }
});

router.delete('/users/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
        deleteReason: reason || ''
      },
      { new: true }
    ).select('-password -otp -passwordResetToken -emailVerificationToken');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'User deleted successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = router;