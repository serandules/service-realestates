var log = require('logger')('service-realestates:test:find');
var fs = require('fs');
var _ = require('lodash');
var async = require('async');
var errors = require('errors');
var should = require('should');
var request = require('request');
var pot = require('pot');
var realestates = require('./realestates');

var utils = require('./utils');

var realEstate = require('./realestate.json');

describe('GET /realestates/:id', function () {
  var client;
  var groups;
  var image;
  var location;
  before(function (done) {
    pot.drop('realestates', function (err) {
      if (err) {
        return done(err);
      }
      pot.client(function (err, c) {
        if (err) {
          return done(err);
        }
        client = c;
        pot.groups(function (err, g) {
          if (err) {
            return done(err);
          }
          groups = g;
          utils.location(client.users[0].token, function (err, loc) {
            if (err) {
              return done(err);
            }
            location = loc;
            realestates.image(client.users[0].token, function (err, id) {
              if (err) {
                return done(err);
              }
              image = id;
              createRealEstates(client.users[0], 1, function (err) {
                if (err) {
                  return done(err);
                }
                createRealEstates(client.users[1], 1, done);
              });
            });
          });
        });
      });
    });
  });

  var payload = function (without) {
    var clone = _.cloneDeep(realEstate);
    without = without || [];
    without.forEach(function (w) {
      delete clone[w];
    });
    clone.images = [image, image];
    return clone;
  };

  var createRealEstates = function (user, count, done) {
    async.whilst(function () {
      return count-- > 0
    }, function (created) {
      var realEstate = payload();
      realEstate.price = 1000 * (count + 1);
      realEstate.location = location.id;
      request({
        uri: pot.resolve('apis', '/v/realestates'),
        method: 'POST',
        auth: {
          bearer: user.token
        },
        json: realEstate
      }, function (e, r, b) {
        if (e) {
          return created(e);
        }
        r.statusCode.should.equal(201);
        should.exist(b);
        should.exist(b.id);
        should.exist(b.type);
        b.type.should.equal('house');
        should.exist(r.headers['location']);
        r.headers['location'].should.equal(pot.resolve('apis', '/v/realestates/' + b.id));
        created();
      });
    }, done);
  };

  var validateRealEstates = function (realestates) {
    realestates.forEach(function (realestate) {
      should.exist(realestate.id);
      should.exist(realestate.user);
      should.exist(realestate.createdAt);
      should.exist(realestate.modifiedAt);
      should.not.exist(realestate._id);
      should.not.exist(realestate.__v);
    });
  };

  it('invalid id', function (done) {
    request({
      uri: pot.resolve('apis', '/v/realestates/undefined'),
      method: 'GET',
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

  it('owner can access', function (done) {
    request({
      uri: pot.resolve('apis', '/v/realestates'),
      method: 'GET',
      auth: {
        bearer: client.users[0].token
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(200);
      should.exist(b);
      should.exist(b.length);
      b.length.should.equal(1);
      validateRealEstates(b);
      request({
        uri: pot.resolve('apis', '/v/realestates/' + b[0].id),
        method: 'GET',
        auth: {
          bearer: client.users[0].token
        },
        json: true
      }, function (e, r, b) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(200);
        should.exist(b);
        validateRealEstates([b]);
        done();
      });
    });
  });

  it('others cannot access', function (done) {
    request({
      uri: pot.resolve('apis', '/v/realestates'),
      method: 'GET',
      auth: {
        bearer: client.users[0].token
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(200);
      should.exist(b);
      should.exist(b.length);
      b.length.should.equal(1);
      validateRealEstates(b);
      request({
        uri: pot.resolve('apis', '/v/realestates/' + b[0].id),
        method: 'GET',
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

  it('can be accessed by anyone when public', function (done) {
    request({
      uri: pot.resolve('apis', '/v/realestates'),
      method: 'GET',
      auth: {
        bearer: client.users[0].token
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(200);
      should.exist(b);
      should.exist(b.length);
      b.length.should.equal(1);
      validateRealEstates(b);
      var realEstate = b[0];
      request({
        uri: pot.resolve('apis', '/v/realestates/' + realEstate.id),
        method: 'GET',
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
        request({
          uri: pot.resolve('apis', '/v/realestates/' + realEstate.id),
          method: 'GET',
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
          pot.publish('realestates', realEstate.id, client.users[0].token, client.admin.token, function (err) {
            if (err) {
              return done(err);
            }
            request({
              uri: pot.resolve('apis', '/v/realestates/' + realEstate.id),
              method: 'GET',
              auth: {
                bearer: client.users[1].token
              },
              json: true
            }, function (e, r, b) {
              if (e) {
                return done(e);
              }
              r.statusCode.should.equal(200);
              should.exist(b);
              validateRealEstates([b]);
              request({
                uri: pot.resolve('apis', '/v/realestates/' + realEstate.id),
                method: 'GET',
                auth: {
                  bearer: client.users[2].token
                },
                json: true
              }, function (e, r, b) {
                if (e) {
                  return done(e);
                }
                r.statusCode.should.equal(200);
                should.exist(b);
                validateRealEstates([b]);
                request({
                  uri: pot.resolve('apis', '/v/realestates'),
                  method: 'GET',
                  auth: {
                    bearer: client.users[2].token
                  },
                  qs: {
                    data: JSON.stringify({
                      count: 20,
                      query: {
                        tags: {
                          $province: 'something'
                        }
                      }
                    })
                  },
                  json: true
                }, function (e, r, b) {
                  r.statusCode.should.equal(errors.unprocessableEntity().status);
                  should.exist(b);
                  should.exist(b.code);
                  should.exist(b.message);
                  b.code.should.equal(errors.unprocessableEntity().data.code);
                  request({
                    uri: pot.resolve('apis', '/v/realestates'),
                    method: 'GET',
                    auth: {
                      bearer: client.users[2].token
                    },
                    qs: {
                      data: JSON.stringify({
                        count: 20,
                        query: {
                          tags: {
                            province: 'something'
                          }
                        }
                      })
                    },
                    json: true
                  }, function (e, r, b) {
                    r.statusCode.should.equal(errors.unprocessableEntity().status);
                    should.exist(b);
                    should.exist(b.code);
                    should.exist(b.message);
                    b.code.should.equal(errors.unprocessableEntity().data.code);
                    request({
                      uri: pot.resolve('apis', '/v/realestates'),
                      method: 'GET',
                      auth: {
                        bearer: client.users[2].token
                      },
                      qs: {
                        data: JSON.stringify({
                          count: 20,
                          query: {
                            tags: [{
                              $province: 'something'
                            }]
                          }
                        })
                      },
                      json: true
                    }, function (e, r, b) {
                      r.statusCode.should.equal(errors.unprocessableEntity().status);
                      should.exist(b);
                      should.exist(b.code);
                      should.exist(b.message);
                      b.code.should.equal(errors.unprocessableEntity().data.code);
                      request({
                        uri: pot.resolve('apis', '/v/realestates'),
                        method: 'GET',
                        auth: {
                          bearer: client.users[2].token
                        },
                        qs: {
                          data: JSON.stringify({
                            count: 20,
                            query: {
                              tags: [{
                                name: 'location:locations:postal',
                                value: '00700'
                              }]
                            }
                          })
                        },
                        json: true
                      }, function (e, r, b) {
                        r.statusCode.should.equal(200);
                        should.exist(b);
                        b.length.should.equal(1);
                        request({
                          uri: pot.resolve('apis', '/v/realestates'),
                          method: 'GET',
                          auth: {
                            bearer: client.users[2].token
                          },
                          qs: {
                            data: JSON.stringify({
                              count: 20,
                              query: {
                                tags: [{
                                  name: 'location:locations:postal',
                                  value: '00700'
                                }, {
                                  name: 'location:locations:district',
                                  value: 'Colombo'
                                }]
                              }
                            })
                          },
                          json: true
                        }, function (e, r, b) {
                          r.statusCode.should.equal(200);
                          should.exist(b);
                          b.length.should.equal(1);
                          done();
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
