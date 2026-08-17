const express = require('express');
const { sendSuccess, sendError } = require('./apiResponse');

// Read-only "list + get by id" router shared by the service catalogues
// (bentos, clinics, hotels, salons).
const createCatalogRouter = ({ model, singularLabel, pluralLabel }) => {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const items = await model.find().sort({ createdAt: -1 });

      sendSuccess(res, {
        count: items.length,
        data: items
      });
    } catch (error) {
      sendError(res, 500, `Failed to fetch ${pluralLabel}`, error);
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const item = await model.findById(req.params.id);

      if (!item) {
        return sendError(res, 404, `${singularLabel} not found`);
      }

      sendSuccess(res, { data: item });
    } catch (error) {
      sendError(res, 500, `Failed to fetch ${singularLabel.toLowerCase()}`, error);
    }
  });

  return router;
};

module.exports = { createCatalogRouter };
