let _ = require('lodash'),
    HttpStatus = require('http-status-codes');

let logger, errorMappings;
const REQUIRED_LOGGER_IMPLEMENTATIONS = ['logger.trace', 'logger.info', 'logger.error'];
const INVALID_JSON_ERROR = {
    code: HttpStatus.BAD_REQUEST,
    message: 'Request body must be in JSON syntax.'
};
const INTERNAL_SERVER_ERROR = {
    code: HttpStatus.INTERNAL_SERVER_ERROR,
    message: HttpStatus.getStatusText(HttpStatus.INTERNAL_SERVER_ERROR)
};

let validateOptions = function (options) {
    if (!options || !options.errorMappings) {
        throw new Error('errorMappings object is required');
    }
    if (!_.isObject(options.errorMappings)) {
        throw new Error('errorMappings must be an object');
    }
    let isErrorMappingsValid = _.every(options.errorMappings, (error) => {
        return typeof error.code === 'number' && typeof error.message === 'string';
    });
    if (!_.keys(options.errorMappings).length || !isErrorMappingsValid) {
        throw new Error('invalid errorMappings object schema');
    }
    if (options && options.logger && typeof options.logger.trace !== 'function' && typeof options.logger.info !== 'function' && typeof options.logger.error !== 'function') {
        throw new Error(`logger is missing one or more of the required implementations: ${REQUIRED_LOGGER_IMPLEMENTATIONS}`);
    }
};

let setOptions = function (options) {
    logger = options.logger;
    errorMappings = options.errorMappings;
};

let handleErrors = function (err, req, res, next) {
    let errorMessage = err.message || err.msg;
    var error = errorMappings[errorMessage] || INTERNAL_SERVER_ERROR;
    if (error.code === HttpStatus.INTERNAL_SERVER_ERROR && err instanceof SyntaxError && err.message.includes('in JSON at position')) {
        error = INVALID_JSON_ERROR;
    } else if (error.code === HttpStatus.INTERNAL_SERVER_ERROR) {
        logError(error, req);
    }
    res.status(error.code)
        .json({
            message: error.message,
        });
};

let logError = function (err, req) {
    if (logger) {
        logger.error(buildMessage(err, req));
    }
};

function buildMessage(err, req) {
    let additionalInfo = req._context;
    return {
        message: err.message || err.msg,
        additional_info: additionalInfo
    };
}

module.exports = function (options) {
    validateOptions(options);
    setOptions(options);
    return handleErrors;
};