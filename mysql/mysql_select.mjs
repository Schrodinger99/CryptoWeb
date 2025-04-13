// File: mysql_select.mjs

// Import module to handle MySQL database operations with promises
import mysql from 'mysql2/promise';

// An async function to perform a SELECT operation on the database
async function main() {
    try {
    // Create a connection to the database
    const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: 'CryptoGame'
    });

    console.log('Connected to the database');

    // The SQL query to execute: list distinct usernames and roles
    const sqlQuery = 'SELECT DISTINCT nombre_usuario AS username, rol FROM Jugadores ORDER BY nombre_usuario';

    // Execute the query
    const [rows] = await connection.execute(sqlQuery);

    console.log('Query execution succeeded\n');

    // Loop through the result and log each user
    for (const row of rows) {
        console.log(`User: ${row.username}, Role: ${row.rol}`);
    }

    // Close the database connection
    await connection.end();
    } catch (err) {
    // If an error occurs, log it
    console.error('Database error:', err.message);
    process.exit(1);
    }
}

// Run the main function
main();