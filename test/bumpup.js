var log = require('logger')('service-realestates:test:update');
var _ = require('lodash');
var errors = require('errors');
var should = require('should');
var request = require('request');
var pot = require('pot');
var realestates = require('./realestates');
var Vehicles = require('model-realestates');

var BUMP_UP_THRESHOLD = 14 * 24 * 60 * 60 * 1000;

var data = require('./realestate.json');

describe('POST /realestates/:id (bumpup)', function () {
  var client;
  var vehicle;
  var image;
  before(function (done) {
    pot.client(function (err, c) {
      if (err) {
        return done(err);
      }
      client = c;
      realestates.image(client.users[0].token, function (err, id) {
        if (err) {
          return done(err);
        }
        image = id;
        create(client.users[0], function (err, v) {
          if (err) {
            return done(err);
          }
          vehicle = v;
          done();
        });
      });
    });
  });

  var payload = function (without) {
    var clone = _.cloneDeep(data);
    without = without || [];
    without.forEach(function (w) {
      delete clone[w];
    });
    clone.images = [image, image];
    return clone;
  };

  var create = function (user, done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates'),
      method: 'POST',
      auth: {
        bearer: user.token
      },
      json: payload()
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(201);
      should.exist(b);
      should.exist(b.id);
      should.exist(b.type);
      b.type.should.equal('house');
      should.exist(b.images);
      should.exist(b.images.length);
      b.images.length.should.equal(2);
      b.images.forEach(function (id) {
        should.exist(id);
        id.should.String();
      });
      should.exist(r.headers['location']);
      r.headers['location'].should.equal(pot.resolve('realestates', '/apis/v/realestates/' + b.id));
      done(null, b);
    });
  };

  it('bump up by an authorized user (too early)', function (done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates/' + vehicle.id),
      method: 'POST',
      auth: {
        bearer: client.users[0].token
      },
      headers: {
        'X-Action': 'bumpup'
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(errors.forbidden().status);
      should.exist(b);
      should.exist(b.code);
      should.exist(b.message);
      b.code.should.equal(errors.forbidden().data.code);
      done();
    });
  });

  it('bump up by an unauthorized user', function (done) {
    Vehicles.update({_id: vehicle.id}, {updatedAt: Date.now() - BUMP_UP_THRESHOLD}, function (err) {
      if (err) {
        return done(err);
      }
      request({
        uri: pot.resolve('realestates', '/apis/v/realestates/' + vehicle.id),
        method: 'POST',
        auth: {
          bearer: client.users[1].token
        },
        headers: {
          'X-Action': 'bumpup'
        },
        json: true
      }, function (e, r, b) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(errors.notFound().status);
        should.exist(b);
        should.exist(b.code);
        should.exist(b.message);
        b.code.should.equal(errors.notFound().data.code);
        done();
      });
    });
  });


  it('bump up by an authorized user', function (done) {
    Vehicles.update({_id: vehicle.id}, {updatedAt: Date.now() - BUMP_UP_THRESHOLD}, function (err) {
      if (err) {
        return done(err);
      }
      request({
        uri: pot.resolve('realestates', '/apis/v/realestates/' + vehicle.id),
        method: 'POST',
        auth: {
          bearer: client.users[0].token
        },
        headers: {
          'X-Action': 'bumpup'
        },
        json: true
      }, function (e, r, b) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(200);
        should.exist(b);
        should.exist(b.id);
        should.exist(b.user);
        b.id.should.equal(vehicle.id);
        b.user.should.equal(vehicle.user);
        console.log(new Date())
        console.log(b.updatedAt)
        var diff = new Date() - new Date(b.updatedAt);
        console.log(diff)
        diff.should.be.below(2000);
        done();
      });
    });
  });
});
