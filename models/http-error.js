class HttpError extends Error {
    constructor (message, errorCode) {
        super(message); // adding message property
        this.code = errorCode; // 
    }   
}

module.exports = HttpError;