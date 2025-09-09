import { Client } from 'pg';
import { getCert } from "./securityService";
import { rdbmsDatabase, rdbmsHost, rdbmsPassword, rdbmsPort, rdbmsUser } from 'src/config/services/rdbmsConfigService';


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
            user: rdbmsUser,
            password: rdbmsPassword,
            host: rdbmsHost,
            port: rdbmsPort,
            database: rdbmsDatabase,
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
