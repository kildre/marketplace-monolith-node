import express, { Application } from "express";
import rootRoutes from '../web/routes/rootRoutes';
import userRoutes from '../web/routes/userRoutes';
import requestRoutes from '../web/routes/requestRoutes';

const configureRoutes = (app: Application) => {
    console.log("Configuring routes...");
    app.use(express.json());
    app.use('', rootRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/requests', requestRoutes);

    if ((app as any)._router?.stack) {
    const routes = (app as any)._router.stack
        .filter((l: any) => l.route)
        .map((l: any) => `${Object.keys(l.route.methods).join(',').toUpperCase()} ${l.route.path}`);
    console.log('Mounted routes:\n', routes.join('\n '));
    }    
};

export default configureRoutes;
