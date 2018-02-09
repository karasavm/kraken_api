var router = require('express').Router();
var User = require('mongoose').model('User');
var passport = require('passport');
var auth = require('../middlewares').auth;
/* GET users listing. */
//router.get('/', function(req, res, next) {
//  res.json({'message': 'no user'});
//});



router.get('/me', auth, function(req, res, next){

    return res.json({user: req.user.toJSON()})

});


router.get('/', function(req, res, next){
    User.find().then(function(users){
        res.json({users: users})
    }).catch(next)
})
//Auth routes
router.post('/register', function(req, res, next){

    if (!req.body.user){ res.status(400).json({errors: {user: 'object does not exist'}})}

    var user = new User();
    user.name = req.body.user.name;
    user.email = req.body.user.email;
    user.setPassword(req.body.user.password);
    user.save()
        .then(function(){
            return res.json({user: user.toJSON(auth=true)});
        }).catch(next);
});
router.post('/login', function(req, res, next){
    if(!req.body.user.email){
        return res.status(401).json({errors: {email: "Email can't be blank!"}});
    }

    if(!req.body.user.password){
        return res.status(401).json({errors: {password: "Password can't be blank!"}});
    }

    passport.authenticate('local', {session: false}, function(err, user, info){
        if(err){ return next(err); }

        if(user){
            user.token = user.generateJWT();
            return res.json({user: user.toJSON(auth=true)});
        } else {
            return res.status(401).json(info);
        }
    })(req, res, next);
});


module.exports = router;
