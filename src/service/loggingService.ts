import winston from "winston";
import DailyRotateFile from 'winston-daily-rotate-file';
import { isDev, isProd } from './expressProfileService'

const getLogLevel = () => {
    if (isDev()) {
        return 'silly';
    } else {
        return 'http';
    }
}

type ImmutableLogger = Readonly<{
    error: (msg: string) => void;
    warn: (msg: string) => void;
    info: (msg: string) => void;
    http: (msg: string) => void;
    verbose: (msg: string) => void,
    debug: (msg: string) => void;
    silly: (msg: string) => void,
}>;

const createLogger = () => {

    const rotatingTransport = new DailyRotateFile({
        filename: 'logs/app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '3g',
        maxFiles: '30d', // Retain logs for 14 days,
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.json()
        ),
    });

    const transports = [ rotatingTransport ] as any[];
    const exceptionHandlers = [ rotatingTransport ] as any[];
    const rejectionHandlers = [ rotatingTransport ] as any[];


    if (!isProd()) {
        const consoleTransport = new winston.transports.Console({
            format: winston.format.cli()
        });
        transports.push(consoleTransport);
        exceptionHandlers.push(consoleTransport);
        rejectionHandlers.push(consoleTransport);
    }

    const logger = winston.createLogger({
        level: getLogLevel(), // Minimum log level
        transports: transports,
        exceptionHandlers: exceptionHandlers,
        rejectionHandlers: rejectionHandlers,
    });

    return logger;
}

const logger = createLogger();
const log: ImmutableLogger = {
    error: msg => logger.error(msg),
    warn: msg => logger.warn(msg),
    info: msg => logger.info(msg),
    http: msg => logger.http(msg),
    verbose: msg => logger.verbose(msg),
    debug: msg => logger.debug(msg),
    silly: msg => logger.silly(msg),
};

export default log;