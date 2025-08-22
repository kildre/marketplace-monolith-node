import express from 'express';
import path from 'path';
import { Application } from "express";
import configureActuator from "./actuatorConfig";
import configureRoutes from "./routesConfig";
import configureSwagger from "./swaggerConfig";

const configureApp = (app: Application) => {
    const port = 8082;

    app.use(express.static(path.join(__dirname, 'public')));


    app.listen(port, () => {
        console.log(`App listening at http://localhost:${port}`)
    });

    configureRoutes(app);
    configureActuator(app);
    configureSwagger(app);
};

export default configureApp;