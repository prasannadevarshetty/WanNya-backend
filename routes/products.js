const express = require('express');
const Product = require('../models/Product');
const { getFileUrl } = require('../utils/fileUpload');
const { optionalAuth } = require('../middleware/auth');
const router = express.Router();

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
      featured,
      inStock,
      gender
    } = req.query;

    // Build filter
    const filter = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (petType) {
      filter.petType = { $in: [petType, 'both'] };
    }

    if (gender) {
      filter.gender = { $in: [gender, 'both', null] };
    }

    if (featured === 'true') {
      filter.featured = true;
    }

    if (inStock === 'true') {
      filter.inStock = true;
    }

    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Search
    if (search) {
      filter.$text = { $search: search };
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sort] = order === 'desc' ? -1 : 1;

    // Execute query in parallel
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortOptions)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec(),
      Product.countDocuments(filter)
    ]);

    // Convert stored filenames to full URLs when applicable
    const mapProduct = (p) => {
      const prod = p && p.toObject ? p.toObject() : p;
      if (prod.images && Array.isArray(prod.images)) {
        prod.images = prod.images.map(img => getFileUrl(img, 'images') || img);
      }
      if (prod.image) {
        prod.image = getFileUrl(prod.image, 'images') || prod.image;
      }
      return prod;
    };

    res.json({
      products: products.map(mapProduct),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
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
      featured: true,
      inStock: true 
    })
    .sort({ rating: -1, createdAt: -1 })
    .limit(parseInt(limit));

    const mapped = products.map(p => {
      const prod = p && p.toObject ? p.toObject() : p;
      if (prod.images && Array.isArray(prod.images)) prod.images = prod.images.map(img => getFileUrl(img, 'images') || img);
      if (prod.image) prod.image = getFileUrl(prod.image, 'images') || prod.image;
      return prod;
    });

    res.json({ products: mapped });
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
    const { q, limit = 20, gender } = req.query;

    if (!q) {
      return res.status(400).json({ 
        message: 'Search query is required' 
      });
    }

    const searchFilter = {
      $and: [
        { isActive: true },
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { tags: { $in: [new RegExp(q, 'i')] } },
            { brand: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    };

    if (gender) {
      searchFilter.$and.push({ gender: { $in: [gender, 'both', null] } });
    }

    const products = await Product.find(searchFilter)
      .sort({ rating: -1 })
      .limit(parseInt(limit));

    const mapped = products.map(p => {
      const prod = p && p.toObject ? p.toObject() : p;
      if (prod.images && Array.isArray(prod.images)) prod.images = prod.images.map(img => getFileUrl(img, 'images') || img);
      if (prod.image) prod.image = getFileUrl(prod.image, 'images') || prod.image;
      return prod;
    });

    res.json({ products: mapped });
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

    const prod = product && product.toObject ? product.toObject() : product;
    if (prod.images && Array.isArray(prod.images)) prod.images = prod.images.map(img => getFileUrl(img, 'images') || img);
    if (prod.image) prod.image = getFileUrl(prod.image, 'images') || prod.image;

    res.json({ product: prod });
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
    const { limit = 12, gender } = req.query;

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
      isActive: true,
      inStock: true
    };
    
    if (gender) {
      recFilter.gender = { $in: [gender, 'both', null] };
    }

    const products = await Product.find(recFilter)
    .sort({ rating: -1, featured: -1 })
    .limit(parseInt(limit));

    const mapped = products.map(p => {
      const prod = p && p.toObject ? p.toObject() : p;
      if (prod.images && Array.isArray(prod.images)) prod.images = prod.images.map(img => getFileUrl(img, 'images') || img);
      if (prod.image) prod.image = getFileUrl(prod.image, 'images') || prod.image;
      return prod;
    });

    res.json({ products: mapped });
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

    const mapped = products.map(p => {
      const prod = p && p.toObject ? p.toObject() : p;
      if (prod.images && Array.isArray(prod.images)) prod.images = prod.images.map(img => getFileUrl(img, 'images') || img);
      if (prod.image) prod.image = getFileUrl(prod.image, 'images') || prod.image;
      return prod;
    });

    res.json({ products: mapped });
  } catch (error) {
    console.error('Compare products error:', error);
    res.status(500).json({ 
      message: 'Server error while comparing products' 
    });
  }
});

module.exports = router;
