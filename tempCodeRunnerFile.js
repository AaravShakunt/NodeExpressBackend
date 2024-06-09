// Filename: connectToLocalDB.js

const sql = require('mssql/msnodesqlv8'); // Use msnodesqlv8 driver

// Define the connection configuration
const config = {
    server: 'localhost', // Use 'localhost' for local SQL Server
    options: {
        // Specify the named pipe directly in the pipeName
        pipeName: '\\\\.\\pipe\\LOCALDB#8F702356\\tsql\\query', // Adjust for your named pipe
        trustedConnection: true, // Use Windows authentication
        enableArithAbort: true, // Recommended for older versions of SQL Server
        encrypt: false // Disable encryption for local connections
    },
    database: 'testDB', // Specify your database name
    driver: 'msnodesqlv8', // Specify the driver as msnodesqlv8
    pool: {
        // Optional pool parameters
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Function to connect and execute a query
async function connectAndQuery() {
    try {
        // Connect to the database
        let pool = await sql.connect(config);
        console.log('Connection successful!');

        // Execute a simple query
        let result = await pool.request()
            .query('SELECT name FROM sys.databases');

        // Display the results
        console.log('Databases in the server:');
        result.recordset.forEach(row => {
            console.log(row.name);
        });

        // Close the connection pool
        await pool.close();
    } catch (err) {
        console.error('Connection failed:', err);
    }
}

// Run the function
connectAndQuery();
