

module.exports = {
    secret: process.env.NODE_ENV === 'production' ? process.env.SECRET : 'secret',
    mongoUri: process.env.NODE_ENV === 'production' ? 'mongodb://localhost/kraken' : 'mongodb://localhost/kraken',
    port: process.env.NODE_ENV === 'production' ? 3000 : 3000,
};
