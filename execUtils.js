const util = require('util');
const exec = util.promisify(require('child_process').exec);

/**
 * Executes the given command.
 * @param {object} logger
 * @param {string} command - the command to be executed
 * @param {object} environmentVariables - object of key value pairs passed to exec as env. variables
 * @return {string} standard output (stdout) or undefined in case of an error
 */
 async function execute(logger, command, environmentVariables) {
    logger.debug(`Trying to execute command: ${command} with env. variables: ${JSON.stringify(environmentVariables)}`);
    try {
      const { stdout, stderr } = await exec(command, { env: environmentVariables });
      if(stderr) {
        logger.error(stderr);
        return;
      }
      logger.debug(stdout);
      return stdout.trim();
    } catch (err) {
      logger.error(`Could not execute command: ${err.cmd}`);
      logger.error(`Message: ${err.message}`);
      return;
    }
  }    


module.exports = {
  execute: execute
};