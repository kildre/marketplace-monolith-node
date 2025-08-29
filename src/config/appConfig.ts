import express from 'express';
import path from 'path';
import { Application } from "express";
import configureActuator from "./actuatorConfig";
import configureRoutes from "./routesConfig";
import configureSwagger from "./swaggerConfig";
import configureMorgan from './morganConfig';

const configureApp = (app: Application) => {
    const port = 8082;

    configureMorgan(app); // Must come before any routes are configured

    app.use(express.static(path.join(__dirname, 'public')));

    configureRoutes(app);
    configureActuator(app);
    configureSwagger(app);

    app.listen(port, () => {
        console.log(`App listening at http://localhost:${port}`)
    });

};

export default configureApp;
