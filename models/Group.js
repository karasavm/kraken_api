var mongoose = require('mongoose');

var memberSchema = new mongoose.Schema({
    name: String,
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
});

var groupSchema = new mongoose.Schema({
    name: {type: String, default: "Unnamed", required:[true, "Name can't be black"]},
    users: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    members: [memberSchema],
    transactions: [{type: mongoose.Schema.Types.ObjectId, ref: 'Transaction'}]
}, {timestamps: true});

memberSchema.methods.toJSON = function() {
    const that = this;

    return {
        id: this._id,
        name: this.user ? this.user.name : this.name,
        user: this.user ? this.user.toJSONSimple() : this.user
        // user: {
        //     id: that.user._id,
        //     name: that.user.name,
        //     email: that.user.email
        // }
    }
};

groupSchema.methods.toJSON = function() {

    return {
        id: this._id,
        name: this.name,
        creator: this.creator.toJSON(auth=false),
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        users: this.users.map(function(user) {return user.toJSON()}),
        members: this.members.map(function(member){return member.toJSON()}),
        transactions: this.transactions.map(function(trans){return trans.toJSON()}).reverse()
    }
}

groupSchema.methods.setMemberName = function(memberIndex, name) {

    if (this.members[memberIndex].user) {
        // isNotVirtualMember
        return false; // unauthorized to update an non Virtual Member
    }

    // check that name does not exist to other member
    for (var i=0; i < this.members.length; i++) {
        if (this.members[i].toJSON().name === name && i == memberIndex) {
            // set the same name to a member
            // nothing changes and its OK
            return true;
        }
        if (this.members[i].toJSON().name === name ) {
            return false;
        }
    }


    this.members[memberIndex].name = name;

    return true;


};


groupSchema.methods.pushMember = function(name, user = null){


    let u = {name: name};

    if (user) {
        // check if user already exists
        for (var i=0; i < this.members.length; i++) {
            if (this.members[i].user && this.members[i].user._id.toString() === user._id.toString()) {
                return false;
            }

        }
        u['user'] = user;
    } else {
        for (var i=0; i < this.members.length; i++) {

            if (this.members[i].toJSON().name === name ) {
                return false;
            }

        }
    }
    this.members.push(u);
    return true;

    // if( !this.members.some(function(member){return member.name === name;})){
    //
    //     this.members.push({name: name});
    //     return true;
    // }
    // return false; //member already exist
} ;

groupSchema.methods.linkMember = function(memberIndex, user) {

    // ---- BE CAREFULL ---
    // link member function will overwrite an already linked user with the new provided user


    // // check if already linked
    // if (this.members[memberIndex].user) {
    //     return false;
    // }


    // check if user already exists
    for (var i=0; i < this.members.length ; i++) {
        if (this.members[i].user && this.members[i].user.email === user.email) {
            // user with provided email already exists in group
            return false;
        }
    }

    this.members[memberIndex].user = user;

    return true;
};

groupSchema.methods.unlinkMember = function(memberIndex) {
  if (this.members[memberIndex].user) {
      this.members[memberIndex].user = null;
  }
  return true;

};
groupSchema.methods.pushUser = function(user){

    // if (user._id.toString() === this.creator._id.toString()) {return true}
    if (!this.users.some(function(u){ console.log(u); return user._id.toString() === u._id.toString()})){
        this.users.push(user);
        return true;
    }

    return false;
};
mongoose.model('Group', groupSchema);