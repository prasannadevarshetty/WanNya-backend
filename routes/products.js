const express = require('express');
const Product = require('../models/Product');
const { getFileUrl } = require('../utils/fileUpload');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

const formatPrice = (price) => {
  if (price === null || price === undefined || price === 0) {
    return '在庫がありません。';
  }

  return `¥${price.toLocaleString()}(税込)`;
};

const mapProduct = (p) => {
  const prod = p && p.toObject ? p.toObject() : p;

  if (prod.images && Array.isArray(prod.images)) {
    prod.images = prod.images.map(img => getFileUrl(img, 'images') || img);
  }

  if (prod.image) {
    prod.image = getFileUrl(prod.image, 'images') || prod.image;
  }

  prod.priceValue = prod.price;
  prod.isOutOfStock = prod.price === 0 || prod.price === null || prod.price === undefined;
  prod.price = formatPrice(prod.price);

  return prod;
};

// @route   GET /api/products
// @desc    Get all products with filtering and pagination
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      petType,
      minPrice,
      maxPrice,
      search,
      sort = 'createdAt',
      order = 'desc',
      featured
    } = req.query;

    const filter = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (petType) {
      filter.petType = { $in: [petType, 'both'] };
    }

    if (featured === 'true') {
      filter.featured = true;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    if (search) {
      filter.$or = [
        { nameJa: { $regex: search, $options: 'i' } },
        { nameEn: { $regex: search, $options: 'i' } },
        { descriptionJa: { $regex: search, $options: 'i' } },
        { descriptionEn: { $regex: search, $options: 'i' } }
      ];
    }

    const allowedSortFields = ['createdAt', 'price', 'nameJa', 'category'];
    const safeSort = allowedSortFields.includes(sort) ? sort : 'createdAt';

    const sortOptions = {};
    sortOptions[safeSort] = order === 'asc' ? 1 : -1;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortOptions)
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum)
        .exec(),
      Product.countDocuments(filter)
    ]);

    res.json({
      products: products.map(mapProduct),
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
        total,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      message: 'Server error while fetching products'
    });
  }
});

// @route   GET /api/products/featured
// @desc    Get featured products
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const products = await Product.find({
      isActive: true,
      featured: true
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    res.json({ products: products.map(mapProduct) });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      message: 'Server error while fetching featured products'
    });
  }
});

// @route   GET /api/products/categories
// @desc    Get all product categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      message: 'Server error while fetching categories'
    });
  }
});

// @route   GET /api/products/search
// @desc    Search products
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        message: 'Search query is required'
      });
    }

    const searchFilter = {
      isActive: true,
      $or: [
        { nameJa: { $regex: q, $options: 'i' } },
        { nameEn: { $regex: q, $options: 'i' } },
        { descriptionJa: { $regex: q, $options: 'i' } },
        { descriptionEn: { $regex: q, $options: 'i' } }
      ]
    };

    const products = await Product.find(searchFilter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    res.json({ products: products.map(mapProduct) });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      message: 'Server error while searching products'
    });
  }
});

// @route   GET /api/products/:id
// @desc    Get specific product
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    res.json({ product: mapProduct(product) });
  } catch (error) {
    console.error('Get product error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid product ID'
      });
    }
    res.status(500).json({
      message: 'Server error while fetching product'
    });
  }
});

// @route   GET /api/products/recommendations/:petType
// @desc    Get product recommendations based on pet type
// @access  Public
router.get('/recommendations/:petType', async (req, res) => {
  try {
    const { petType } = req.params;
    const { limit = 12 } = req.query;

    if (!['dog', 'cat'].includes(petType)) {
      return res.status(400).json({
        message: 'Pet type must be dog or cat'
      });
    }

    const recFilter = {
      $or: [
        { petType: petType },
        { petType: 'both' }
      ],
      isActive: true
    };

    const products = await Product.find(recFilter)
      .sort({ featured: -1, createdAt: -1 })
      .limit(parseInt(limit, 10));

    res.json({ products: products.map(mapProduct) });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      message: 'Server error while fetching recommendations'
    });
  }
});

// @route   GET /api/products/compare
// @desc    Compare multiple products
// @access  Public
router.get('/compare', async (req, res) => {
  try {
    const { ids } = req.query;

    if (!ids) {
      return res.status(400).json({
        message: 'Product IDs are required'
      });
    }

    const productIds = ids.split(',').map(id => id.trim());

    if (productIds.length > 5) {
      return res.status(400).json({
        message: 'Cannot compare more than 5 products at once'
      });
    }

    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true
    });

    if (products.length !== productIds.length) {
      return res.status(404).json({
        message: 'One or more products not found'
      });
    }

    res.json({ products: products.map(mapProduct) });
  } catch (error) {
    console.error('Compare products error:', error);
    res.status(500).json({
      message: 'Server error while comparing products'
    });
  }
});

module.exports = router;