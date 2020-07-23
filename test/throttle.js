var pot = require('pot');

var domain = 'apis';
var model = 'realestates';

pot.throttlit(domain, 'realestates', {
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
        url: pot.resolve(domain, '/v/' + model + '/dummy'),
        headers: {
          'X-Action': 'bumpup'
        }
      }
    }
  }
});
