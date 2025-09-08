import { Application } from "express";
import rootRoutes from '../web/routes/rootRoutes';

const configureRoutes = (app: Application) => {
    app.use('', rootRoutes);
};

export default configureRoutes;
