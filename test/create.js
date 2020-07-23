var log = require('logger')('service-realestates:test:create');
var fs = require('fs');
var _ = require('lodash');
var errors = require('errors');
var should = require('should');
var request = require('request');
var pot = require('pot');
var realestates = require('./realestates');

var data = require('./realestate.json');

describe('POST /realestates', function () {
  var client;
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
        done();
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

  it('with no media type', function (done) {
    request({
      uri: pot.resolve('apis', '/v/realestates'),
      method: 'POST',
      auth: {
        bearer: client.users[0].token
      }
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(errors.unsupportedMedia().status);
      should.exist(b);
      b = JSON.parse(b);
      should.exist(b.code);
      should.exist(b.message);
      b.code.should.equal(errors.unsupportedMedia().data.code);
      done();
    });
  });

  it('with unsupported media type', function (done) {
    request({
      uri: pot.resolve('apis', '/v/realestates'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      auth: {
        bearer: client.users[0].token
      }
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(errors.unsupportedMedia().status);
      should.exist(b);
      b = JSON.parse(b);
      should.exist(b.code);
      should.exist(b.message);
      b.code.should.equal(errors.unsupportedMedia().data.code);
      done();
    });
  });

  var fields = {
    location: {
      invalid: 'dummy'
    },
    contact: {
      invalid: 'dummy'
    },
    type: {
      invalid: 'dummy'
    },
    offer: {
      invalid: 'dummy'
    },
    price: {
      invalid: 'dummy'
    },
    currency: {
      invalid: 'dummy'
    }
  };

  Object.keys(fields).forEach(function (field) {
    it('without ' + field, function (done) {
      request({
        uri: pot.resolve('apis', '/v/realestates'),
        method: 'POST',
        json: payload([field]),
        auth: {
          bearer: client.users[0].token
        }
      }, function (e, r, b) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(errors.unprocessableEntity().status);
        should.exist(b);
        should.exist(b.code);
        should.exist(b.message);
        b.code.should.equal(errors.unprocessableEntity().data.code);
        done();
      });
    });

    it('invalid ' + field, function (done) {
      var o = payload([field]);
      o[field] = fields[field].invalid;
      request({
        uri: pot.resolve('apis', '/v/realestates'),
        method: 'POST',
        json: o,
        auth: {
          bearer: client.users[0].token
        }
      }, function (e, r, b) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(errors.unprocessableEntity().status);
        should.exist(b);
        should.exist(b.code);
        should.exist(b.message);
        b.code.should.equal(errors.unprocessableEntity().data.code);
        done();
      });
    });
  });

  it('with valid fields', function (done) {
    request({
      uri: pot.resolve('apis', '/v/realestates'),
      method: 'POST',
      auth: {
        bearer: client.users[0].token
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
      r.headers['location'].should.equal(pot.resolve('apis', '/v/realestates/' + b.id));
      done();
    });
  });

  it('with valid fields and zero mileage etc.', function (done) {
    var data = payload();
    data.mileage = 0;
    request({
      uri: pot.resolve('apis', '/v/realestates'),
      method: 'POST',
      auth: {
        bearer: client.users[0].token
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
      r.headers['location'].should.equal(pot.resolve('apis', '/v/realestates/' + b.id));
      done();
    });
  });

});
