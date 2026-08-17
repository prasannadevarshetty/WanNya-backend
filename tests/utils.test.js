const express = require('express');
const request = require('supertest');

const { sendSuccess, sendError } = require('../utils/apiResponse');
const { parseDate, dayRange, isBeforeToday } = require('../utils/dateUtils');
const {
  SLOT_CAPACITY,
  buildSlotMap,
  buildSlotAvailability
} = require('../utils/slotAvailability');
const { createCatalogRouter } = require('../utils/catalogRoutes');

describe('apiResponse', () => {
  const buildApp = (handler) => {
    const app = express();
    app.get('/', handler);
    return app;
  };

  it('wraps successful payloads in a success envelope', async () => {
    const app = buildApp((req, res) => sendSuccess(res, { data: [1, 2] }, 201));

    const res = await request(app).get('/');

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, data: [1, 2] });
  });

  it('omits the error field when no error is given', async () => {
    const app = buildApp((req, res) => sendError(res, 404, 'Bento not found'));

    const res = await request(app).get('/');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Bento not found' });
  });

  it('exposes the error message when an error is given', async () => {
    const app = buildApp((req, res) =>
      sendError(res, 500, 'Failed to fetch bentos', new Error('boom'))
    );

    const res = await request(app).get('/');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Failed to fetch bentos',
      error: 'boom'
    });
  });
});

describe('dateUtils', () => {
  it('returns null for unparseable dates', () => {
    expect(parseDate('not-a-date')).toBeNull();
    expect(parseDate('2030-01-02')).toBeInstanceOf(Date);
  });

  it('builds a range covering the whole calendar day', () => {
    const { $gte, $lte } = dayRange('2030-01-02T13:45:00');

    expect($gte.getHours()).toBe(0);
    expect($gte.getMinutes()).toBe(0);
    expect($lte.getHours()).toBe(23);
    expect($lte.getMilliseconds()).toBe(999);
  });

  it('treats earlier days as past and today as not past', () => {
    expect(isBeforeToday(new Date('2000-01-01'))).toBe(true);
    expect(isBeforeToday(new Date())).toBe(false);
  });
});

describe('slotAvailability', () => {
  it('counts booked seats per slot time', () => {
    const bookings = [
      { bookingTime: '10:00' },
      { bookingTime: '10:00' },
      { bookingTime: '11:00' }
    ];

    expect(buildSlotMap(bookings)).toEqual({ '10:00': 2, '11:00': 1 });
  });

  it('maps seat counts to availability symbols', () => {
    const slots = buildSlotAvailability({ '10:00': SLOT_CAPACITY, '11:00': 1 });

    expect(slots[0]).toMatchObject({
      time: '10:00',
      status: 'booked',
      symbol: 'cross',
      availableSeats: 0
    });

    expect(slots[1]).toMatchObject({
      time: '11:00',
      status: 'few_left',
      symbol: 'triangle',
      availableSeats: SLOT_CAPACITY - 1
    });
  });
});

describe('createCatalogRouter', () => {
  const items = [{ _id: '1', nameEn: 'Deluxe' }];

  const model = {
    find: () => ({ sort: async () => items }),
    findById: async (id) => items.find(item => item._id === id) || null
  };

  const app = express();
  app.use(
    '/hotels',
    createCatalogRouter({ model, singularLabel: 'Hotel', pluralLabel: 'hotels' })
  );

  it('lists items with a count', async () => {
    const res = await request(app).get('/hotels');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, count: 1, data: items });
  });

  it('returns a single item', async () => {
    const res = await request(app).get('/hotels/1');

    expect(res.body).toEqual({ success: true, data: items[0] });
  });

  it('404s for a missing item', async () => {
    const res = await request(app).get('/hotels/missing');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Hotel not found' });
  });
});
