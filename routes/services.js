const express = require('express');
const Service = require('../models/Service');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET ALL SERVICES
router.get('/', async (req, res) => {
  try {
    const filter = { isActive: true };

    if (req.query.category) {
      filter.category = req.query.category;
    }

    const services = await Service.find(filter).sort({ _id: 1 });

    const formattedServices = services.map((service) => ({
      id: service._id.toString(),

      name: service.name,
      nameEn: service.nameEn || '',
      nameJa: service.nameJa || '',

      description: service.description,
      descriptionEn: service.descriptionEn || '',
      descriptionJa: service.descriptionJa || '',

      category: service.category,

      price: service.price,

      duration: service.duration || service.durationText || '',

      rating: service.rating || 0,

      image:
        service.image ||
        service.images?.[0] ||
        'https://via.placeholder.com/300',

      location: service.location || null
    }));

    res.json({
      success: true,
      count: formattedServices.length,
      services: formattedServices
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching services',
      error: error.message
    });
  }
});

// GET SINGLE SERVICE BY ID
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      service: {
        id: service._id.toString(),
        name: service.name,
        nameEn: service.nameEn || '',
        nameJa: service.nameJa || '',
        description: service.description,
        descriptionEn: service.descriptionEn || '',
        descriptionJa: service.descriptionJa || '',
        category: service.category,
        price: service.price,
        duration: service.duration || service.durationText || '',
        rating: service.rating || 0,
        image:
          service.image ||
          service.images?.[0] ||
          'https://via.placeholder.com/300',
        checkIn: service.checkIn || '',
        checkOut: service.checkOut || '',
        location: service.location
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error while fetching service details',
      error: error.message
    });
  }
});

// ADD SERVICE
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const service = await Service.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Service added successfully',
      service
    });

  } catch (error) {
    console.error('Add service error:', error);

    res.status(500).json({
      success: false,
      message: 'Server error while adding service'
    });
  }
});

module.exports = router;