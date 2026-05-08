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

const recalculateCartTotals = async (userId) => {
  const cart = await getUserCart(userId);
  if (!cart) return null;

  const totalAmount = cart.items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);

  cart.totalAmount = totalAmount;
  cart.discountAmount = 0;
  cart.finalAmount = totalAmount;

  await cart.save();
  return cart;
};

const getProductImage = (product) => {
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images[0];
  }

  return product.image || product.imageUrl || '';
};

const mapCartItemsForClient = async (cart) => {
  if (!cart || !cart.items) return [];

  const productIds = cart.items
    .filter((i) => i.productId)
    .map((i) => i.productId);

  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true
  }).select('_id name title price image imageUrl images category rating');

  const productMap = new Map(
    products.map((p) => [p._id.toString(), p])
  );

  return cart.items
    .map((item) => {
      const pid = item.productId?.toString();
      if (!pid) return null;

      const product = productMap.get(pid);
      if (!product) return null;

      return {
        id: product._id.toString(),
        productId: product._id.toString(),
        name: product.name || product.title || '',
        title: product.title || product.name || '',
        price: item.price ?? product.price,
        quantity: item.quantity,
        image: getProductImage(product),
        images: Array.isArray(product.images) ? product.images : [],
        category: product.category,
        rating: product.rating,
        isOutOfStock:
          product.price === null ||
          product.price === undefined ||
          product.price === 0
      };
    })
    .filter(Boolean);
};

// GET /api/cart
router.get('/', async (req, res) => {
  try {
    let cart = await getUserCart(req.user._id);

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

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
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
      (item) => String(item.productId) === String(product._id)
    );

    if (existingItem) {
      await Cart.updateOne(
        {
          userId: req.user._id,
          'items.productId': product._id
        },
        {
          $set: {
            'items.$.quantity': quantity,
            'items.$.price': price || product.price
          }
        }
      );
    } else {
      await Cart.updateOne(
        { userId: req.user._id },
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

    const updated = await recalculateCartTotals(req.user._id);
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
        'items.productId': productId
      },
      {
        $set: {
          'items.$.quantity': quantity
        }
      }
    );

    const updated = await recalculateCartTotals(req.user._id);
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
      { userId: req.user._id },
      {
        $pull: {
          items: {
            productId: new mongoose.Types.ObjectId(productId)
          }
        }
      }
    );

    const updated = await recalculateCartTotals(req.user._id);
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
