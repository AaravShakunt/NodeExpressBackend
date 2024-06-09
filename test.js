const mysql = require('mysql');

// Create a MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'testDB'
});

// Connect to the database
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL database:', err);
        return;
    }
    console.log('Connected to MySQL database');
    
    // Perform a query
    connection.query('SELECT * FROM users', (error, results, fields) => {
        if (error) {
            console.error('Error querying database:', error);
            return;
        }
        console.log('Query results:', results);
    });

    // Close the connection
    connection.end((err) => {
        if (err) {
            console.error('Error closing MySQL connection:', err);
            return;
        }
        console.log('MySQL connection closed');
    });
});
