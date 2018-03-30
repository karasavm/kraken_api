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


    // User.find({"$or": [
    //         {email: { "$regex" :  req.query.searchKey, "$options": "i"  } },
    //         {name: { "$regex" :  req.query.searchKey, "$options": "i"  } }
    //     ]}
    // )
    //     .limit(5)
    User.find({'email': req.query.searchKey})
        .limit(1)
        .then(function (users) {



            return res.json({users: users.map(function (user) {
                    return user.toJSONSimple();
                })});

        }).catch(next);

});



router.get('/friends',auth, function(req, res, next){

    // Group.find({$or: [{creator: {_id: req.user.id} }, {users: {_id: req.user.id}}]})
    Group.find({'members.user': {_id: req.user._id}})
        .populate('members.user')
        .then(function(groups){

            let users = [];
            for (let k=0; k < groups.length; k ++) {
                for (let i = 0; i < groups[k].members.length; i++) {

                    if (groups[k].members[i].user) {

                        users.push(groups[k].members[i].user);

                    }
                }
            }

            let unique = [];
            for (let i=0; i < users.length; i++) {
                let found = false;
                for (let j=i+1; j<users.length; j++) {
                    if (users[i].id === users[j].id) {
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    if (users[i].id !== req.user._id.toString())
                    unique.push(users[i]);
                }
            }

            return res.json({users: unique.map(function(user) {return user.toJSONSimple()})});
        }).catch(next)

});

module.exports = router;
