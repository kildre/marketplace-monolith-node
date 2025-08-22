const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
import { Application } from "express";
import { SwaggerOptions } from 'swagger-jsdoc';

const configureSwagger = (app: Application) => {
    const options: SwaggerOptions = {
        definition: {
            openapi: '3.1.0',
            info: {
                title: 'Advana Marketplace Monolith',
                version: '1.0.0',
                description: 'API documentation for the Advana Marketplace Monolith.',
            },
        },
        apis: ['./src/routes/*.ts'], // Path to your route files
    };

    app.use('/swagger-ui', swaggerUi.serve, swaggerUi.setup(swaggerJsDoc(options)));
};

export default configureSwagger;
