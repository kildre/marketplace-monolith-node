import { Client } from 'pg';
import { getCert } from "./securityService";


const getPgClient = () => {
    const PG_SSL_REQUIRE = process.env.PG_SSL_REQUIRE !== 'false';

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

    return new Client({
            user: process.env.PG_USER,
            password: process.env.PG_PASSWORD,
            host: process.env.PG_HOST,
            port: process.env.PG_PORT,
            database: process.env.PG_DATABASE,
            ...sslConfig,
        });
};

export const runPgQueryWithVars = async (query : String, vars: Array<String>) => {
        const client = getPgClient();

        await client.connect();
        const res = await client.query(query, vars);
        await client.end();

        return res;
};

export const runPgQuery = async (query : String) => {
        return runPgQueryWithVars(query, []);
};
