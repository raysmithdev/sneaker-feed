const {BasicStrategy} = require('passport-http');
const express = require('express');
const jsonParser = require('body-parser').json();
const passport = require('passport');

const {User} = require('./model');

const router = express.Router();

router.use(jsonParser);

const basicStrategy = new BasicStrategy((username, password, callback) => {
  let user;
  User
    .findOne({username: username})
    .exec()
    .then(_user => {
      user = _user;
      if(!user) {
        return callback(null, false);
      }
      return user.validatePassword(password);
    })
    .then(isValid => {
      if(!isValid) {
        return callback(null, false);
      }
      else {
        return callback(null, user);
      }
    })
    .catch(err => callback(err));
});

passport.use(basicStrategy);
router.use(passport.initialize());

router.post('/', (req, res) => {
  if(!req.body) {
    return res.status(400).json({message: 'No request body'});
  }


  if(!('username' in req.body)) {
    return res.status(422).json({message: 'Missing field: username'});
  }

  let {username, password, firstName, lastName} = req.body;

  if(typeof username !== 'string') {
    return res.status(422).json({message: 'Incorrect field type: username'});
  }

  username = username.trim();

  if(username === '') {
    return res.status(422).json({message: 'Incorrect field length: username'});
  }

  if(!(password)) {
    return res.status(422).json({message: 'Missing field: password'});
  }

  if (typeof password !== 'string') {
    return res.status(422).json({message: 'Incorrect field type: password'});
  }

  password = password.trim();

  if(password === '') {
    return res.status(422).json({message: 'Incorrect field length: password'});
  }

  //check for existing user
  return User
    .find({username})
    .count()
    .exec()
    .then(count => {
      if (count > 0) {
        return res.status(422).json({message: 'username already taken'});
      }
      // if user does not existing
      return User.hashPassword(password);
    })
    .then(hash => {
      return User.create({
        username: username,
        password: hash,
        firstName: firstName,
        lastName: lastName
      })
    })
    .then(user => {
      return res.status(201).json(user.apiRepr());
    })
    .catch(err => {
      res.status(500).json({message: 'Internal server error'});
    });

});


router.get('/', (req, res) => {
  return User
    .find()
    .exec()
    .then(users => res.json(users.map(user => user.apiRepr())))
    .catch(err => console.log(err) && res.status(500).json({message: 'Internal server error'}));
});

router.get('/me', passport.authenticate('basic', {session: false}),(req, res) => res.json({user: req.user.apiRepr()}));

router.put('/favorites', passport.authenticate('basic', {session: false}), (req, res) => {
  const requiredFields = ['username', 'id'];
  for(let i=0; i<requiredFields.length; i++) {
    const field = requiredFields[i];
    if(!(field in req.body)) {
      const message = `Missing \`${field}\` in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  }
  let {username,id} = req.body;
  //console.log
  let user;
  User
    .findOneAndUpdate({username: username}, {$push: {favorites: id}}, {new: true})
    .exec()
    .then(_user => {
      user = _user;
      console.log(req.body);
      res.status(201).json(user.apiRepr());
    })
    .catch(err => res.status(500).json({message: 'Something went wrong'}));
});

module.exports = {router};
