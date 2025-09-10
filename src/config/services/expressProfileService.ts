
export const isDev = () => {
    return process.env.EXPRESS_PROFILE === "dev";
};

export const isProd = () => {
    return process.env.EXPRESS_PROFILE === "prod";
};
