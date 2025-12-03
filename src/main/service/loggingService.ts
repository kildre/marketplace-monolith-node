import winston from "winston";
import DailyRotateFile from 'winston-daily-rotate-file';
import nodeEnvService from './config/nodeEnvService'

const getLogLevel = () => {
    if (nodeEnvService.isDev()) {
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
    const transports: winston.transport[] = [];
    const exceptionHandlers: winston.transport[] = [];
    const rejectionHandlers: winston.transport[] = [];

    // Console transport - ALWAYS enabled for Kubernetes log aggregation
    const consoleTransport = new winston.transports.Console({
        format: nodeEnvService.isProd()
            ? winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
                winston.format.json()
              )
            : winston.format.cli()
    });
    transports.push(consoleTransport);
    exceptionHandlers.push(consoleTransport);
    rejectionHandlers.push(consoleTransport);

    // File transport - only for non-production (local development backup)
    if (!nodeEnvService.isProd()) {
        const rotatingTransport = new DailyRotateFile({
            filename: 'logs/app-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '3g',
            maxFiles: '30d',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.json()
            ),
        });
        transports.push(rotatingTransport);
        exceptionHandlers.push(rotatingTransport);
        rejectionHandlers.push(rotatingTransport);
    }

    const logger = winston.createLogger({
        level: getLogLevel(),
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