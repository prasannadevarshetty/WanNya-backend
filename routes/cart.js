const express = require('express');
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

const getUserCart = async (userId) => {
  return Cart.findOne({ userId }).sort({ updatedAt: -1 });
};

const mapCartItemsForClient = async (cart) => {

  if (!cart || !cart.items) return [];

  const productIds = cart.items
    .filter((i) => i.productId)
    .map((i) => i.productId);

  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true
  }).select('_id name title price images category rating');

  const productMap = new Map(
    products.map((p) => [p._id.toString(), p])
  );

  return cart.items
    .map((item) => {

      const pid = item.productId?.toString();

      if (!pid) return null;

      const p = productMap.get(pid);

      if (!p) return null;

      return {
        id: p._id.toString(),
        name: p.name || p.title || '',
        title: p.title || p.name || '',
        price: item.price ?? p.price,
        quantity: item.quantity,
        image: Array.isArray(p.images)
          ? (p.images[0] || '')
          : '',
        category: p.category,
        rating: p.rating,
        isOutOfStock:
          p.price === null ||
          p.price === undefined ||
          p.price === 0
      };
    })
    .filter(Boolean);
};

// GET /api/cart
router.get('/', async (req, res) => {
  try {

    let cart = await getUserCart(req.user._id);

    console.log("GET CART USER:", req.user._id);
    console.log("GET CART:", cart);

    if (!cart) {

      cart = await Cart.create({
        userId: req.user._id,
        items: []
      });
    }

    const items = await mapCartItemsForClient(cart);

    res.json({
      items,
      totalAmount: cart.totalAmount || 0,
      finalAmount: cart.finalAmount || 0
    });

  } catch (error) {

    console.error('Get cart error:', error);

    res.status(500).json({
      message: 'Server error while fetching cart'
    });
  }
});

// POST /api/cart
router.post('/', async (req, res) => {
  try {

    const productId = req.body.productId || req.body.id;
    const quantity = Number(req.body.quantity || 1);
    const price = Number(req.body.price || 0);

    console.log("ADD CART BODY:", req.body);

    if (
      !productId ||
      !mongoose.Types.ObjectId.isValid(productId)
    ) {
      return res.status(400).json({
        message: 'Valid productId is required'
      });
    }

    const product = await Product.findOne({
      _id: productId,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    let cart = await Cart.findOneAndUpdate(
      { userId: req.user._id },
      {
        $setOnInsert: {
          userId: req.user._id,
          items: [],
          totalAmount: 0,
          finalAmount: 0
        }
      },
      {
        new: true,
        upsert: true
      }
    );

    const existingItem = cart.items.find(
      (item) =>
        String(item.productId) ===
        String(product._id)
    );

    if (existingItem) {

      await Cart.updateOne(
        {
          userId: req.user._id,
          "items.productId": product._id
        },
        {
          $inc: {
            "items.$.quantity": quantity
          }
        }
      );

    } else {

      await Cart.updateOne(
        {
          userId: req.user._id
        },
        {
          $push: {
            items: {
              productId: product._id,
              quantity,
              price: price || product.price
            }
          }
        }
      );
    }

    const updated = await getUserCart(req.user._id);

    console.log("UPDATED CART:", updated);

    const items = await mapCartItemsForClient(updated);

    res.status(201).json({
      message: 'Item added to cart',
      items,
      totalAmount: updated.totalAmount || 0,
      finalAmount: updated.finalAmount || 0
    });

  } catch (error) {

    console.error('Add cart item error:', error);

    res.status(500).json({
      message: 'Server error while adding item to cart'
    });
  }
});

// PUT /api/cart/:productId
router.put('/:productId', async (req, res) => {
  try {

    const { productId } = req.params;
    const quantity = Number(req.body.quantity);

    await Cart.updateOne(
      {
        userId: req.user._id,
        "items.productId": productId
      },
      {
        $set: {
          "items.$.quantity": quantity
        }
      }
    );

    const updated = await getUserCart(req.user._id);

    const items = await mapCartItemsForClient(updated);

    res.json({
      message: 'Quantity updated',
      items,
      totalAmount: updated.totalAmount || 0,
      finalAmount: updated.finalAmount || 0
    });

  } catch (error) {

    console.error('Update cart item error:', error);

    res.status(500).json({
      message: 'Server error while updating cart item'
    });
  }
});

// DELETE /api/cart/:productId
router.delete('/:productId', async (req, res) => {
  try {

    const { productId } = req.params;

    await Cart.updateOne(
      {
        userId: req.user._id
      },
      {
        $pull: {
          items: {
            productId: new mongoose.Types.ObjectId(productId)
          }
        }
      }
    );

    const updated = await getUserCart(req.user._id);

    console.log("UPDATED AFTER DELETE:", updated);

    const items = await mapCartItemsForClient(updated);

    res.json({
      message: 'Item removed',
      items,
      totalAmount: updated?.totalAmount || 0,
      finalAmount: updated?.finalAmount || 0
    });

  } catch (error) {

    console.error('Remove cart item error:', error);

    res.status(500).json({
      message: 'Server error while removing cart item'
    });
  }
});

// DELETE /api/cart
router.delete('/', async (req, res) => {
  try {

    await Cart.updateOne(
      { userId: req.user._id },
      {
        $set: {
          items: [],
          totalAmount: 0,
          finalAmount: 0
        }
      }
    );

    res.json({
      message: 'Cart cleared',
      items: [],
      totalAmount: 0,
      finalAmount: 0
    });

  } catch (error) {

    console.error('Clear cart error:', error);

    res.status(500).json({
      message: 'Server error while clearing cart'
    });
  }
});

module.exports = router;
