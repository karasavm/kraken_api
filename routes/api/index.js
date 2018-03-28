var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var User = require('mongoose').model('User');

router.get('/', function(req, res, next) {
    res.json({ title: 'Express22' });
});


router.use('/users', require('./users'));
router.use('/groups', require('./groups'));
router.use('/helper', require('./helper'));


router.use(function(err, req, res, next){
    if(err.name === 'ValidationError'){
        return res.status(422).json({
            errors: Object.keys(err.errors).reduce(function(errors, key){
                errors[key] = err.errors[key].message;
                return errors;
            }, {})
        });
    }

    return next(err);
});

module.exports = router;