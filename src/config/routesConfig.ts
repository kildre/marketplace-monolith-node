import { Application } from "express";
import rootRoutes from '../web/routes/rootRoutes';
import userRoutes from '../web/routes/userRoutes';

const configureRoutes = (app: Application) => {
    app.use('', rootRoutes);
    app.use('/api/users', userRoutes);
};

export default configureRoutes;
