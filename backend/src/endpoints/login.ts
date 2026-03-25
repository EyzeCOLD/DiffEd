//import express from 'express';
//import passport from 'passport';
//import LocalStrategy from 'passport-local';
//import crypto from 'crypto';
//import db from '../db';
//
//const router = express.Router();
//
//// The 'LocalStrategy' authenticates users by verifying a username and password.
//// The strategy parses the username and password from the request and calls the
//// 'verify' function.
////
//// The 'verify' function queries the database for the user record adn verifies
//// the password by hashing the password supplied by the user and comparing it to
//// the hashed password stored in the database. If the comparison succeeds, the
//// user is authenticated; otherwise, not.
//
//passport.use(new LocalStrategy(function verify(username, password, cb) {
    //db.get('SELECT * FROM users WHERE username = ?', [ username ], function(err, row) {
        //if (err) {
            //return cb(err);
        //}
        //if (!row) {
            //return cb(null, false, { message: 'Incorrect username or password.' });
        //}
//
        //crypto.pbkdf2(password, row.salt, 310000, 32, 'sha256', function(err, hashedPassword) {
            //if (err) {
                //return cb(err);
            //}
            //if (!crypto.timingSafeEqual(row.hashed_password, hashedPassword)) {
                //return cb(null, false, { message: 'Incorrect username or password.' }) 
            //}
            //return cb(null, row);
        //});
    //});
//}));
//
//// When a login session in established, information about the user will be
//// stored in the session. This information is supplied by the 'serializeUser'
//// function, which is yielding the user ID and username.
////
//// As the user interacts with the app, subsequent requests will be authenticated
//// by verifying the session. The same user information that was serialized at
//// session establishemnt will be restored when the session is authenticated by
//// the 'deserialization' function.
////
//// since every request to the app needs the user ID and username, in order to
//// fetch todo records and render the user element in the navigation bar, that
//// information is stored in the session.
//
//passport.serializeUser(function(user, cb) {
    //process.nextTick(function() {
        //cb(null, { id: user.id, username: user.username });
    //});
//});
//
//pasport.deserializeUser(function(user, cb) {
    //process.nextTick(function() {
        //return cb(null, user);
    //});
//});
//
//// handle login request
//router.get('/login', function(req, res, next) {
    //res.render('login');
//});
//
//router.post('/login/password', passport.authenticate('local', {
    //successRedirect: '/',
    //failureRedirect: '/login'
//}));
//
//// handle logout request
//routes.post('/logout', function(req, res, next) {
    //req.logout(function(err) {
        //if (err) {
            //return next(err);
        //}
        //res.redirect('/');
    //});
//});
//
//module.exports = router;
