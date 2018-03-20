var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var secret = require('../config').secret;
var ValidationError = mongoose.Error.ValidationError;
var ValidatorError  = mongoose.Error.ValidatorError;


var UserSchema = new mongoose.Schema({
    //username: {type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true},
    email: {type: String, lowercase: true, unique: [true, "Email is in use!"], required: [true, "Email can't be blank!"], match: [/\S+@\S+\.\S+/, 'Email is invalid!'], index: true},
    name: {type: String, required:[true, "Name can't be black"]},
    //image: String,
    //favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }],
    //following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    hash: String,
    salt: String,

    resetPasswordToken: String,
    resetPasswordExpires: Date
}, {timestamps: true});

UserSchema.plugin(uniqueValidator, {message: 'Email already taken!'});

UserSchema.index({'name': 'text', 'email': 'text'});


UserSchema.methods.validPassword = function(password) {
    var hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
    return this.hash === hash;
};

UserSchema.methods.setPassword = function(password){
    if (!password){
        var error = new ValidationError(this);
        error.errors.password = new ValidatorError({ message: "Password can't be blank!", name: 'ValidatorError'});
        throw error;
    }
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UserSchema.methods.generateJWT = function() {
    var today = new Date();
    var exp = new Date(today);
    exp.setDate(today.getDate() + 60); //60 days

    return jwt.sign({
        id: this._id,
        name: this.name,
        email: this.email,
        exp: parseInt(exp.getTime() / 1000)
    }, secret);
};

UserSchema.methods.generateResetPasswordJWT = function() {

    var today = new Date();
    var exp = new Date(today);
    exp.setDate(today.getDate() + 1); // one day
    const secret = this.hash + '-' + this.createdAt.getTime();

    const payload = {
        id: this._id,
        email: this.email,
        exp: parseInt(exp.getTime() / 1000)
    };

    const token = jwt.sign(payload, secret);

    return token;
}

UserSchema.methods.setResetPasswordToken = function() {

    this.resetPasswordToken = crypto.randomBytes(3).toString('hex');
    this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
};

UserSchema.methods.toJSON = function(auth = false){

    return {
        id: this._id,
        name: this.name,
        email: this.email,
        token: auth ? this.generateJWT() : undefined,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
        //bio: this.bio,
        //image: this.image
    };
};

UserSchema.methods.toJSONSimple = function(){

    return {
        id: this._id,
        name: this.name,
        email: this.email
    };
};


//UserSchema.methods.toProfileJSONFor = function(user){
//    return {
//        username: this.username,
//        bio: this.bio,
//        image: this.image || 'https://static.productionready.io/images/smiley-cyrus.jpg',
//        following: user ? user.isFollowing(this._id) : false
//    };
//};

//UserSchema.methods.favorite = function(id){
//    if(this.favorites.indexOf(id) === -1){
//        this.favorites.push(id);
//    }
//    return this.save();
//};

//UserSchema.methods.unfavorite = function(id){
//    this.favorites.remove(id);
//    return this.save();
//};

//UserSchema.methods.isFavorite = function(id){
//    return this.favorites.some(function(favoriteId){
//        return favoriteId.toString() === id.toString();
//    });
//};

//UserSchema.methods.follow = function(id){
//    if(this.following.indexOf(id) === -1){
//        this.following.push(id);
//    }
//
//    return this.save();
//};

//UserSchema.methods.unfollow = function(id){
//    this.following.remove(id);
//    return this.save();
//};

//UserSchema.methods.isFollowing = function(id){
//    return this.following.some(function(followId){
//        return followId.toString() === id.toString();
//    });
//};

mongoose.model('User', UserSchema);
