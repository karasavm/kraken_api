var express = require('express');
var router = express.Router();
var Group = require('mongoose').model('Group');
var User = require('mongoose').model('User');
var Transaction = require('mongoose').model('Transaction');
var auth = require('../middlewares').auth;
var permit = require('../middlewares').permit;


router.get('/users',auth, function(req, res, next){

    if (typeof req.query.searchKey === 'undefined') {
        return res.status(400).json({errors: {"searchKey": "query param doesn't exist"}})
    }


    User.find({"$or": [
            {email: { "$regex" :  req.query.searchKey, "$options": "i"  } },
            {name: { "$regex" :  req.query.searchKey, "$options": "i"  } }
        ]}
    )
        .limit(5)
        .then(function (users) {



            return res.json({users: users.map(function (user) {
                    return user.toJSONSimple();
                })});

        }).catch(next);

});

module.exports = router;
