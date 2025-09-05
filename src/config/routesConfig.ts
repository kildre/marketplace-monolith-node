import { Application } from "express";
import rootRoutes from '../routes/rootRoutes';
import productMockRoutes from '../routes/productRoutes.mock';

const configureRoutes = (app: Application) => {
    app.use('', rootRoutes);
    app.use('/api', productMockRoutes);
};

export default configureRoutes;
