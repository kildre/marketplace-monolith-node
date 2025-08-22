import express from 'express';
import 'dotenv/config';
import redisClient from '@advana/redis-client';
import configureApp from './config/appConfig';
import { runPgQuery, runPgQueryWithVars } from './service/pgService';

const run = (): void => {
    const app = express();

    configureApp(app);

    async function connectPg() {
        const res1 = await runPgQueryWithVars('SELECT $1::text as message', ['Hello world from Postgres!']);
        console.log(res1.rows[0].message); // Hello world!
        const res2 = await runPgQuery("SELECT 'Testing a PG query without vars!'::text as message");
        console.log(res2.rows[0].message);
    }

    async function connectRedis() {
        const client = await redisClient();
        await client.set('key', 'Hello world from Redis!');
        const value = await client.get('key');
        console.log(value);
    }

    connectPg();
    connectRedis();
};

export default run;