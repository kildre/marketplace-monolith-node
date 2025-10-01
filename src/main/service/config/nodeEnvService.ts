
interface NodeEnvServiceI {
    isDev: () => boolean;
    isProd: () => boolean;
}

const isDev = (): boolean => {
    return process.env.EXPRESS_PROFILE === "dev";
};

const isProd = (): boolean => {
    return process.env.EXPRESS_PROFILE === "prod";
};

const nodeEnvService: NodeEnvServiceI = {
    isDev: isDev,
    isProd: isProd
}

export default nodeEnvService;
