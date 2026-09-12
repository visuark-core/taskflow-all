const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Notification = sequelize.define("Notification", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM(
        "task_assigned",
        "task_due",
        "mention",
        "project_invite",
        "deadline_approaching",
        "task_completed",
        "comment_reply"
      ),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    link: {
      type: DataTypes.STRING,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  });

  Notification.prototype.markAsRead = function () {
    this.isRead = true;
    return this.save();
  };

  return Notification;
};