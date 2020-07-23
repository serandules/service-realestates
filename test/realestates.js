var request = require('request');
var pot = require('pot');
var fs = require('fs');
var should = require('should');

exports.image = function (token, done) {
  request({
    uri: pot.resolve('apis', '/v/binaries'),
    method: 'POST',
    formData: {
      data: JSON.stringify({
        type: 'image'
      }),
      content: fs.createReadStream(__dirname + '/images/car.jpg')
    },
    auth: {
      bearer: token
    },
    json: true
  }, function (e, r, b) {
    if (e) {
      return done(e);
    }
    r.statusCode.should.equal(201);
    should.exist(b);
    should.exist(b.id);
    should.exist(b.type);
    should.exist(b.content);
    b.type.should.equal('image');
    b.content.should.equal(b.id);
    should.exist(r.headers['location']);
    r.headers['location'].should.equal(pot.resolve('apis', '/v/binaries/' + b.id));
    done(null, b.id);
  });
};
