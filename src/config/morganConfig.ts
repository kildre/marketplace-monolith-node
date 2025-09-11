import { Application,  Request, Response } from "express";
import morgan, { StreamOptions } from "morgan";
import nodeEnvService from "./services/nodeEnvService";
import log from "../service/loggingService";


const getMorganFormat = () => {
    if (nodeEnvService.isProd()) {
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

    //const skip = (req: any, res: any) => false;
    const skip: morgan.Options<Request, Response>['skip'] = (_req, _res) => false;

    app.use(
        morgan(
            getMorganFormat(), 
            { stream, skip }
        )
    );

};

export default configureMorgan;