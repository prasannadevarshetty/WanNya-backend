const express = require('express');
const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const mapWishlistForClient = async (wishlist) => {
  const productIds = wishlist.items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds }, isActive: true }).select(
    '_id name price images category rating'
  );
  const map = new Map(products.map((p) => [p._id.toString(), p]));

  return wishlist.items
    .map((i) => {
      const p = map.get(i.productId.toString());
      if (!p) return null;
      return {
        id: p._id.toString(),
        name: p.name,
        price: p.price,
        image: Array.isArray(p.images) ? (p.images[0] || '') : '',
        category: p.category,
        rating: p.rating,
        addedAt: i.addedAt
      };
    })
    .filter(Boolean);
};

// GET /api/wishlist
router.get('/', async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ userId: req.user._id });
    if (!wishlist) wishlist = await Wishlist.create({ userId: req.user._id, items: [] });

    const items = await mapWishlistForClient(wishlist);
    res.json({ items });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ message: 'Server error while fetching wishlist' });
  }
});

// POST /api/wishlist
router.post('/', async (req, res) => {
  try {
    const productId = req.body.productId || req.body.id;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Valid productId is required' });
    }

    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    let wishlist = await Wishlist.findOne({ userId: req.user._id });
    if (!wishlist) wishlist = await Wishlist.create({ userId: req.user._id, items: [] });

    const exists = wishlist.items.some((i) => i.productId.toString() === productId);
    if (!exists) {
      wishlist.items.push({ productId: product._id, addedAt: new Date() });
      await wishlist.save();
    }

    const items = await mapWishlistForClient(wishlist);
    res.status(201).json({ message: 'Added to wishlist', items });
  } catch (error) {
    console.error('Add wishlist item error:', error);
    res.status(500).json({ message: 'Server error while adding to wishlist' });
  }
});

// DELETE /api/wishlist/:productId
router.delete('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const wishlist = await Wishlist.findOne({ userId: req.user._id });
    if (!wishlist) return res.json({ message: 'Wishlist cleared', items: [] });

    wishlist.items = wishlist.items.filter((i) => i.productId.toString() !== productId);
    await wishlist.save();

    const items = await mapWishlistForClient(wishlist);
    res.json({ message: 'Removed from wishlist', items });
  } catch (error) {
    console.error('Remove wishlist item error:', error);
    res.status(500).json({ message: 'Server error while removing from wishlist' });
  }
});

// DELETE /api/wishlist
router.delete('/', async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ userId: req.user._id });
    if (!wishlist) wishlist = await Wishlist.create({ userId: req.user._id, items: [] });

    wishlist.items = [];
    await wishlist.save();

    res.json({ message: 'Wishlist cleared', items: [] });
  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({ message: 'Server error while clearing wishlist' });
  }
});

module.exports = router;
