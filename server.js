 /*
CSC3916 HW2
File: Server.js
Description: Web API scaffolding for Movie API
 */
console.log(process.env.JWT_SECRET_KEY);
require('dotenv').config(); // Loads environment variables
const express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
const passport = require('passport');
const authController = require('./auth');
const authJwtController = require('./auth_jwt');
const db = require('./db')(); 
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

const router = express.Router();

function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: req.headers,
        query: req.query,
        key: process.env.UNIQUE_KEY,
        body: req.body || "No body"
    };
    return json;
}

// GET movies - no authentication required
router.route('/movies')
    .get((req, res) => {
        const movies = db.find();
        console.log("Movies retrieved:", movies);
        var response = getJSONObjectForMovieRequirement(req);
        response.status = 200;
        response.message = "GET movies";
        response.movies = movies;
        res.status(200).json(response);
    })
    // POST movie - movie creation
    .post((req, res) => {
        const movie = req.body;
        console.log("Saving movie:", movie); // Logs movie to console
        db.save(null, movie); // Saves movie to DB
        var response = getJSONObjectForMovieRequirement(req);
        response.status = 200;
        response.message = "Movie saved";
        res.status(200).json(response);
    })
    // PUT - Update movie with authentication
    .put(authJwtController.isAuthenticated, (req, res) => {
        const updatedMovie = req.body;
        const movieId = req.query.id;
        const movie = db.find(movieId);

        if (!movie) {
            return res.status(404).send({ success: false, msg: 'Movie not found' });
        }

        // Updates movie
        db.update(movieId, updatedMovie);

        var response = getJSONObjectForMovieRequirement(req);
        response.status = 200;
        response.message = "Movie updated successfully";
        res.status(200).json(response);
    })
    // DELETE - Delete movie with authentication
    .delete(authController.isAuthenticated, (req, res) => {
        const movieId = req.query.id;
        const movie = db.find(movieId);

        if (!movie) {
            return res.status(404).send({ success: false, msg: 'Movie not found.' });
        }

        // Deletes movie
        db.remove(movieId);

        var response = getJSONObjectForMovieRequirement(req);
        response.status = 200;
        response.message = "Movie was deleted successfully";
        res.status(200).json(response);
    })
    // PATCH - Partial update to a movie
    .patch(authJwtController.isAuthenticated, (req, res) => {
        const movieId = req.query.id;
        const movie = db.find(movieId);

        if (!movie) {
            return res.status(404).send({ success: false, msg: 'Movie not found' });
        }

        // Only update fields that are in the request body
        const updatedFields = req.body;
        Object.assign(movie, updatedFields);

        db.update(movieId, movie);

        var response = getJSONObjectForMovieRequirement(req);
        response.status = 200;
        response.message = "Movie patched successfully";
        res.status(200).json(response);
    });

    // For any unsupported HTTP methods
    .all((req, res) => {
        res.status(405).send({ message: 'HTTP method not supported' });
    });

// Signup route for user registration
router.post('/signup', (req, res) => {
    if (!req.body.username || !req.body.password) {
        return res.json({success: false, msg: 'Please include both username and password to signup.'});
    } else {
        var newUser = {
            username: req.body.username,
            password: req.body.password
        };

        db.save(newUser);  // Save the user in the DB
        return res.json({ success: true, msg: 'Successfully created a new user.' });
    }
});

// Signin route - Returns JWT token after successful login
router.post('/signin', (req, res) => {
    var user = db.findOne(req.body.username);

    if (!user) {
        return res.status(401).send({ success: false, msg: 'Authentication failed. User not found.' });
    } else {
        if (req.body.password == user.password) {
            var userToken = { id: user.id, username: user.username };
            var token = jwt.sign(userToken, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });  // Generates the JWT token
            return res.json({ success: true, token: 'JWT ' + token });
        } else {
            return res.status(401).send({ success: false, msg: 'Authentication failed. Incorrect password.' });
        }
    }
});

// Handle unsupported HTTP methods on /testcollection route
router.route('/testcollection')
    .delete(authController.isAuthenticated, (req, res) => {
        var response = getJSONObjectForMovieRequirement(req);
        response.status = 200;
        response.message = "Movie deleted successfully";
        res.status(200).json(response);
    })
    .put(authJwtController.isAuthenticated, (req, res) => {
        var response = getJSONObjectForMovieRequirement(req);
        response.status = 200;
        response.message = "Movie updated successfully";
        res.status(200).json(response);
    })
    .all((req, res) => {
        res.status(405).send({ message: 'HTTP method not supported' });
    });

// Start the server
app.use('/', router);
app.listen(process.env.PORT || 8080, () => {
    console.log('Server is running on port ' + (process.env.PORT || 8080));
});

module.exports = app;  // For testing only
