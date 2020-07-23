var request = require('request');
var pot = require('pot');

exports.location = function (token, done) {
  request({
    uri: pot.resolve('apis', '/v/locations'),
    method: 'POST',
    auth: {
      bearer: token
    },
    json: {
      latitude: 6.9102825,
      longitude: 79.8712862,
      name: 'Bandaranaike Memorial International Conference Hall',
      line1: 'BMICH Office',
      line2: 'Bauddhaloka Mawatha',
      city: 'Colombo',
      postal: '00700',
      district: 'Colombo',
      province: 'Western',
      state: 'Western',
      country: 'LK'
    }
  }, function (e, r, b) {
    if (e) {
      return done(err);
    }
    r.statusCode.should.equal(201);
    done(null, b);
  });
};
