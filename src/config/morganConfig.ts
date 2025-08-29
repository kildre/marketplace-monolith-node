import { Application } from "express";
import morgan, { StreamOptions } from "morgan";
import { isProd } from "src/service/expressProfileService";
import log from "src/service/loggingService";


const getMorganFormat = () => {
    if (isProd()) {
        return 'combined';
    } else {
        return 'dev';
    }
};

const configureMorgan = (app: Application) => {
    log.info('Configuring morgan ...');

    const stream : StreamOptions = {
        write: (msg: string) => log.http(msg.trim()),
    };

    const skip = (req: any, res: any) => false;

    app.use(
        morgan(
            getMorganFormat(), 
            { stream, skip }
        )
    );

};

export default configureMorgan;