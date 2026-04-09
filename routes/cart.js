const express = require('express');
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

const mapCartItemsForClient = async (cart) => {
  const productIds = cart.items
    .filter((i) => i.productId)
    .map((i) => i.productId);

  const products = await Product.find({ _id: { $in: productIds }, isActive: true }).select(
    '_id name price images category rating'
  );

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const items = cart.items
    .map((item) => {
      const pid = item.productId?.toString();
      if (!pid) return null;
      const p = productMap.get(pid);
      if (!p) return null;

      return {
        id: p._id.toString(),
        name: p.name,
        title: p.name,
        price: item.price ?? p.price,
        quantity: item.quantity,
        image: Array.isArray(p.images) ? (p.images[0] || '') : '',
        category: p.category,
        rating: p.rating
      };
    })
    .filter(Boolean);

  return items;
};

// GET /api/cart
router.get('/', async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id, isActive: true });
    if (!cart) {
      cart = await Cart.create({ userId: req.user._id, items: [] });
    }

    const items = await mapCartItemsForClient(cart);

    res.json({
      items,
      totalAmount: cart.totalAmount,
      finalAmount: cart.finalAmount
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Server error while fetching cart' });
  }
});

// POST /api/cart
router.post('/', async (req, res) => {
  try {
    const productId = req.body.productId || req.body.id;
    const quantity = Number(req.body.quantity || 1);
    const price = Number(req.body.price || 0);

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Valid productId is required' });
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be >= 1' });
    }

    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let cart = await Cart.findOne({ userId: req.user._id, isActive: true });
    if (!cart) {
      cart = await Cart.create({ userId: req.user._id, items: [] });
    }

    await cart.addItem({
      productId: product._id,
      quantity,
      price: price || product.price
    });

    const updated = await Cart.findOne({ userId: req.user._id, isActive: true });
    const items = await mapCartItemsForClient(updated);

    res.status(201).json({ message: 'Item added to cart', items });
  } catch (error) {
    console.error('Add cart item error:', error);
    res.status(500).json({ message: 'Server error while adding item to cart' });
  }
});

// PUT /api/cart/:productId
router.put('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const quantity = Number(req.body.quantity);

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be >= 1' });
    }

    const cart = await Cart.findOne({ userId: req.user._id, isActive: true });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const item = cart.items.find((i) => i.productId?.toString() === productId);
    if (!item) return res.status(404).json({ message: 'Cart item not found' });

    item.quantity = quantity;
    await cart.save();

    const items = await mapCartItemsForClient(cart);
    res.json({ message: 'Quantity updated', items });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ message: 'Server error while updating cart item' });
  }
});

// DELETE /api/cart/:productId
router.delete('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const cart = await Cart.findOne({ userId: req.user._id, isActive: true });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.items = cart.items.filter((i) => i.productId?.toString() !== productId);
    await cart.save();

    const items = await mapCartItemsForClient(cart);
    res.json({ message: 'Item removed', items });
  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({ message: 'Server error while removing cart item' });
  }
});

// DELETE /api/cart
router.delete('/', async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id, isActive: true });
    if (!cart) {
      cart = await Cart.create({ userId: req.user._id, items: [] });
    }

    await cart.clearCart();
    res.json({ message: 'Cart cleared', items: [] });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Server error while clearing cart' });
  }
});

module.exports = router;
