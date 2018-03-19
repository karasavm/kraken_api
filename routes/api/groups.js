var express = require('express');
var router = express.Router();
var Group = require('mongoose').model('Group');
var User = require('mongoose').model('User');
var Transaction = require('mongoose').model('Transaction');
var auth = require('../middlewares').auth;
var permit = require('../middlewares').permit;

///////////////////////////////////
router.param('group', function(req, res, next, groupId){

    Group.findById(groupId)
        .populate('creator')
        .populate('users')
        .populate('transactions')
        .populate('members.user')
        .then(function(group){
            if (!group){return res.status(404).json({message: "Unknown group!"})}
            req.group = group;
            next();
        }).catch(next)
});
router.param('member', function(req, res, next, member){
    console.log(typeof member);
    // console.log(req.group)
    var index = req.group.members.findIndex(function(memb){return memb._id.toString() === member});
    if (index == -1) return res.status(404).json({errors: {member: "doesn't exist"}});

    req.memberIndex = index;
    next();
});
router.param('transaction', function(req, res, next, transaction){
    var index = req.group.transactions.findIndex(function(trans){return trans._id.toString() === transaction});
    if (index == -1) return res.status(404).json({errors: {transaction: "doesn't exist"}});

    req.transactionIndex = index;
    next();
});
router.param('payment', function(req, res, next, payment){
    var index = req.group.transactions[req.transactionIndex].payments.findIndex(function(p){return p._id.toString() === payment});
    if (index == -1) return res.status(404).json({errors: {payment: "doesn't exist"}});

    req.paymentIndex = index;
    next();
});
///////////////////////////////////////////////////////////////////////////////////////
router.get('/',auth, function(req, res, next){

    // Group.find({$or: [{creator: {_id: req.user.id} }, {users: {_id: req.user.id}}]})
    Group.find({'members.user': {_id: req.user._id}})
    // Group.find({_id: '5aae8949727f1726f05d531d'})
    // Group.find({})
        .populate('creator')
        .populate('users')
        .populate('transactions')
        .populate('members.user')
        .then(function(groups){
            return res.json({groups: groups.map(function(group){
                    return group.toJSON()
                })})
        }).catch(next)

});

router.post('/', auth, function(req, res, next){

    if (!req.body.group){return res.status(400).json({errors: {group: 'object does not exist'}})}

    var group = new Group();

    group.name = req.body.group.name;
    group.creator = req.user;

    group.pushUser(req.user);

    group.pushMember(req.user.name, req.user);

    group.save().then(function(){
        return res.json({group: group.toJSON()})
    }).catch(next);

});

