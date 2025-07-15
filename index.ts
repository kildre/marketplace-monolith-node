import express from 'express';
import path from 'path';
import { Client } from 'pg';
import * as process from "node:process";
import 'dotenv/config';
import redisClient from '@advana/redis-client';
import fs from "fs";

const PG_SSL_REQUIRE = process.env.PG_SSL_REQUIRE !== 'false';

const app = express();
const port = 8080;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`)
});

const getCert = (certName: string, certFilePath: string) => {
    if (process.env[certName]) {
        return process.env[certName]?.replace(/\\n/g, '\n');
    } else if (process.env[certFilePath]) {
        return fs.readFileSync(process.env[certFilePath], 'ascii');
    } else {
        return '';
    }
};

const sslConfig = {
    ...(PG_SSL_REQUIRE ?
            {
                ssl: {
                    ca: getCert("TLS_CERT_CA", "TLS_CERT_CA_FILEPATH")
                }
            }
            : {}
    )
}

async function connectPg() {
    const client = new Client({
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        host: process.env.PG_HOST,
        port: process.env.PG_PORT,
        database: process.env.PG_DATABASE,
        ...sslConfig,
    });
    await client.connect();

    const res = await client.query('SELECT $1::text as message', ['Hello world from Postgres!'])
    console.log(res.rows[0].message) // Hello world!
    await client.end()
}

async function connectRedis() {
    const client = await redisClient();
    await client.set('key', 'Hello world from Redis!')
    const value = await client.get('key');
    console.log(value);
}

connectPg();
connectRedis();
