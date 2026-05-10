const express = require('express');
const router = express.Router();

const axios = require('axios');

const Order = require('../models/Order');
const User = require('../models/User');
const CancelledProduct = require('../models/CancelledProduct');
const Notification = require('../models/Notifications');

const { authenticate } = require('../middleware/auth');

const parseNumber = (value) => {
  if (typeof value === 'string') {
    return Number(
      value.replace(/[^\d.]/g, '')
    );
  }

  return Number(value);
};

const validateLocation = async (
  address
) => {
  try {

    const fullAddress = [
      address.street,
      address.city,
      address.state,
      address.country,
      address.zip
    ]
      .filter(Boolean)
      .join(', ');

    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          address: fullAddress,
          key:
            process.env
              .GOOGLE_MAPS_API_KEY
        }
      }
    );

    return (
      response.data.status === 'OK' &&
      response.data.results.length > 0
    );

  } catch (error) {

    console.error(
      'Location validation error:',
      error
    );

    return false;
  }
};

// @route POST /api/orders/create
router.post(
  '/create',
  authenticate,
  async (req, res) => {

    try {

      console.log(
        'Create order API called at:',
        new Date().toISOString()
      );

      const {
        items,
        shippingAddress
      } = req.body;

      const rawTotal =
        req.body.totalAmount ||
        req.body.totalPrice ||
        req.body.total;

      const totalAmount =
        parseNumber(rawTotal);

      if (
        !items ||
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          message:
            'Items are required'
        });
      }

      if (
        !Number.isFinite(
          totalAmount
        ) ||
        totalAmount <= 0
      ) {
        return res.status(400).json({
          message:
            'Valid total amount is required'
        });
      }

      // VALIDATE LOCATION
      if (shippingAddress) {

        const isValidLocation =
          await validateLocation(
            shippingAddress
          );

        if (!isValidLocation) {

          return res.status(400).json({
            message:
              'Please enter a valid shipping location'
          });
        }
      }

      const orderItems = items.map(
        (item) => ({
          product:
            item.id ||
            item.productId,

          quantity:
            item.quantity,

          price: parseNumber(
            item.price
          ),

          customization: {
            name:
              item.name ||
              item.title,

            image:
              item.image,

            category:
              item.category
          }
        })
      );

      const order = new Order({
        userId: req.user._id,

        type: 'shop',

        items: orderItems,

        totalAmount,

        status: 'pending',

        shippingAddress:
          shippingAddress || {
            street:
              'Default Address',

            city:
              'Default City',

            state:
              'Default State',

            country:
              'Default Country',

            zip: '00000'
          },

        pointsEarned:
          Math.floor(
            totalAmount * 0.01
          )
      });

      await order.save();

      // 🔔 CREATE NOTIFICATION
      const notification =
        await Notification.create({
          userId: req.user._id,

          key: 'orderPlaced',

          data: {
            orderId: order._id,

            orderNumber:
              order.orderNumber,

            totalAmount:
              order.totalAmount,

            totalItems:
              items.length
          },

          isRead: false
        });

      console.log(
        'Notification created:',
        notification
      );

      // ⭐ UPDATE USER POINTS
      await User.findByIdAndUpdate(
        req.user._id,
        {
          $inc: {
            points:
              order.pointsEarned
          }
        }
      );

      res.status(201).json({
        message:
          'Order created successfully',

        order: {
          id: order._id,

          orderNumber:
            order.orderNumber,

          totalAmount:
            order.totalAmount,

          status: order.status,

          pointsEarned:
            order.pointsEarned
        }
      });

    } catch (error) {

      console.error(
        'Create order error:',
        error
      );

      res.status(500).json({
        message:
          'Server error while creating order'
      });
    }
  }
);

// @route POST /api/orders/cancel/:orderId
router.post(
  '/cancel/:orderId',
  authenticate,
  async (req, res) => {

    try {

      const { orderId } =
        req.params;

      const {
        cancellationReason
      } = req.body;

      if (
        !cancellationReason ||
        cancellationReason.trim()
          .length === 0
      ) {
        return res.status(400).json({
          message:
            'Cancellation reason is required'
        });
      }

      const order =
        await Order.findOne({
          _id: orderId,
          userId: req.user._id
        });

      if (!order) {
        return res.status(404).json({
          message:
            'Order not found'
        });
      }

      if (
        order.status ===
        'cancelled'
      ) {
        return res.status(400).json({
          message:
            'Order is already cancelled'
        });
      }

      if (
        order.status ===
        'delivered'
      ) {
        return res.status(400).json({
          message:
            'Cannot cancel delivered order'
        });
      }

      const cancelledProducts =
        order.items.map(
          (item) => ({
            orderId:
              order._id,

            orderNumber:
              order.orderNumber,

            userId:
              order.userId,

            product:
              item.product,

            service:
              item.service,

            quantity:
              item.quantity,

            price:
              item.price,

            customization:
              item.customization,

            cancellationReason:
              cancellationReason.trim(),

            refundAmount:
              item.price *
              item.quantity,

            pointsDeducted:
              Math.floor(
                (item.price *
                  item.quantity) *
                  0.01
              ),

            processedBy:
              'user'
          })
        );

      await CancelledProduct.insertMany(
        cancelledProducts
      );

      order.status =
        'cancelled';

      order.cancelledAt =
        new Date();

      order.cancellationReason =
        cancellationReason.trim();

      await order.save();

      const totalPointsDeducted =
        cancelledProducts.reduce(
          (sum, item) =>
            sum +
            item.pointsDeducted,
          0
        );

      if (
        totalPointsDeducted > 0
      ) {

        await User.findByIdAndUpdate(
          req.user._id,
          {
            $inc: {
              points:
                -totalPointsDeducted
            }
          }
        );
      }

      res.json({
        message:
          'Order cancelled successfully',

        cancelledProducts:
          cancelledProducts.length,

        pointsDeducted:
          totalPointsDeducted
      });

    } catch (error) {

      console.error(
        'Cancel order error:',
        error
      );

      res.status(500).json({
        message:
          'Server error while cancelling order'
      });
    }
  }
);

module.exports = router;
