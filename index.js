// Import libraries
require('mysql');
const knex = require('knex');
const express = require('express');
const bodyParser = require('body-parser');
const xmlJs = require('xml-js');
const _ = require('lodash');
const fs = require('fs');

// Read config file
let configFile;
try {
  configFile = JSON.parse(fs.readFileSync('./config.json').toString());
} catch (err) {
  if (err.code === 'ENOENT') {
    configFile = {};
  } else {
    throw err;
  }
}

// Set config
const config = _.defaultsDeep(configFile, {
  timezone: 'UTC',
  port: 3000,
  path: '/',
  verifyAccountNumber: true,
  verifyPin: true,
  verifyZipCode: true,
  verifyStatus: true,
  verifySubscriberName: false,
  maxTelephoneNumbers: 100,
  tableName: 'bandwidth-port-out-validation',
  mysql: {
    host: '127.0.0.1',
    port: 3306,
    database: 'bandwidth-port-out-validation',
    user: 'bandwidth-port-out-validation',
  },
});

// Set timezone
process.env.TZ = config.timezone;

// Setup express
const app = express();
app.use(bodyParser.text({
  type: [
    'text/xml',
    'application/xml',
  ],
}));

// Setup knex client
const knexClient = knex({
  client: 'mysql',
  connection: config.mysql,
});

// Return error function
const error = code => {
  return xmlJs.json2xml({
    PortOutValidationResponse: {
      Portable: false,
      Errors: [
        {
          Error: {
            Code: code,
            Description: 'bad request',
          },
        },
      ],
    },
  }, {
    compact: true,
    spaces: 2,
  });
};

// Return success function
const success = () => {
  return xmlJs.json2xml({
    PortOutValidationResponse: {
      Portable: true,
    },
  }, {
    compact: true,
    spaces: 2,
  });
};

// Receive POST function
app.post(config.path, async (req, res) => {
  try {
    // Print request body
    console.log(`Received request from ${req.ip}:\n--------------------\n${req.body}\n--------------------`);

    // Parse request
    const request = JSON.parse(xmlJs.xml2json(req.body, {
      compact: true,
      trim: true,
      ignoreDeclaration: true,
      ignoreInstruction: true,
      ignoreAttributes: true,
      ignoreComment: true,
      ignoreCdata: true,
      ignoreDoctype: true,
    })).PortOutValidationRequest;

    // Check that the request contains an account number, a pin, a zip code, and at least one telephone number
    if (!request) {
      console.log('Invalid request - 7598');
      return res.status(200).send(error(7598));
    } else if (config.verifyAccountNumber && (!request.AccountNumber || !request.AccountNumber._text)) {
      console.log('Missing account number - 7510');
      return res.status(200).send(error(7510));
    } else if (config.verifyPin && (!request.Pin || !request.Pin._text)) {
      console.log('Missing pin - 7512');
      return res.status(200).send(error(7512));
    } else if (config.verifyZipCode && (!request.ZipCode || !request.ZipCode._text)) {
      console.log('Missing zip code - 7514');
      return res.status(200).send(error(7514));
    } else if (config.verifySubscriberName && (!request.SubscriberName || !request.SubscriberName._text)) {
      console.log('Missing subscriber name - 7519');
      return res.status(200).send(error(7519));
    } else if (!request.TelephoneNumbers || !request.TelephoneNumbers.TelephoneNumber) {
      console.log('Missing telephone numbers - 7598');
      return res.status(200).send(error(7598));
    }

    // Create list of requested telephone numbers for porting
    const telephoneNumbers = Array.isArray(request.TelephoneNumbers.TelephoneNumber) ? request.TelephoneNumbers.TelephoneNumber : [request.TelephoneNumbers.TelephoneNumber];

    // Check that list of telephone numbers is not longer than the configured maximum, that each telephone number is not empty, and that each telephone number has exactly 10 digits
    if (telephoneNumbers.length > config.maxTelephoneNumbers) {
      console.log('Too many telephone numbers - 7517');
      return res.status(200).send(error(7517));
    } else if (telephoneNumbers.find(telephoneNumber => !telephoneNumber._text)) {
      console.log('Invalid telephone numbers - 7598');
      return res.status(200).send(error(7598));
    } else if (telephoneNumbers.find(telephoneNumber => !/[0-9]{10}/.test(telephoneNumber._text))) {
      console.log('Invalid telephone numbers - 7598');
      return res.status(200).send(error(7598));
    }

    // Get records from database with the requested telephone numbers
    const records = await knexClient('bandwidth-port-out-validation').select().whereIn('TelephoneNumber', telephoneNumbers.map(telephoneNumber => telephoneNumber._text));

    // For each requested telephone number
    for (const telephoneNumber of telephoneNumbers) {
      // Find the record from the database for that telephone number
      const record = records.find(record => record.TelephoneNumber === telephoneNumber._text);

      // Check that there is a record for that telephone number and account in the database, that the pin and zip code in the database match the request, and that the status in the database is 1
      if (!record) {
        console.log('Unkown telephone number - 7516');
        return res.status(200).send(error(7516));
      } else if (config.verifyAccountNumber && record.AccountNumber !== request.AccountNumber._text) {
        console.log('Unkown account number - 7511');
        return res.status(200).send(error(7511));
      } else if (config.verifyPin && record.Pin !== request.Pin._text) {
        console.log('Unkown pin - 7513');
        return res.status(200).send(error(7513));
      } else if (config.verifyZipCode && record.ZipCode !== request.ZipCode._text) {
        console.log('Unkown zip code - 7515');
        return res.status(200).send(error(7515));
      } else if (config.verifyStatus && record.Status !== 1) {
        console.log('Inactive status - 7518');
        return res.status(200).send(error(7518));
      } else if (config.verifySubscriberName && record.SubscriberName !== request.SubscriberName._text) {
        console.log('Unkown subscriber name - 7519');
        return res.status(200).send(error(7519));
      }
    }

    // Allow port out because nothing above failed
    console.log('Success');
    return res.status(200).send(success());
  } catch (err) {
    // An unexpected error occured
    console.error(err);
    console.log('Unexpected error - 7598');
    return res.status(200).send(error(7598));
  }
});

// Start listening for requests
app.listen(config.port, () => {
  console.log(`Now listening on port ${config.port}`);
});
