var log = require('logger')('service-realestates:test:update');
var fs = require('fs');
var _ = require('lodash');
var errors = require('errors');
var should = require('should');
var request = require('request');
var pot = require('pot');
var realestates = require('./realestates');

var data = require('./realestate.json');

describe('PUT /realestates/:id', function () {
  var client;
  var realestate;
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
          realestate = v;
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

  it('with no media type', function (done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates/' + realestate.id),
      method: 'PUT',
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
      uri: pot.resolve('realestates', '/apis/v/realestates/' + realestate.id),
      method: 'PUT',
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

  var fields = [
    'location',
    'contact',
    'type',
    'offer',
    'price',
    'currency'
  ];

  fields.forEach(function (field) {
    it('without ' + field, function (done) {
      request({
        uri: pot.resolve('realestates', '/apis/v/realestates/' + realestate.id),
        method: 'PUT',
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
  });

  it('with valid fields', function (done) {
    var v0 = _.cloneDeep(realestate);
    v0.images.push(image);
    v0.images.push(image);
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates/' + realestate.id),
      method: 'PUT',
      auth: {
        bearer: client.users[0].token
      },
      json: v0
    }, function (e, r, v1) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(200);
      should.exist(v1);
      should.exist(v1.id);
      should.exist(v1.user);
      should.exist(v1.type);
      v1.id.should.equal(v0.id);
      v1.user.should.equal(v0.user);
      v1.type.should.equal('house');
      should.exist(v1.images);
      should.exist(v1.images.length);
      v1.images.length.should.equal(4);
      v1.images.forEach(function (id) {
        should.exist(id);
        id.should.String();
      });
      v0.images.forEach(function (id) {
        v1.images.indexOf(id).should.not.equal(-1);
      });
      should.exist(r.headers['location']);
      r.headers['location'].should.equal(pot.resolve('realestates', '/apis/v/realestates/' + v1.id));
      v1.images = [image, image];
      request({
        uri: pot.resolve('realestates', '/apis/v/realestates/' + realestate.id),
        method: 'PUT',
        auth: {
          bearer: client.users[0].token
        },
        json: v1
      }, function (e, r, v2) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(200);
        should.exist(v2);
        should.exist(v2.id);
        should.exist(v2.user);
        should.exist(v2.type);
        v2.id.should.equal(v1.id);
        v2.user.should.equal(v1.user);
        v2.type.should.equal('house');
        should.exist(v2.images);
        should.exist(v2.images.length);
        v2.images.length.should.equal(2);
        v2.images.forEach(function (id) {
          should.exist(id);
          id.should.String();
        });
        should.exist(r.headers['location']);
        r.headers['location'].should.equal(pot.resolve('realestates', '/apis/v/realestates/' + v2.id));
        done();
      });
    });
  });

  it('by unauthorized user', function (done) {
    var v0 = _.cloneDeep(realestate);
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates/' + realestate.id),
      method: 'PUT',
      auth: {
        bearer: client.users[1].token
      },
      json: v0
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

  it('invalid id', function (done) {
    var v0 = _.cloneDeep(realestate);
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates/invalid'),
      method: 'PUT',
      auth: {
        bearer: client.users[1].token
      },
      json: v0
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

  it('by an authorized user', function (done) {
    var v0 = _.cloneDeep(realestate);
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates/' + realestate.id),
      method: 'PUT',
      auth: {
        bearer: client.admin.token
      },
      json: v0
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(200);
      should.exist(b);
      should.exist(b.id);
      should.exist(b.user);
      b.id.should.equal(realestate.id);
      b.user.should.equal(realestate.user);
      done();
    });
  });
});
