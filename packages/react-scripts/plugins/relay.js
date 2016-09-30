var paths = require('react-scripts/config/paths');
var chalk = require('chalk');
var fetch = require('node-fetch');
var graphQLUtilities = require('graphql/utilities');
var fs = require('fs');

var isEnabled = function() {
  var appPackageJson = require(paths.appPackageJson);

  if (appPackageJson && appPackageJson.dependencies && appPackageJson.dependencies['react-relay']) {
    return true;
  }

  return false
}

var requireGraphQlConfig = function() {
  return new Promise((resolve, reject) => {
    if (!process.env.REACT_APP_GRAPHQL_URL) {
      var errorMessage = chalk.red('Relay requires a url to your graphql server\n') +
        'Specifiy this in a ' + chalk.cyan('REACT_APP_GRAPHQL_URL') + ' environment variable.';
      reject(new Error(errorMessage));
    }

    console.log("Relay support - graphql configured successfully");
    resolve();
  })
}

var validateSchemaJson = function() {
  return new Promise((resolve, reject) => {
    try {
      var schemaFileContents = fs.readFileSync(paths.relaySchema);
    } catch (err) {
      var errorMessage = chalk.red('babel-relay-plugin requires a local copy of your graphql schema\n') +
        'Run ' + chalk.cyan('npm run fetchRelaySchema') + ' to fetch it from the ' + chalk.cyan('REACT_APP_GRAPHQL_URL') + ' environment variable.';
      reject(new Error(errorMessage));
    }

    try {
      var schemaJSON = JSON.parse(schemaFileContents);
    } catch (err) {
      var errorMessage = chalk.red('JSON parsing of the contents of ' + chalk.cyan(paths.relaySchema) + ' failed.\n') +
        'Check the contents of ' + chalk.cyan(paths.relaySchema) + '. It does not appear to be valid json\n' +
        'Also try running ' + chalk.cyan('npm run fetchRelaySchema') + ' to re-fetch the schema.json from the ' + chalk.cyan('REACT_APP_GRAPHQL_URL') + ' environment variable.';
      reject(new Error(errorMessage));
    }

    try {
      var graphQLSchema = graphQLUtilities.buildClientSchema(schemaJSON.data);
    } catch (err) {
      var errorMessage = chalk.red('Could not parse the contents of schema.json into a valid graphql schema that is compatiable with this version of Relay and babel-relay-plugin\n') +
        'Upgrading graphql library on your server may be a solution.';
      reject(new Error(errorMessage));
    }

    console.log('Relay support - schema.json is found and valid');
    resolve();
  });
}

var fetchRelaySchema = function() {
  return fetch(process.env.REACT_APP_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 'query': graphQLUtilities.introspectionQuery }),
  }).then(res => res.json()).then(schemaJSON => {
    var graphQLSchema = graphQLUtilities.buildClientSchema(schemaJSON.data);

    fs.writeFileSync(paths.relaySchema, JSON.stringify(schemaJSON, null, 2));
    fs.writeFileSync(paths.relaySchema.replace('.json','.graphql'), graphQLUtilities.printSchema(graphQLSchema));

    console.log('Relay support - fetch schema.json from ' + chalk.cyan(process.env.REACT_APP_GRAPHQL_URL));
  });
}

var build = function() {
  return requireGraphQlConfig()
    .then(validateSchemaJson)
    .then(() => {
      console.log(chalk.green('Relay support built successfully!'));
    });
}

var start = function() {
  return requireGraphQlConfig()
    .then(fetchRelaySchema)
    .then(validateSchemaJson)
    .then(() => {
      console.log(chalk.green('Relay support enabled successfully!'));
    })
}

module.exports = {
  isEnabled: isEnabled,
  build: build,
  start: start
};
