const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'viewer'),
    defaultValue: 'viewer'
  }
}, {
  tableName: 'users',
  timestamps: true
});

const Travel = sequelize.define('Travel', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  startLocation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  endLocation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  transportMethod: {
    type: DataTypes.ENUM('火车', '飞机', '自驾', '客车', '步行游览', '住宿'),
    allowNull: true
  },
  totalCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  coverImage: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'travels',
  timestamps: true
});

const Itinerary = sequelize.define('Itinerary', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  travelId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'travels',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  travelDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  sequence: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  images: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  transportMethod: {
    type: DataTypes.ENUM('火车', '飞机', '自驾', '客车', '步行游览', '自行游览', '住宿'),
    allowNull: false
  },
  travelMethodInfo: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
  flightNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  trainNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  busNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  startLocation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  endLocation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: true
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: true
  }
}, {
  tableName: 'itineraries',
  timestamps: true
});

Travel.hasMany(Itinerary, { foreignKey: 'travelId', onDelete: 'CASCADE' });
Itinerary.belongsTo(Travel, { foreignKey: 'travelId' });

const Setting = sequelize.define('Setting', {
  key: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'settings',
  timestamps: false,
});

module.exports = { sequelize, User, Travel, Itinerary, Setting };