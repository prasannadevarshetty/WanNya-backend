const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Pet = require('../models/Pet');
const Address = require('../models/Address');
const Payment = require('../models/Payment');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', async (req, res) => {
  res.json({ user: req.user.toPublicJSON ? req.user.toPublicJSON() : req.user });
});

// @route   PUT /api/users/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile', async (req, res) => {
  try {
    const { name, avatar } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

// @route   PUT /api/users/avatar
// @desc    Update user avatar (accepts base64)
// @access  Private
router.put('/avatar', async (req, res) => {
  try {
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({ message: 'Avatar data is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.avatar = avatar;
    await user.save();

    res.json({
      message: 'Avatar updated successfully',
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ message: 'Server error while updating avatar' });
  }
});

// @route   GET /api/users/addresses
// @desc    Get addresses for current user
// @access  Private
router.get('/addresses', async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({
      addresses: addresses.map((a) => ({
        id: a._id.toString(),
        label: a.label,
        street: a.street,
        city: a.city,
        state: a.state,
        zip: a.zip,
        country: a.country,
        active: !!a.isActive
      }))
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ message: 'Server error while fetching addresses' });
  }
});

// @route   POST /api/users/addresses
// @desc    Add address
// @access  Private
router.post('/addresses', async (req, res) => {
  try {
    const address = await Address.create({
      userId: req.user._id,
      label: req.body.label,
      street: req.body.street,
      city: req.body.city,
      state: req.body.state,
      zip: req.body.zip,
      country: req.body.country,
      isActive: !!req.body.active
    });

    res.status(201).json({
      message: 'Address added',
      address: {
        id: address._id.toString(),
        label: address.label,
        street: address.street,
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country,
        active: !!address.isActive
      }
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ message: 'Server error while adding address' });
  }
});

// @route   PUT /api/users/addresses/:id
// @desc    Update address
// @access  Private
router.put('/addresses/:id', async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, userId: req.user._id });
    if (!address) return res.status(404).json({ message: 'Address not found' });

    const fields = ['label', 'street', 'city', 'state', 'zip', 'country'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) address[f] = req.body[f];
    });
    if (req.body.active !== undefined) address.isActive = !!req.body.active;

    await address.save();

    res.json({
      message: 'Address updated',
      address: {
        id: address._id.toString(),
        label: address.label,
        street: address.street,
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country,
        active: !!address.isActive
      }
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ message: 'Server error while updating address' });
  }
});

// @route   DELETE /api/users/addresses/:id
// @desc    Delete address
// @access  Private
router.delete('/addresses/:id', async (req, res) => {
  try {
    const result = await Address.deleteOne({ _id: req.params.id, userId: req.user._id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Address not found' });
    res.json({ message: 'Address deleted' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ message: 'Server error while deleting address' });
  }
});

// @route   GET /api/users/payments
// @desc    Get payment methods for current user
// @access  Private
router.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({
      payments: payments.map((p) => ({
        id: p._id.toString(),
        brand: p.brand,
        last4: p.last4,
        active: !!p.isActive
      }))
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Server error while fetching payments' });
  }
});

// @route   POST /api/users/payments
// @desc    Add payment method
// @access  Private
router.post('/payments', async (req, res) => {
  try {
    const payment = await Payment.create({
      userId: req.user._id,
      brand: req.body.brand,
      last4: req.body.last4,
      isActive: req.body.active !== undefined ? !!req.body.active : true
    });

    res.status(201).json({
      message: 'Payment method added',
      payment: {
        id: payment._id.toString(),
        brand: payment.brand,
        last4: payment.last4,
        active: !!payment.isActive
      }
    });
  } catch (error) {
    console.error('Add payment error:', error);
    res.status(500).json({ message: 'Server error while adding payment method' });
  }
});

// @route   PUT /api/users/payments/:id
// @desc    Update payment method
// @access  Private
router.put('/payments/:id', async (req, res) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, userId: req.user._id });
    if (!payment) return res.status(404).json({ message: 'Payment method not found' });

    if (req.body.brand !== undefined) payment.brand = req.body.brand;
    if (req.body.last4 !== undefined) payment.last4 = req.body.last4;
    if (req.body.active !== undefined) payment.isActive = !!req.body.active;

    await payment.save();

    res.json({
      message: 'Payment method updated',
      payment: {
        id: payment._id.toString(),
        brand: payment.brand,
        last4: payment.last4,
        active: !!payment.isActive
      }
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ message: 'Server error while updating payment method' });
  }
});

// @route   DELETE /api/users/payments/:id
// @desc    Delete payment method
// @access  Private
router.delete('/payments/:id', async (req, res) => {
  try {
    const result = await Payment.deleteOne({ _id: req.params.id, userId: req.user._id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Payment method not found' });
    res.json({ message: 'Payment method deleted' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ message: 'Server error while deleting payment method' });
  }
});

// @route   DELETE /api/users/delete-account
// @desc    Delete current user and their pets
// @access  Private
router.delete('/delete-account', async (req, res) => {
  try {
    const userId = req.user._id;

    // Delete pets of this user
    await Pet.deleteMany({ userId: userId });

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({
      message: 'User and their pets deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      message: 'Server error while deleting user'
    });
  }
});
module.exports = router;
