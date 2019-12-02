var nconf = require('nconf');

nconf.overrides({
    "SERVICE_CONFIGS": "master:www:/apis/v/configs",
    "SERVICE_BINARIES": "master:www:/apis/v/binaries",
    "SERVICE_CLIENTS": "master:accounts:/apis/v/clients",
    "SERVICE_USERS": "master:accounts:/apis/v/users",
    "SERVICE_TOKENS": "master:accounts:/apis/v/tokens",
    "SERVICE_LOCATIONS": "master:accounts:/apis/v/locations",
    "LOCAL_REALESTATES": __dirname + "/..:realestates:/apis/v/realestates"
});

require('pot');
