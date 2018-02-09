var mongoose = require('mongoose');

var memberSchema = new mongoose.Schema({
    name: String
});


// Sub document schema for poll choices
var paymentSchema = new mongoose.Schema({
    member: {type: mongoose.Schema.Types.ObjectId, required: [true, "can't be blank"]},
    amount: {
        type: Number,
        default: 0,
        validate: {
            validator: function(v) {return v >= 0;},
            message: "can't be negative"
        }
    },
    debt: {
        type: Number,
        default: -1,
        validate: {
            validator: function(v) {return v>=0 || v==-1;},
            message: "must be positive or 0 or -1"
        }
    }
    // votes: [voteSchema]
});


var typeEnums = ["general", "byFor", "give"];
// Document schema for polls
var TransactionSchema = new mongoose.Schema({
    name: { type: String, required: [true, "can't be blank"]},
    //group: {type: mongoose.Sche ma.Types.ObjectId, ref: 'Group'},
    // payments: [paymentSchema],
    payments: [{
        member: {type: mongoose.Schema.Types.ObjectId, required: [true, "can't be blank"]},
        amount: {
            type: Number,
            default: 0,
            validate: {
                validator: function(v) {return v >= 0;},
                message: "can't be negative"
            }
        },
        debt: {
            type: Number,
            default: -1,
            validate: {
                validator: function(v) {return v>=0 || v==-1;},
                message: "must be positive or 0 or -1"
            }
        }
    }],
    type: {type: String, enum: {values: typeEnums,message: "must be on of ["+typeEnums+"]"}, default:'general', required: [true, "can't be blank"]}

}, {timestamps: true});

TransactionSchema.methods.memberIndex = function(memberId){

  return this.payments.findIndex(function(payment){return payment.member.toString() === memberId.toString()});
};

TransactionSchema.methods.toJSON = function(){
    return {
        id: this._id,
        name: this.name,
        //group: this.group.toJSON(),
        //group: {name: this.group.name, id: this.group._id},
        payments: this.payments.map(function(payment){return {
            id: payment._id,
            member: payment.member,
            amount: payment.amount,
            debt: payment.debt
        }}),
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        type: this.type
    }
};

paymentSchema.methods.toJSON = function(){
    return {
        id: this._id,
        member: this.member,
        amount: this.amount,
        debt: this.debt
    }
};


//todo: transactions validations, with amounts and debts
//todo: transactions validations, acording to transaction type. certain types needs certain kind of payments


//todo: check unique members inside payments
//todo: check transactions validity
//todo: check member exists in group
//todo: validate transaction type




mongoose.model('Transaction', TransactionSchema);
