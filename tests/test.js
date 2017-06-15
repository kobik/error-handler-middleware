let errorHandler = require('./../index'),
    sinon = require('sinon'),
    httpMock = require('node-mocks-http'),
    should = require('should');

describe('When initiating the middleware', function() {
    it('Should throw an error when sending an undefined as an argument', function() {
        try {
            errorHandler();
        } catch (error) {
            should(error.message).eql('errorMappings object is required');
        }
    });
    it('Should throw an error when errorMappings is missing', function() {
        try {
            errorHandler({});
        } catch (error) {
            should(error.message).eql('errorMappings object is required');
        }
    });
    it('Should throw an error when errorMappings is not an object', function() {
        try {
            errorHandler({
                errorMappings: 'dasd'
            });
        } catch (error) {
            should(error.message).eql('errorMappings must be an object');
        }
    });
    it('Should throw an error when errorMappings schema is invalid', function() {
        try {
            errorHandler({
                errorMappings: {
                    a: 'b'
                }
            });
        } catch (error) {
            should(error.message).eql('invalid errorMappings object schema');
        }
    });
    it('Should throw an error when errorMappings schema is invalid', function() {
        try {
            errorHandler({
                errorMappings: {
                    a: 'b'
                }
            });
        } catch (error) {
            should(error.message).eql('invalid errorMappings object schema');
        }
    });
    it('Should throw an error when passing a logger with non implemented required functions', function() {
        try {
            errorHandler({
                errorMappings: {
                    erro1: {
                        code: 400,
                        message: 'stam'
                    },
                    erro2: {
                        code: 400,
                        message: 'stam'
                    }
                },
                logger: {
                    trace: {},
                    info: {},
                    error: {}
                }
            });
        } catch (error) {
            should(error.message).startWith('logger is missing one or more of the required implementations');
        }
    });
});

describe('When calling the middleware', function() {
    let sandbox;
    let req, res, err, next;
    let consoleErrorStub;
    let errorMappings;
    let errorHandlerVar;
    before(function() {
        sandbox = sinon.sandbox.create();
        req = httpMock.createRequest({
            headers: {'x-zooz-request-id': 'requestId'}
        });
        res = httpMock.createResponse();
        err = new Error('error1');
        err.additional_info = 'some info';
        errorMappings = {
            error1: {
                code: 400,
                message: 'stam1'
            },
            error2: {
                code: 401,
                message: 'stam2'
            }
        };
    });
    beforeEach(function () {
        consoleErrorStub = sandbox.stub(console, 'error');
        res.status = sandbox.stub().returns(res);
        res.json = sandbox.stub();
        next = sandbox.stub();
        errorHandlerVar = errorHandler({
            errorMappings: errorMappings,
            logger: console
        });
    });
    afterEach(function () {
        sandbox.restore();
    });

    it('Should send the expected status code on expected error', function () {
        errorHandlerVar(err, req, res, next);
        should(res.status.args[0]).eql([errorMappings.error1.code]);
        should(res.json.args[0]).eql([{
            message: errorMappings.error1.message
        }]);
        should(consoleErrorStub.called).eql(false);
    });

    it('Should send response with status code 500 on unexpected error', function () {
        let err = new Error('other error');
        errorHandlerVar(err, req, res, next);
        should(res.status.args[0]).eql([500]);
        should(res.json.args[0]).eql([{
            message: 'Server Error',
        }]);
        should(consoleErrorStub.called).eql(true);
    });

    it('Should send 400 on JSON parse error', function () {
        let err;
        try {
            JSON.parse('stam')
        } catch (error) {
            err = error;
        }
        errorHandlerVar(err, req, res, next);
        should(res.status.args[0]).eql([400]);
        should(res.json.args[0]).eql([{
            message: 'Request body must be in JSON syntax.'
        }]);
        should(consoleErrorStub.called).eql(false);
    });
});