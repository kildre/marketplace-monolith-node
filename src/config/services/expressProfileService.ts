
export const isDev = () => {
    return process.env.EXPRESS_PROFILE === "dev";
};

export const isProd = () => {
    return process.env.EXPRESS_PROFILE === "prod";
};

const getAppHost = () => {
    return '0.0.0.0';
};

export const appHost = getAppHost();

const getAppPort = () => {
    return 8082;
};

export const appPort = getAppPort();
