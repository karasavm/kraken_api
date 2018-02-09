var mongoose = require('mongoose');

var memberSchema = new mongoose.Schema({
    name: String
});

var groupSchema = new mongoose.Schema({
    name: {type: String, default: "Unnamed", required:[true, "Name can't be black"]},
    users: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    members: [memberSchema],
    transactions: [{type: mongoose.Schema.Types.ObjectId, ref: 'Transaction'}]
}, {timestamps: true});

memberSchema.methods.toJSON = function() {

    return {
        id: this._id,
        name: this.name
    }
}

groupSchema.methods.toJSON = function() {

    return {
        id: this._id,
        name: this.name,
        creator: this.creator.toJSON(auth=false),
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        users: this.users.map(function(user) {return user.toJSON()}),
        members: this.members.map(function(member){return member.toJSON()}),
        transactions: this.transactions.map(function(trans){return trans.toJSON()})
    }
}

groupSchema.methods.pushMember = function(name){

    if( !this.members.some(function(member){return member.name === name;})){

        this.members.push({name: name});
        return true;
    }
    return false; //member already exist
} ;


groupSchema.methods.pushUser = function(user){

    if (user._id.toString() === this.creator._id.toString()) {return true}
    if (!this.users.some(function(u){ console.log(u); return user._id.toString() === u._id.toString()})){
        this.users.push(user);
        return true;
    }

    return false;
};
mongoose.model('Group', groupSchema);