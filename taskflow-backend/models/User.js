const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM(
        "user",
        "admin",
        "chief_manager",
        "department_manager",
        "developer",
        "designer",
        "tester",
        "ceo",
        "cfo",
        "cto",
        "cmo",
        "coo"
      ),
      defaultValue: "user",
    },
    company: {
      type: DataTypes.STRING,
    },
    department: {
      type: DataTypes.STRING,
      defaultValue: "engineering",
    },
    avatar: {
      type: DataTypes.STRING,
    },
    preferences: {
      type: DataTypes.JSON,
      defaultValue: {
        theme: "light",
        notifications: { email: true, push: true },
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
    },
    bio: {
      type: DataTypes.TEXT,
    },
    bankDetails: {
      type: DataTypes.JSON,
      defaultValue: null,
    },
  },
  {
    hooks: {
      beforeSave: async (user) => {
        if (user.changed("password")) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);

// Instance methods
User.prototype.getSignedJwtToken = function () {
  return jwt.sign({ id: this.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

User.prototype.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Override toJSON to exclude password by default unless specifically needed?
// Wait, we'll handle this in the controller like before if it's returning the whole model.
// But doing it here is safer:
User.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = User;
