import express, { Application } from "express";
import rootRoutes from '../web/routes/rootRoutes';
import userRoutes from '../web/routes/userRoutes';
import requestRoutes from '../web/routes/requestRoutes';
import reportRoutes from '../web/routes/reportRoutes';
import decisionRoutes from '../web/routes/decisionRoutes';

const configureRoutes = (app: Application) => {
    console.log("Configuring routes...");
    app.use(express.json());
    app.use('', rootRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/requests', requestRoutes);
    app.use('/api/decisions', decisionRoutes);
    app.use('/api/report', reportRoutes);    

    if ((app as any)._router?.stack) {
    const routes = (app as any)._router.stack
        .filter((l: any) => l.route)
        .map((l: any) => `${Object.keys(l.route.methods).join(',').toUpperCase()} ${l.route.path}`);
    console.log('Mounted routes:\n', routes.join('\n '));
    }    
};

export default configureRoutes;
