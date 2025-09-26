const actuator = require('express-actuator');
import { Application } from "express";
import { Options } from "express-actuator";

const configureActuator = (app: Application) => {
    const options: Options = {
        basePath: '/actuator',
        infoGitMode: 'simple'
    };

    app.use(actuator(options));

}

export default configureActuator;