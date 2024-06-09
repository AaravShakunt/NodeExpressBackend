const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const corsOptions = require('./config/corsOptions');
const { logger } = require('./middleware/logEvents');
const errorHandler = require('./middleware/errorHandler');
const verifyJWT = require('./middleware/verifyJWT');
const credentials = require('./middleware/credentials');
const cookieParser = require('cookie-parser');
const dbConnection = require('./config/db');
const PORT = process.env.PORT || 3500;

// custom middleware logger
app.use(logger);

dbConnection.connectDB()

// app.use(credentials);

// // Cross Origin Resource Sharing
// app.use(cors(corsOptions));

// built-in middleware to handle urlencoded form data
app.use(express.urlencoded({ extended: false }));

// built-in middleware for json 
app.use(express.json());

// middleware for cookies
app.use(cookieParser());

//serve static files
app.use('/', express.static(path.join(__dirname, '/public')));




// routes
app.use('/', require('./routes/root'));
app.use('/register', require('./routes/register'));

app.use('/auth', require('./routes/auth'));
app.use('/refresh', require('./routes/refresh'));
app.use('/logout', require('./routes/logout'))

app.use('/anomaly', require('./routes/api/anomaly'));
app.use('/riskreference', require('./routes/api/riskReference'));


app.use(verifyJWT); // everything after this will use the JWT auth
app.use('/employees', require('./routes/api/employees'));


app.all('*', (req, res) => {
    res.status(404);
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'views', '404.html'));
    } else if (req.accepts('json')) {
        res.json({ "error": "404 Not Found" });
    } else {
        res.type('txt').send("404 Not Found");
    }
});

app.use(errorHandler);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
