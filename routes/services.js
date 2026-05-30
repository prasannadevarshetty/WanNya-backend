const express = require('express');
const Service = require('../models/Service');

const router = express.Router();

// GET ALL SERVICES
router.get('/', async (req, res) => {
  try {

    const services = await Service.find({
      isActive: true
    })
    .sort({
      _id: 1
    });

    const formattedServices = services.map((service) => ({
      id: service._id,

      name: service.name,
      nameEn: service.nameEn || '',
      nameJa: service.nameJa || '',

      description: service.description,
      descriptionEn: service.descriptionEn || '',
      descriptionJa: service.descriptionJa || '',

      category: service.category,

      price: service.price,

      duration: `${service.duration} min`,

      rating: service.rating || 0,

      image:
        service.images?.[0] ||
        'https://via.placeholder.com/300'
    }));

    res.json({
      success: true,
      count: formattedServices.length,
      services: formattedServices
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Server error while fetching services'
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
      service
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
router.post('/', async (req, res) => {
  try {
    const service = await Service.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Service added successfully',
      service
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;