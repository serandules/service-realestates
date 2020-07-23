var log = require('logger')('service-realestates:index');
var bodyParser = require('body-parser');

var auth = require('auth');
var throttle = require('throttle');
var serandi = require('serandi');
var model = require('model');
var RealEstates = require('model-realestates');

var xactions = {
  post: {
    bumpup: serandi.bumpup(RealEstates)
  }
};

module.exports = function (router, done) {
    router.use(serandi.many);
    router.use(serandi.ctx);
    router.use(auth({
      GET: [
        '^\/$',
        '^\/.*'
      ]
    }));
    router.use(throttle.apis('realestates'));
    router.use(bodyParser.json());

    router.post('/',
      serandi.json,
      serandi.create(RealEstates),
      function (req, res, next) {
      model.create(req.ctx, function (err, vehicle) {
        if (err) {
          return next(err);
        }
        res.locate(vehicle.id).status(201).send(vehicle);
      });
    });

    router.post('/:id',
      serandi.id,
      serandi.xactions(xactions.post),
      serandi.json,
      serandi.transit({
        workflow: 'model',
        model: RealEstates
    }));

    router.get('/:id',
      serandi.id,
      serandi.findOne(RealEstates),
      function (req, res, next) {
        model.findOne(req.ctx, function (err, vehicle) {
            if (err) {
                return next(err);
            }
            res.send(vehicle);
        });
    });

    router.put('/:id',
      serandi.id,
      serandi.json,
      serandi.update(RealEstates),
      function (req, res, next) {
        model.update(req.ctx, function (err, vehicle) {
        if (err) {
          return next(err);
        }
        res.locate(vehicle.id).status(200).send(vehicle);
      });
    });

    router.get('/',
      serandi.find(RealEstates),
      function (req, res, next) {
        model.find(req.ctx, function (err, vehicles, paging) {
            if (err) {
                return next(err);
            }
            res.many(vehicles, paging);
        });
    });

    router.delete('/:id',
      serandi.id,
      serandi.remove(RealEstates),
      function (req, res, next) {
        model.remove(req.ctx, function (err) {
        if (err) {
          return next(err);
        }
        res.status(204).end();
      });
    });

    done();
};
