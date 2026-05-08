const express = require('express');
const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

const getUserWishlist = async (userId) => {
  return Wishlist.findOne({ userId }).sort({ updatedAt: -1 });
};

const getProductImage = (product) => {
  if (
    Array.isArray(product.images) &&
    product.images.length > 0
  ) {
    return product.images[0];
  }

  return (
    product.image ||
    product.imageUrl ||
    ''
  );
};

const getProductName = (product) => {
  return (
    product.nameJa ||
    product.nameEn ||
    product.name ||
    product.title ||
    ''
  );
};

const mapWishlistForClient = async (wishlist) => {

  if (!wishlist || !wishlist.items) return [];

  const productIds = wishlist.items.map(
    (i) => i.productId
  );

  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true
  }).select(`
    _id
    name
    title
    nameJa
    nameEn
    price
    image
    imageUrl
    images
    category
    rating
  `);

  const productMap = new Map(
    products.map((p) => [p._id.toString(), p])
  );

  return wishlist.items
    .map((item) => {

      const product = productMap.get(
        item.productId.toString()
      );

      if (!product) return null;

      return {
        id: product._id.toString(),

        productId: product._id.toString(),

        name: getProductName(product),

        title: getProductName(product),

        nameJa: product.nameJa || '',

        nameEn: product.nameEn || '',

        price: product.price,

        image: getProductImage(product),

        images: Array.isArray(product.images)
          ? product.images
          : [],

        category: product.category,

        rating: product.rating,

        addedAt: item.addedAt
      };
    })
    .filter(Boolean);
};

// GET /api/wishlist
router.get('/', async (req, res) => {
  try {

    let wishlist = await getUserWishlist(
      req.user._id
    );

    if (!wishlist) {

      wishlist = await Wishlist.create({
        userId: req.user._id,
        items: []
      });
    }

    const items =
      await mapWishlistForClient(wishlist);

    res.json({ items });

  } catch (error) {

    console.error(
      'Get wishlist error:',
      error
    );

    res.status(500).json({
      message:
        'Server error while fetching wishlist'
    });
  }
});

// POST /api/wishlist
router.post('/', async (req, res) => {
  try {

    const productId =
      req.body.productId || req.body.id;

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

    let wishlist =
      await Wishlist.findOneAndUpdate(
        {
          userId: req.user._id
        },
        {
          $setOnInsert: {
            userId: req.user._id,
            items: []
          }
        },
        {
          new: true,
          upsert: true
        }
      );

    const exists = wishlist.items.some(
      (i) =>
        i.productId.toString() === productId
    );

    if (!exists) {

      await Wishlist.updateOne(
        {
          userId: req.user._id
        },
        {
          $push: {
            items: {
              productId: product._id,
              addedAt: new Date()
            }
          }
        }
      );
    }

    const updated =
      await getUserWishlist(req.user._id);

    const items =
      await mapWishlistForClient(updated);

    res.status(201).json({
      message: 'Added to wishlist',
      items
    });

  } catch (error) {

    console.error(
      'Add wishlist item error:',
      error
    );

    res.status(500).json({
      message:
        'Server error while adding to wishlist'
    });
  }
});

// DELETE /api/wishlist/:productId
router.delete('/:productId', async (req, res) => {
  try {

    const { productId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(productId)
    ) {
      return res.status(400).json({
        message: 'Invalid product ID'
      });
    }

    await Wishlist.updateOne(
      {
        userId: req.user._id
      },
      {
        $pull: {
          items: {
            productId:
              new mongoose.Types.ObjectId(
                productId
              )
          }
        }
      }
    );

    const updated =
      await getUserWishlist(req.user._id);

    const items =
      await mapWishlistForClient(updated);

    res.json({
      message: 'Removed from wishlist',
      items
    });

  } catch (error) {

    console.error(
      'Remove wishlist item error:',
      error
    );

    res.status(500).json({
      message:
        'Server error while removing from wishlist'
    });
  }
});

// DELETE /api/wishlist
router.delete('/', async (req, res) => {
  try {

    await Wishlist.updateOne(
      {
        userId: req.user._id
      },
      {
        $set: {
          items: []
        }
      }
    );

    res.json({
      message: 'Wishlist cleared',
      items: []
    });

  } catch (error) {

    console.error(
      'Clear wishlist error:',
      error
    );

    res.status(500).json({
      message:
        'Server error while clearing wishlist'
    });
  }
});

module.exports = router;
