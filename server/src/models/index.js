const sequelize = require('../config/db');
const User = require('./User');
const Journal = require('./Journal');
const Appointment = require('./Appointment');
const Message = require('./Message');
const Post = require('./Post');
const Comment = require('./Comment');
const PostLike = require('./PostLike');
const Resource = require('./Resource');
const Goal = require('./Goal');
const GoalMilestone = require('./GoalMilestone');
const GroupSession = require('./GroupSession');
const GroupSessionMember = require('./GroupSessionMember');
const SupportPerson = require('./SupportPerson');

// User self-referential association (Client -> Counselor)
User.belongsTo(User, { as: 'Counselor', foreignKey: 'assignedCounselorId' });
User.hasMany(User, { as: 'Clients', foreignKey: 'assignedCounselorId' });

// User <-> Journal associations
User.hasMany(Journal, { foreignKey: 'userId', as: 'journals' });
Journal.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> Appointment associations
User.hasMany(Appointment, { foreignKey: 'clientId', as: 'clientAppointments' });
User.hasMany(Appointment, { foreignKey: 'counselorId', as: 'counselorAppointments' });
Appointment.belongsTo(User, { as: 'Client', foreignKey: 'clientId' });
Appointment.belongsTo(User, { as: 'Counselor', foreignKey: 'counselorId' });

// User <-> Message associations
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
User.hasMany(Message, { foreignKey: 'receiverId', as: 'receivedMessages' });
Message.belongsTo(User, { as: 'Sender', foreignKey: 'senderId' });
Message.belongsTo(User, { as: 'Receiver', foreignKey: 'receiverId' });

// Community Feed associations
User.hasMany(Post, { foreignKey: 'userId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'userId', as: 'author' });

Post.hasMany(Comment, { foreignKey: 'postId', as: 'comments' });
Comment.belongsTo(Post, { foreignKey: 'postId', as: 'post' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'author' });

Post.hasMany(PostLike, { foreignKey: 'postId', as: 'likes' });
PostLike.belongsTo(Post, { foreignKey: 'postId' });
PostLike.belongsTo(User, { foreignKey: 'userId' });

// Resource Library associations
User.hasMany(Resource, { foreignKey: 'publishedBy', as: 'resources' });
Resource.belongsTo(User, { foreignKey: 'publishedBy', as: 'publisher' });

// Goal & Milestone associations
User.hasMany(Goal, { foreignKey: 'userId', as: 'goals' });
Goal.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Goal.hasMany(GoalMilestone, { foreignKey: 'goalId', as: 'milestones', onDelete: 'CASCADE' });
GoalMilestone.belongsTo(Goal, { foreignKey: 'goalId', as: 'goal' });

// Group Session associations
User.hasMany(GroupSession, { foreignKey: 'createdBy', as: 'hostedSessions' });
GroupSession.belongsTo(User, { foreignKey: 'createdBy', as: 'host' });
GroupSession.hasMany(GroupSessionMember, { foreignKey: 'groupSessionId', as: 'members', onDelete: 'CASCADE' });
GroupSessionMember.belongsTo(GroupSession, { foreignKey: 'groupSessionId', as: 'session' });
GroupSessionMember.belongsTo(User, { foreignKey: 'userId', as: 'member' });

// Support Person (Family) associations
User.hasMany(SupportPerson, { foreignKey: 'clientId', as: 'supportNetwork' });
SupportPerson.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
SupportPerson.belongsTo(User, { foreignKey: 'userId', as: 'supporter', constraints: false });

const db = {
  sequelize,
  Sequelize: require('sequelize'),
  User,
  Journal,
  Appointment,
  Message,
  Post,
  Comment,
  PostLike,
  Resource,
  Goal,
  GoalMilestone,
  GroupSession,
  GroupSessionMember,
  SupportPerson
};

module.exports = db;
