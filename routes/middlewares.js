var jwt = require('jsonwebtoken');
var secret = require('../config').secret;
var User = require('mongoose').model('User');

function getTokenFromHeader(req){
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Token' ||
        req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer'||
        req.querystring.authorization ) {
        return req.headers.authorization.split(' ')[1];
    }
    console.log(req.querystring)
    if (req.querystring.authorization ) {
        return req.querystring.authorization;
    }

    return null;
}


exports.auth = function(req, res, next) {

    //todo: handle with better way the failure, respond beeter json and code etc. see jwt-express

    var token = req.body.access_token || req.query.access_token || req.headers['x-access-token'] || req.headers['authorization'];
    // return res.sendStatus(401);
    // decode token
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, secret, function(err, decoded) {
            if (err) {
                return res.sendStatus(401);
            } else {
                // if everything is good, save to request for use in other routes


                User.findById(decoded.id)
                    .then(function(user){
                        if (!user) { return res.sendStatus(401); }
                        req.user = user;
                        return next();
                    }).catch(next);

            }
        });
    } else {
        // if there is no token
        // return an error
        return res.sendStatus(401);
    }
};

exports.permit = function(req, res, next){


    if (req.user._id.toString() === req.group.creator._id.toString()) return next();

    if (req.group.users.some(function(user){return user._id.toString() === req.user._id.toString()})) return next();
    if (req.group.members.some(function(member){
        if (member.user && member.user._id.toString() === req.user._id.toString()) return true;
        return false;
        // return member.user._id.toString() === req.user._id.toString()
    })) return next();
    res.status(403).json({errors: {group: "access isn't allowed"}})
}

