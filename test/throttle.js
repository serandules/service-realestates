var pot = require('pot');

var domain = 'realestates';
var model = 'realestates';

pot.throttlit('realestates', 'realestates', {
  apis: {
    bumpup: {
      second: 0,
      day: 1,
      month: 2
    }
  },
  ips: {
    bumpup: {
      second: 0,
      minute: 1,
      hour: 2,
      day: 3
    }
  }
}, {
  bumpup: {
    POST: function (i) {
      return {
        url: pot.resolve(domain, '/apis/v/' + model + '/dummy'),
        headers: {
          'X-Action': 'bumpup'
        }
      }
    }
  }
});
