var nconf = require('nconf');

nconf.overrides({
    "SERVICE_CONFIGS": "master:apis:/v/configs",
    "SERVICE_BINARIES": "master:apis:/v/binaries",
    "SERVICE_CLIENTS": "master:apis:/v/clients",
    "SERVICE_USERS": "master:apis:/v/users",
    "SERVICE_TOKENS": "master:apis:/v/tokens",
    "SERVICE_LOCATIONS": "master:apis:/v/locations",
    "LOCAL_REALESTATES": __dirname + "/..:apis:/v/realestates"
});

require('pot');
