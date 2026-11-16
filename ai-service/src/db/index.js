import "dotenv/config";

import mysql from "mysql2/promise";

import { drizzle } from "drizzle-orm/mysql2";


const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0,
});


export const db = drizzle(pool);