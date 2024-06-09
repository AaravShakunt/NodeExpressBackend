const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'testDB'
});

const connectDB = () => {
    connection.connect((err) => {
        if (err) {
            console.error('Error connecting to MySQL database:', err);
            return;
        }
        console.log('Connected to MySQL database');
    });
};

const queryDatabase = (query, params = []) => {
    return new Promise((resolve, reject) => {
        connection.query(query, params, (error, results, fields) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(results);
        });
    });
};

const closeDB = () => {
    connection.end((err) => {
        if (err) {
            console.error('Error closing MySQL connection:', err);
            return;
        }
        console.log('MySQL connection closed');
    });
};

module.exports = { connectDB, queryDatabase, closeDB };
