var log = require('logger')('service-realestates:test:find');
var fs = require('fs');
var _ = require('lodash');
var async = require('async');
var errors = require('errors');
var should = require('should');
var request = require('request');
var links = require('parse-link-header');
var pot = require('pot');
var realestates = require('./realestates');

var realEstate = require('./realestate.json');

describe('GET /realestates', function () {
  var client;
  var groups;
  var image;
  before(function (done) {
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
        realestates.image(client.users[0].token, function (err, id) {
          if (err) {
            return done(err);
          }
          image = id;
          createRealEstates(client.users[0], 100, function (err) {
            if (err) {
              return done(err);
            }
            createRealEstates(client.users[1], 100, done);
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
      request({
        uri: pot.resolve('realestates', '/apis/v/realestates'),
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
        r.headers['location'].should.equal(pot.resolve('realestates', '/apis/v/realestates/' + b.id));
        created();
      });
    }, done);
  };

  var findPages = function (r) {
    should.exist(r.headers.link);
    var pages = links(r.headers.link);
    should.exist(pages.prev);
    should.exist(pages.prev.rel);
    pages.prev.rel.should.equal('prev');
    should.exist(pages.prev.data);
    should.exist(pages.prev.url);
    should.exist(pages.next);
    should.exist(pages.next.rel);
    pages.next.rel.should.equal('next');
    should.exist(pages.next.data);
    should.exist(pages.next.url);
    return pages;
  };

  var findFirstPages = function (r) {
    should.exist(r.headers.link);
    var pages = links(r.headers.link);
    should.exist(pages.next);
    should.exist(pages.next.rel);
    pages.next.rel.should.equal('next');
    should.exist(pages.next.data);
    should.exist(pages.next.url);
    return pages;
  };

  var findLastPages = function (r) {
    should.exist(r.headers.link);
    var pages = links(r.headers.link);
    should.exist(pages.prev);
    should.exist(pages.prev.rel);
    pages.prev.rel.should.equal('prev');
    should.exist(pages.prev.data);
    should.exist(pages.prev.url);
    return pages;
  };

  var validateRealEstates = function (realestates) {
    realestates.forEach(function (realEstate) {
      should.exist(realEstate.id);
      should.exist(realEstate.user);
      should.exist(realEstate.createdAt);
      should.exist(realEstate.modifiedAt);
      should.not.exist(realEstate._id);
      should.not.exist(realEstate.__v);
    });
  };

  it('default paging', function (done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates'),
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
      b.length.should.equal(20);
      validateRealEstates(b);
      request({
        uri: pot.resolve('realestates', '/apis/v/realestates'),
        method: 'GET',
        auth: {
          bearer: client.users[0].token
        },
        qs: {
          data: JSON.stringify({
            count: 20
          })
        },
        json: true
      }, function (e, r, b) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(200);
        should.exist(b);
        should.exist(b.length);
        b.length.should.equal(20);
        validateRealEstates(b);
        findFirstPages(r);
        done();
      });
    });
  });

  it('by price paging', function (done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates'),
      method: 'GET',
      auth: {
        bearer: client.users[0].token
      },
      qs: {
        data: JSON.stringify({
          sort: {
            price: -1
          }
        })
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(200);
      should.exist(b);
      should.exist(b.length);
      b.length.should.equal(20);
      validateRealEstates(b);
      var previous;
      b.forEach(function (current) {
        if (!previous) {
          previous = current;
          return;
        }
        previous.price.should.be.aboveOrEqual(current.price);
      });
      findFirstPages(r);
      request({
        uri: pot.resolve('realestates', '/apis/v/realestates'),
        method: 'GET',
        auth: {
          bearer: client.users[0].token
        },
        qs: {
          data: JSON.stringify({
            sort: {
              price: 1
            }
          })
        },
        json: true
      }, function (e, r, b) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(200);
        should.exist(b);
        should.exist(b.length);
        b.length.should.equal(20);
        validateRealEstates(b);
        var previous;
        b.forEach(function (current) {
          if (!previous) {
            previous = current;
            return;
          }
          previous.price.should.be.belowOrEqual(current.price);
        });
        findFirstPages(r);
        done();
      });
    });
  });

  it('by price and updatedAt ascending paging', function (done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates'),
      method: 'GET',
      auth: {
        bearer: client.users[0].token
      },
      qs: {
        data: JSON.stringify({
          sort: {
            price: -1,
            updatedAt: -1
          },
          fields: {
            createdAt: 1,
            updatedAt: 1,
            modifiedAt: 1,
            price: 1,
            user: 1
          },
          count: 20
        })
      },
      json: true
    }, function (e, r, first) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(200);
      should.exist(first);
      should.exist(first.length);
      first.length.should.equal(20);
      validateRealEstates(first);
      var previous;
      first.forEach(function (current) {
        if (!previous) {
          previous = current;
          return;
        }
        previous.price.should.be.aboveOrEqual(current.price);
      });
      var firstPages = findFirstPages(r);
      request({
        uri: firstPages.next.url,
        method: 'GET',
        auth: {
          bearer: client.users[0].token
        },
        json: true
      }, function (e, r, second) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(200);
        should.exist(second);
        should.exist(second.length);
        second.length.should.equal(20);
        validateRealEstates(second);
        var previous;
        second.forEach(function (current) {
          if (!previous) {
            previous = current;
            return;
          }
          previous.price.should.be.aboveOrEqual(current.price);
        });
        var secondPages = findPages(r);
        request({
          uri: secondPages.prev.url,
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
          first.should.deepEqual(b);
          firstPages = findFirstPages(r);
          done();
        });
      });
    });
  });

  it('by price and updatedAt descending paging', function (done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates'),
      method: 'GET',
      auth: {
        bearer: client.users[0].token
      },
      qs: {
        data: JSON.stringify({
          sort: {
            price: 1,
            updatedAt: -1
          },
          fields: {
            createdAt: 1,
            updatedAt: 1,
            modifiedAt: 1,
            price: 1,
            user: 1
          },
          count: 20
        })
      },
      json: true
    }, function (e, r, first) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(200);
      should.exist(first);
      should.exist(first.length);
      first.length.should.equal(20);
      validateRealEstates(first);
      var previous;
      first.forEach(function (current) {
        if (!previous) {
          previous = current;
          return;
        }
        previous.price.should.be.belowOrEqual(current.price);
      });
      var firstPages = findFirstPages(r);
      request({
        uri: firstPages.next.url,
        method: 'GET',
        auth: {
          bearer: client.users[0].token
        },
        json: true
      }, function (e, r, second) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(200);
        should.exist(second);
        should.exist(second.length);
        second.length.should.equal(20);
        validateRealEstates(second);
        var previous;
        second.forEach(function (current) {
          if (!previous) {
            previous = current;
            return;
          }
          previous.price.should.be.belowOrEqual(current.price);
        });
        var secondPages = findPages(r);
        request({
          uri: secondPages.prev.url,
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
          first.should.deepEqual(b);
          firstPages.should.deepEqual(findFirstPages(r));
          done();
        });
      });
    });
  });

  it('filter by price', function (done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates'),
      method: 'GET',
      auth: {
        bearer: client.users[0].token
      },
      qs: {
        data: JSON.stringify({
          sort: {
            price: -1
          },
          query: {
            price: {
              $lte: 50000
            }
          },
          count: 20
        })
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(200);
      should.exist(b);
      should.exist(b.length);
      b.length.should.equal(20);
      validateRealEstates(b);
      var previous;
      b.forEach(function (current) {
        current.price.should.be.belowOrEqual(50000);
        if (!previous) {
          previous = current;
          return;
        }
        previous.price.should.be.aboveOrEqual(current.price);
      });
      request({
        uri: pot.resolve('realestates', '/apis/v/realestates'),
        method: 'GET',
        auth: {
          bearer: client.users[0].token
        },
        qs: {
          data: JSON.stringify({
            sort: {
              price: 1
            },
            query: {
              price: {
                $lte: 50000
              }
            },
            count: 20
          })
        },
        json: true
      }, function (e, r, b) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(200);
        should.exist(b);
        should.exist(b.length);
        b.length.should.equal(20);
        validateRealEstates(b);
        var previous;
        b.forEach(function (current) {
          current.price.should.be.belowOrEqual(50000);
          if (!previous) {
            previous = current;
            return;
          }
          previous.price.should.be.belowOrEqual(current.price);
        });
        done();
      });
    });
  });

  it('filter by user', function (done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates'),
      method: 'GET',
      auth: {
        bearer: client.users[0].token
      },
      qs: {
        data: JSON.stringify({
          query: {
            user: client.users[0].profile.id
          }
        })
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(200);
      should.exist(b);
      should.exist(b.length);
      b.length.should.equal(20);
      validateRealEstates(b);
      b.forEach(function (realEstate) {
        should.exist(realEstate.user);
        realEstate.user.should.be.equal(client.users[0].profile.id);
      });
      done();
    });
  });

  it('non indexed filter', function (done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates'),
      method: 'GET',
      auth: {
        bearer: client.users[0].token
      },
      qs: {
        data: JSON.stringify({
          query: {
            contact: 'contact'
          }
        })
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(errors.badRequest().status);
      should.exist(b);
      should.exist(b.code);
      should.exist(b.message);
      b.code.should.equal(errors.badRequest().data.code);
      done();
    });
  });

  it('invalid sort key', function (done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates'),
      method: 'GET',
      auth: {
        bearer: client.users[0].token
      },
      qs: {
        data: JSON.stringify({
          sort: {
            model: -1
          },
          count: 20
        })
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(errors.badRequest().status);
      should.exist(b);
      should.exist(b.code);
      should.exist(b.message);
      b.code.should.equal(errors.badRequest().data.code);
      done();
    });
  });

  it('invalid sort value', function (done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates'),
      method: 'GET',
      auth: {
        bearer: client.users[0].token
      },
      qs: {
        data: JSON.stringify({
          sort: {
            price: true
          },
          count: 20
        })
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(errors.badRequest().status);
      should.exist(b);
      should.exist(b.code);
      should.exist(b.message);
      b.code.should.equal(errors.badRequest().data.code);
      done();
    });
  });

  it('invalid count', function (done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates'),
      method: 'GET',
      auth: {
        bearer: client.users[0].token
      },
      qs: {
        data: JSON.stringify({
          sort: {
            price: 1
          },
          count: 101
        })
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(errors.badRequest().status);
      should.exist(b);
      should.exist(b.code);
      should.exist(b.message);
      b.code.should.equal(errors.badRequest().data.code);
      done();
    });
  });

  it('invalid data', function (done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates'),
      method: 'GET',
      auth: {
        bearer: client.users[0].token
      },
      qs: {
        data: 'something'
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(errors.badRequest().status);
      should.exist(b);
      should.exist(b.code);
      should.exist(b.message);
      b.code.should.equal(errors.badRequest().data.code);
      done();
    });
  });

  it('by user0', function (done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates'),
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
      b.length.should.equal(20);
      validateRealEstates(b);
      b.forEach(function (v) {
        v.user.should.equal(client.users[0].profile.id);
      });
      request({
        uri: pot.resolve('realestates', '/apis/v/realestates'),
        method: 'GET',
        auth: {
          bearer: client.users[0].token
        },
        qs: {
          data: JSON.stringify({
            count: 20
          })
        },
        json: true
      }, function (e, r, b) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(200);
        should.exist(b);
        should.exist(b.length);
        b.length.should.equal(20);
        validateRealEstates(b);
        b.forEach(function (v) {
          v.user.should.equal(client.users[0].profile.id);
        });
        findFirstPages(r);
        done();
      });
    });
  });

  it('by user0 by user0 permissions', function (done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates'),
      method: 'GET',
      auth: {
        bearer: client.users[0].token
      },
      qs: {
        data: JSON.stringify({
          count: 20,
          query: {
            permissions: {
              $or: [{
                user: client.users[0].profile.id,
                actions: {
                  $in: ['update']
                }
              }]
            }
          }
        })
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(200);
      should.exist(b);
      should.exist(b.length);
      b.length.should.equal(20);
      validateRealEstates(b);
      b.forEach(function (v) {
        v.user.should.equal(client.users[0].profile.id);
      });
      findFirstPages(r);
      done();
    });
  });

  it('by user0 by public permissions', function (done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates'),
      method: 'GET',
      auth: {
        bearer: client.users[0].token
      },
      qs: {
        data: JSON.stringify({
          count: 20,
          query: {
            permissions: {
              $nor: [{
                group: groups.public.id,
                actions: {
                  $in: ['read']
                }
              }]
            }
          }
        })
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      r.statusCode.should.equal(200);
      should.exist(b);
      should.exist(b.length);
      b.length.should.equal(20);
      validateRealEstates(b);
      b.forEach(function (v) {
        v.user.should.equal(client.users[0].profile.id);
      });
      findFirstPages(r);
      done();
    });
  });

  it('by user1', function (done) {
    request({
      uri: pot.resolve('realestates', '/apis/v/realestates'),
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
      should.exist(b.length);
      b.length.should.equal(20);
      validateRealEstates(b);
      b.forEach(function (v) {
        v.user.should.equal(client.users[1].profile.id);
      });
      request({
        uri: pot.resolve('realestates', '/apis/v/realestates'),
        method: 'GET',
        auth: {
          bearer: client.users[1].token
        },
        qs: {
          data: JSON.stringify({
            count: 20
          })
        },
        json: true
      }, function (e, r, b) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(200);
        should.exist(b);
        should.exist(b.length);
        b.length.should.equal(20);
        validateRealEstates(b);
        b.forEach(function (v) {
          v.user.should.equal(client.users[1].profile.id);
        });
        findFirstPages(r);
        done();
      });
    });
  });

  it('by user2', function (done) {
    createRealEstates(client.users[2], 100, function (err) {
      if (err) {
        return done(err);
      }
      request({
        uri: pot.resolve('realestates', '/apis/v/realestates'),
        method: 'GET',
        auth: {
          bearer: client.users[2].token
        },
        qs: {
          data: JSON.stringify({
            count: 100
          })
        },
        json: true
      }, function (e, r, b) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(200);
        should.exist(b);
        should.exist(b.length);
        b.length.should.equal(100);
        async.each(b, function (v, ran) {
          should.exist(v.user);
          v.user.should.equal(client.users[2].profile.id);
          pot.publish('autos', 'realestates', v.id, client.users[2].token, client.admin.token, ran);
        }, function (err) {
          if (err) {
            return done(err);
          }
          request({
            uri: pot.resolve('realestates', '/apis/v/realestates'),
            method: 'GET',
            auth: {
              bearer: client.users[1].token
            },
            qs: {
              data: JSON.stringify({
                count: 100
              })
            },
            json: true
          }, function (e, r, b) {
            if (e) {
              return done(e);
            }
            r.statusCode.should.equal(200);
            should.exist(b);
            should.exist(b.length);
            b.length.should.equal(100);
            var user1 = 0;
            var user2 = 0;
            var users = [client.users[1].profile.id, client.users[2].profile.id];
            b.forEach(function (v) {
              should.exist(v.user);
              var index = users.indexOf(v.user);
              index.should.not.equal(-1);
              if (index === 0) {
                return user1++
              }
              if (index === 1) {
                return user2++
              }
            });
            var firstPages = findFirstPages(r);
            request({
              uri: firstPages.next.url,
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
              should.exist(b.length);
              b.length.should.equal(100);
              b.forEach(function (v) {
                should.exist(v.user);
                var index = users.indexOf(v.user);
                index.should.not.equal(-1);
                if (index === 0) {
                  return user1++
                }
                if (index === 1) {
                  return user2++
                }
              });
              user1.should.equal(100);
              user2.should.equal(100);
              done();
            });
          });
        });
      });
    });
  });

  it('by status', function (done) {
    var count = 2;
    createRealEstates(client.users[3], count, function (err) {
      if (err) {
        return done(err);
      }
      request({
        uri: pot.resolve('realestates', '/apis/v/realestates'),
        method: 'GET',
        auth: {
          bearer: client.users[3].token
        },
        qs: {
          data: JSON.stringify({
            count: 100,
            query: {
              user: client.users[3].profile.id
            }
          })
        },
        json: true
      }, function (e, r, b) {
        if (e) {
          return done(e);
        }
        r.statusCode.should.equal(200);
        should.exist(b);
        should.exist(b.length);
        b.length.should.equal(count);
        async.each(b, function (v, ran) {
          should.exist(v.user);
          v.user.should.equal(client.users[3].profile.id);
          pot.transit('realestates', 'realestates', v.id, client.users[3].token, 'review', ran);
        }, function (err) {
          if (err) {
            return done(err);
          }
          request({
            uri: pot.resolve('realestates', '/apis/v/realestates'),
            method: 'GET',
            auth: {
              bearer: client.admin.token
            },
            qs: {
              data: JSON.stringify({
                query: {
                  status: 'reviewing'
                },
                count: 100
              })
            },
            json: true
          }, function (e, r, b) {
            if (e) {
              return done(e);
            }
            r.statusCode.should.equal(200);
            should.exist(b);
            should.exist(b.length);
            b.length.should.equal(count);
            done();
          });
        });
      });
    });
  });
});
