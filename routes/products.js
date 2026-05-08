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
    prod.images = prod.images.map((img) => getFileUrl(img, 'images') || img);
  }

  if (prod.image) {
    prod.image = getFileUrl(prod.image, 'images') || prod.image;
  }

  prod.priceValue = prod.price;
  prod.isOutOfStock =
    prod.price === 0 || prod.price === null || prod.price === undefined;
  prod.price = formatPrice(prod.price);

  return prod;
};

const getProductImage = (product) => {
  if (Array.isArray(product.images) && product.images.length > 0) {
    return getFileUrl(product.images[0], 'images') || product.images[0];
  }

  return getFileUrl(product.image, 'images') || product.image || product.imageUrl || '';
};

// GET /api/products
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

    if (search && search.trim()) {
      filter.$or = [
        { nameJa: { $regex: search, $options: 'i' } },
        { nameEn: { $regex: search, $options: 'i' } },
        { descriptionJa: { $regex: search, $options: 'i' } },
        { descriptionEn: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    } else {
      if (category) filter.category = category;

      if (petType) {
        filter.petType = {
          $in: [new RegExp(`^${petType}$`, 'i'), 'both']
        };
      }

      if (featured === 'true') filter.featured = true;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    const allowedSortFields = ['createdAt', 'price', 'nameJa', 'nameEn', 'category'];
    const safeSort = allowedSortFields.includes(sort) ? sort : 'createdAt';

    const sortOptions = {};
    sortOptions[safeSort] = order === 'asc' ? 1 : -1;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortOptions)
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum),
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

// GET /api/products/suggestions?q=keyword
router.get('/suggestions', async (req, res) => {
  try {
    const { q, limit = 8 } = req.query;

    if (!q || !q.trim()) {
      return res.json({ suggestions: [] });
    }

    const regex = new RegExp(q.trim(), 'i');

    const products = await Product.find({
      isActive: true,
      $or: [
        { nameJa: regex },
        { nameEn: regex },
        { category: regex }
      ]
    })
      .select('_id nameJa nameEn category images image imageUrl price')
      .limit(parseInt(limit, 10));

    res.json({
      suggestions: products.map((p) => ({
        id: p._id.toString(),
        nameJa: p.nameJa || '',
        nameEn: p.nameEn || '',
        name: p.nameJa || p.nameEn || '',
        category: p.category,
        image: getProductImage(p),
        price: p.price,
        priceText: formatPrice(p.price)
      }))
    });
  } catch (error) {
    console.error('Get product suggestions error:', error);
    res.status(500).json({
      message: 'Server error while fetching suggestions'
    });
  }
});

// GET /api/products/search?q=keyword
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || !q.trim()) {
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
        { descriptionEn: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
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

// GET /api/products/featured
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

// GET /api/products/categories
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

// GET /api/products/recommendations/:petType
router.get('/recommendations/:petType', async (req, res) => {
  try {
    const { petType } = req.params;
    const { limit = 12 } = req.query;

    if (!['dog', 'cat'].includes(petType)) {
      return res.status(400).json({
        message: 'Pet type must be dog or cat'
      });
    }

    const products = await Product.find({
      $or: [
        { petType: new RegExp(`^${petType}$`, 'i') },
        { petType: 'both' }
      ],
      isActive: true
    })
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

// GET /api/products/compare?ids=id1,id2
router.get('/compare', async (req, res) => {
  try {
    const { ids } = req.query;

    if (!ids) {
      return res.status(400).json({
        message: 'Product IDs are required'
      });
    }

    const productIds = ids.split(',').map((id) => id.trim());

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

// GET /api/products/:id
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

module.exports = router;
