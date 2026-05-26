const express = require('express');
const router = express.Router();

// Temporary mock services
const services = [
  {
    id: "grooming-1",
    name: "Premium Grooming",
    description: "Complete grooming package",
    price: 5000,
    duration: "60 min",
    rating: 4.8,
    image: "https://via.placeholder.com/300",
    category: "grooming"
  },
  {
    id: "clinic-1",
    name: "Pet Clinic",
    description: "Veterinary consultation",
    price: 3000,
    duration: "30 min",
    rating: 4.6,
    image: "https://via.placeholder.com/300",
    category: "clinic"
  },
  {
    id: "hotel-1",
    name: "Pet Hotel",
    description: "Luxury pet stay",
    price: 12000,
    duration: "1 day",
    rating: 4.9,
    image: "https://via.placeholder.com/300",
    category: "hotel"
  }
];

// GET services
router.get('/', (req, res) => {
  res.json({
    success: true,
    services
  });
});

module.exports = router;