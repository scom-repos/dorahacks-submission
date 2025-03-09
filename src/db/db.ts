import { Sequelize, DataTypes } from "sequelize";

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite",
  logging: false
});

export const Message = sequelize.define("Message", {
  chat_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM("user", "ai", "system"),
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM("message", "file"),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

export const Chat = sequelize.define("Chat", {
  chat_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  system_prompt: {
    type: DataTypes.TEXT
  },
});

export const setupDb = async () => {
  await sequelize.authenticate();
  await sequelize.sync();
};