router.get('/:group', auth, permit, function(req, res, next){

    return res.json({group: req.group.toJSON()})
});
router.put('/:group',auth, permit, function(req, res, next){
    if (!req.body.group){return res.status(400).json({errors: {group: 'object does not exist'}})}


    if (typeof req.body.group.name === 'undefined') {
        return res.json({group: req.group.toJSON()});
    }
    else {
        req.group.name = req.body.group.name;

        req.group.save().then(function(group){
            console.log("efweeee")
            return res.json({group: group.toJSON()})
        }).catch(next)
    }
});
router.delete('/:group',auth, permit, function(req, res, next){
    const transIds = req.group.transactions.map(function(t) { return t.id});
    Transaction.remove({_id: { $in: transIds}}).then(function (data) {
        Group.remove({_id: req.group.id}).then(function(data) {
            res.json({message: "ok"})
        })


    }).catch(next);
});
/////////////-////////-----------------------MEMBERS-----------------//////////////////////////
router.post('/:group/members', auth, permit, function(req, res, next){
    if (!req.body.member){return res.status(400).json({errors: {member: 'object does not exist'}})}

    if (!req.body.member.email){
        if (!req.body.member.name) {
            // neither email nor name found
            return res.status(400).json({errors: {name: "or can't be blank", email: "or can't be blank"}})
        } else {
            // name found
            if (req.group.pushMember(req.body.member.name)) {
                req.group.save().then(function(group){
                    return res.json({group: group.toJSON()});
                }).catch(next);
            }else {
                return res.status(400).json({name: "member name in use"});
            }
        }

    } else {
        // email found
        User.findOne({email: req.body.member.email}).then(function(user){
            if(!user){return res.status(400).json({errors: {email: "email does not exist"}})}

            if (req.group.pushMember(user.name, user)) {
                req.group.save().then(function(group){
                    return res.json({group: req.group.toJSON()})
                }).catch(next);
            }else {
                return res.status(400).json({email: "user with provided email already exists in group"})
            }

        }).catch(next);

    }

    // if (req.group.pushMember(req.body.member.name)) {
    //     req.group.save().then(function(group){
    //         return res.json({group: group.toJSON()});
    //     }).catch(next);
    // }else {
    //     return res.status(400).json({name: "already taken"})
    // }

});
router.put('/:group/members/:member',auth, permit, function(req, res, next){
    if (!req.body.member){return res.status(400).json({errors: {member: 'object does not exist'}})}

    // if (!req.body.member.name) {
    //     return res.status(400).json({errors: {name: 'member.name object does not exist'}});
    // }


    if (typeof req.body.member.email !== 'undefined') {
        // member.email found
        // link to a user

        if (req.body.member.email === '') {
            // unlink a member user
            // convert it to virtual

            req.group.unlinkMember(req.memberIndex);


            req.group.save().then(function (group) {
                return res.json({group: req.group.toJSON()})
            }).catch(next);

        } else {
            // email provided
            // link member to user with provided email

            // check if is notVirtual, already linked
            if (req.group.members[req.memberIndex].user) {
                return res.status(400).json({email: "member already linked"});
            }


            User.findOne({email: req.body.member.email}).then(function (user) {
                if (!user) {
                    return res.status(400).json({errors: {email: "email does not exist"}})
                }

                if (req.group.linkMember(req.memberIndex, user)) {
                    req.group.save().then(function (group) {
                        return res.json({group: req.group.toJSON()})
                    }).catch(next);
                } else {
                    return res.status(400).json({email: "user with provided email exists to group"});
                }

            }).catch(next);
        }

    } else if (typeof req.body.member.name !== 'undefined') {
        // member.email NOT found
        // member.name found

        // check if not a virtualMember
        if (req.group.members[req.memberIndex].user) {
            // linked member
            return res.status(400).json({name: "not a virtual member"});
        }
        if (req.group.setMemberName(req.memberIndex, req.body.member.name)) {
            //success
            req.group.save().then(function (group) {
                return res.json({group: group.toJSON()})
            }).catch(next)
        } else {

            return res.status(400).json({name: "member name in use"});
        }
    } else {
        // member.email NOT found
        // member.name NOT found
        return res.status(400).json({name: "member.name or member.email objects do not exist."})

    }





});
router.delete('/:group/members/:member', auth, permit, function(req, res, next){

    var member = req.group.members[req.memberIndex];


    var exists = req.group.transactions.findIndex(function(transaction){
        return transaction.memberIndex(member.id) !== -1
    }) !== -1;

    if (exists){
        return res.status(400).json({errors: {"member": "is in use on transaction. can't delete"}})
    }

    req.group.members.splice(req.memberIndex, 1);

    req.group.save().then(function(group){
        return res.json({group: group.toJSON()});
    }).catch(next)

});
/////////////////////////////////////////////////////////////////////////////////////////
router.post('/:group/users', auth, permit, function(req, res, next){
    if (!req.body.user){return res.status(400).json({errors: {user: 'object does not exist'}})}

    if (!req.body.user.email){return res.status(400).json({errors: {email: "can't be blank"}})}

    User.findOne({email: req.body.user.email}).then(function(user){
        if(!user){return res.status(400).json({errors: {user: "does not exist"}})}

        if (req.group.pushUser(user)) {
            req.group.save().then(function(group){
                return res.json({group: group.toJSON()});
            }).catch(next);
        }else {
            return res.json({user: "exists"})
        }

    }).catch(next);

});
router.delete('/:group/users/:user',auth, permit, function(req, res, next){
    var index = req.group.users.findIndex(function(user){ return user._id.toString() === req.params.user});

    if (index == -1) return res.status(404).json({errors: {user: "doesn't exist"}});

    req.group.users.splice(index, 1); //remove

    req.group.save().then(function(group){

        return res.json({group: group.toJSON()})
    }).catch(next);

});
///////////////////////////////////////////////////////////////////////////////////////
router.post('/:group/transactions',auth, permit, function(req, res, next){
    if (!req.body.transaction){return res.status(400).json({errors: {transaction: 'object does not exist'}})}

    const transaction = new Transaction({
        name: req.body.transaction.name,
        payments: req.body.transaction.payments,
        type: req.body.transaction.type //type has been set to general for now
    });

    transaction.save().then(function(transaction){
        req.group.transactions.push(transaction);
        req.group.save().then(function(group){
            // return res.json({group: group.toJSON()});
            return res.json({transaction: group.transactions[group.transactions.length - 1].toJSON(), members: group.members});
        }).catch(next)

    }).catch(next);
});
router.put('/:group/transactions/:transaction',auth, permit, function(req, res, next){


    if (!req.body.transaction){return res.status(400).json({errors: {transaction: 'object does not exist'}})}

    const trans = req.group.transactions[req.transactionIndex];

    if(typeof req.body.transaction.name !== 'undefined'){
        trans.name = req.body.transaction.name;
    }

    if(typeof req.body.transaction.payments !== 'undefined'){
        trans.payments = req.body.transaction.payments;
    }

    trans.save().then(function(trans){
        // req.group.transactions[req.transactionIndex] = trans;
        // return res.json({group:req.group.toJSON()})

        return res.json({transaction: trans.toJSON()});
    }).catch(next);


});
router.get('/:group/transactions/:transaction',auth, permit, function(req, res, next){

    return res.json({transaction: req.group.transactions[req.transactionIndex].toJSON(), members: req.group.members})
});
router.delete('/:group/transactions/:transaction',auth, permit, function(req, res, next){

    // pop transaction from group object
    req.group.transactions.splice(req.transactionIndex, 1);
    Transaction.remove({_id: req.params.transaction}).then(function(){
        req.group.save().then(function(group){
            return res.json({group: group.toJSON()});
        }).catch(next);
    }).catch(next)
});




