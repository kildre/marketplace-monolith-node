import { Sequelize } from 'sequelize';

export interface AssocCapable {
  associate?: (sequelize: Sequelize) => void;
}

export type AssocModel<T = unknown> = T & AssocCapable;