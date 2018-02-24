var nodemailer = require('nodemailer');
var router = require('express').Router();
var User = require('mongoose').model('User');
var passport = require('passport');
var auth = require('../middlewares').auth;
var crypto = require('crypto');
var async = require('async');

// router.get('/me', auth, function(req, res, next){
//
//     return res.json({user: req.user.toJSON()})
//
// });
//
//
// router.get('/', function(req, res, next){
//     User.find().then(function(users){
//         res.json({users: users})
//     }).catch(next)
// })


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

router.get('/forgot', function (req, res, next) {

    let context = {};
    if (req.query.id) {
        if (req.query.id === '1') {
            context = {
                error : 'No account with that email address exists.'
            }
        }else if (req.query.id === '2') {
            context = {
                info : 'An e-mail has been sent with further instructions.'
            }
        }else if (req.query.id === '3') {
            context = {
                error: 'Password reset token is invalid or has expired.'
            }
        }
    }
    res.render('forgot', context);
});

router.get('/forgot_success', function (req, res) {
    res.render('forgot_success');
});

router.post('/forgot', function(req, res, next) {
    async.waterfall([
        function(done) {
            crypto.randomBytes(20, function(err, buf) {
                var token = buf.toString('hex');
                done(err, token);
            });
        },
        function(token, done) {
            User.findOne({ email: req.body.email }, function(err, user) {
                if (!user) {

                    return res.redirect('/api/users/forgot/?id=1'); //todo check
                } else {
                    user.resetPasswordToken = token;
                    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
                    user.save(function(err) {
                        done(err, token, user);
                    });
                }

            });
        },
        function(token, user, done) {

            var smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'karasavm@gmail.com',
                    pass: 'averelgr'
                }

            });

            var mailOptions = {
                to: user.email,
                from: 'passwordreset@demo.com',
                subject: 'Node.js Password Reset',
                text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                'http://' + req.headers.host + '/api/users/reset/' + token + '\n\n' +
                'If you did not request this, please ignore this email and your password will remain unchanged.\n'
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                // req.flash('info', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
                res.redirect('/api/users/forgot/?id=2')
                done(err, 'done');
            });
        }
    ], function(err) {
        if (err) return next(err);
        // res.redirect('/api/users/forgot');
    });
});


router.get('/reset/:token', function(req, res) {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
            // req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/api/users/forgot/?id=3'); //token expired or is invalid
        }
        res.render('reset');
    });
});


router.post('/reset/:token', function(req, res) {

    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
            // req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/api/users/forgot/?id=3'); //token expired or is invalid
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save(function(err) {
            var smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'karasavm@gmail.com',
                    pass: 'averelgr'
                }

            });
            var mailOptions = {
                to: user.email,
                from: 'passwordreset@demo.com',
                subject: 'Your password has been changed',
                text: 'Hello,\n\n' +
                'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                // req.flash('success', 'Success! Your password has been changed.');
                res.redirect('/api/users/forgot_success')
                // done(err);
            });


        });
    });

});

// router.post('/forget', function (req, res, next) {
//
//     if (!req.body.user || !req.body.user.email){
//         return res.status(400)
//             .json({errors: {'user.email': 'object does not exist or is empty'}})
//     }
//
//     const email = req.body.user.email;
//     User.findOne({email: email})
//         .then(function(user) {
//
//             if (!user) {
//                 return res.status(404)
//                     .json({error: `user with email '${email}' does not exist`})
//             }
//
//             user.setResetPasswordToken();
//
//             user.save().then(function () {
//
//                 // return res.json({message: user.resetPasswordToken})
//                 var smtpTransport = nodemailer.createTransport({
//                     service: 'Gmail',
//                     auth: {
//                         user: 'karasavm@gmail.com',
//                         pass: 'averelgr'
//                     }
//
//                 });
//                 var mailOptions = {
//                     to: 'karasavm@gmail.com',
//                     from: 'karasavm@gmail.com',
//                     subject: 'Kraken Account Password Reset',
//                     text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
//                     'Reset Token:        ----------- '+ user.resetPasswordToken +'  ----------- \n\n' +
//                     'If you did not request this, please ignore this email and your password will remain unchanged.\n'
//                 };
//
//                 smtpTransport.sendMail(mailOptions, function(err, info) {
//                     if(err)
//                         console.log("Error sending email:", err);
//                     else{
//                         console.log(info);
//                         return res.json({message: 'email has been sent'});
//                     }
//
//
//                 });
//
//
//             });
//
//
//         })
//         .catch(next)
//
// });
//
// router.get('/reset/:token', function(req, res, next) {
//     User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } })
//         .then(function(user) {
//             if (!user) {
//                 return res.status(404) //todo: status code
//                     .json({error: 'Password reset token is invalid or has expired.'});
//             }
//             return res.json({message: 'ok'})
//         })
//         .catch(next);
// });
//
// router.post('/reset/:token', function(req, res, next) {
//
//     if (!req.body.user || !req.body.user.password){
//         return res.status(400)
//             .json({errors: {'user.password': 'object does not exist or is empty'}})
//     }
//
//     User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } })
//         .then(function(user) {
//             if (!user) {
//                 return res.status(404) //todo: status code
//                     .json({error: 'Password reset token is invalid or has expired.'});
//             }
//
//
//
//             user.setPassword(req.body.user.password);
//             user.resetPasswordToken = undefined;
//             user.resetPasswordExpires = undefined;
//
//             user.save().then(function (usr) {
//                 return res.json({user: usr.toJSON(auth=true)});
//             });
//
//         })
//         .catch(next);
// });

module.exports = router;