////////////////////////////////////
router.put('DEPRICATED/:group/transactions/:transaction',auth, permit, function(req, res, next){
    if (!req.body.transaction){return res.status(400).json({errors: {transaction: 'object does not exist'}})}

    var trans = req.group.transactions[req.transactionIndex];

    if(typeof req.body.transaction.title !== 'undefined'){
        trans.title = req.body.transaction.title;
    }

    trans.save().then(function(trans){
        req.group.transactions[req.transactionIndex] = trans;
        return res.json({group:req.group.toJSON()})
    }).catch(next);
});
router.post('DEPRICATED/:group/transactions',auth, permit, function(req, res, next){
    if (!req.body.transaction){return res.status(400).json({errors: {transaction: 'object does not exist'}})}


    var transaction = new Transaction();

    transaction.title = req.body.transaction.title;
    transaction.type = req.body.transaction.type;
    transaction.group = req.group;

    transaction.save().then(function(transaction){

        //todo: Transactional approach
        req.group.transactions.push(transaction);
        req.group.save().then(function(group){
            return res.json({group: group.toJSON()});
        }).catch(next)

    }).catch(next);

});

router.post('DEPRICATED/:group/transactions/:transaction/payments',auth, permit, function(req, res, next){

    if (!req.body.payment){return res.status(400).json({errors: {payment: 'object does not exist'}})}

    var trans = req.group.transactions[req.transactionIndex];


    // Validate member
    var memberId = req.body.payment.member;
    if(typeof memberId === 'undefined'){
        return res.status(400).json({errors: {"member.id": "can't be blank"}})
    }
    if (req.group.members.findIndex(function(member){return member._id.toString() === memberId}) == -1){
        return res.status(400).json({errors: {"member": "doesn't exist"}})
    }
    //:todo uncomment
    //if (trans.payments.findIndex(function(payment){return payment.member.toString()  === memberId}) != -1){
    //    return res.status(400).json({errors: {"member": "participates in transaction"}})
    //}
    trans.payments.push(req.body.payment);


    trans.save().then(function(trans){
        res.json({transaction: trans.toJSON()})
    }).catch(next)

});
router.get('DEPRICATED/:group/transactions/:transaction/payments/:payment',auth, permit, function(req, res, next){
    return res.json({payment: req.group.transactions[req.transactionIndex].payments[req.paymentIndex]});
});
router.put('DEPRICATED/:group/transactions/:transaction/payments/:payment',auth, permit, function(req, res, next){

    if (!req.body.payment){return res.status(400).json({errors: {payment: 'object does not exist'}})}

    var trans = req.group.transactions[req.transactionIndex];
    var payment = trans.payments[req.paymentIndex];

    if(typeof req.body.payment.amount !== 'undefined'){
        payment.amount = req.body.payment.amount;
    }

    if(typeof req.body.payment.debt !== 'undefined'){
        payment.debt = req.body.payment.debt;
    }

    trans.save().then(function(trans){
        return res.json({transaction: trans.toJSON()})
    }).catch(next)

});
router.delete('DEPRICATED/:group/transactions/:transaction/payments/:payment',auth, permit, function(req, res, next){


    var trans = req.group.transactions[req.transactionIndex];
    trans.payments.splice(req.paymentIndex, 1);

    trans.save().then(function(trans){
        return res.json({transaction: trans.toJSON()})
    }).catch(next)


});
////////////////////////////////////////////////////////////////



module.exports = router;
