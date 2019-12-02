var log = require('logger')('service-realestates:test:remove');
var fs = require('fs');
var _ = require('lodash');
var errors = require('errors');
var should = require('should');
var request = require('request');
var pot = require('pot');
var realestates = require('./realestates');

var data = require('./realestate.json');

describe('DELETE /realestates/:id', function () {
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

  it('by unauthorized user', function (done) {
    create(client.users[0], function (err, realEstate) {
      if (err) {
        return done(err);
      }
      request({
        uri: pot.resolve('realestates', '/apis/v/realestates/' + realEstate.id),
        method: 'DELETE',
        auth: {
          bearer: client.users[1].token
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

  it('by authorized user', function (done) {
    create(client.users[0], function (err, realEstate) {
      if (err) {
        return done(err);
      }
      request({
        uri: pot.resolve('realestates', '/apis/v/realestates/' + realEstate.id),
        method: 'DELETE',
        auth: {
          bearer: client.users[0].token
        },
        json: true
      }, function (e, r, b) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(204);
        done();
      });
    });
  });

  it('non existing', function (done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates/59417b1220873e577df88aa2'),
      method: 'DELETE',
      auth: {
        bearer: client.users[0].token
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
