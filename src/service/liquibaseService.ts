import { LiquibaseConfig, Liquibase } from 'liquibase';

const options: LiquibaseConfig = {
    changeLogFile: './src/resources/rdbms/changelog.yml',
    url: 'jdbc:postgresql://' + process.env.PG_HOST + ':' + process.env.PG_PORT + '/' + process.env.PG_DATABASE,
    username: process.env.PG_USER || '',
    password: process.env.PG_PASSWORD || '',
};

const lbClient = new Liquibase(options);

export async function lbUpdate() {
    await lbClient.update({});
}
