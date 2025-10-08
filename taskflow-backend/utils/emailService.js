// utils/emailService.js
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  async sendEmail(options) {
    const message = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      html: options.html
    };

    await this.transporter.sendMail(message);
  }

  async sendTaskAssignmentEmail(user, task, assignedBy) {
    const html = `
      <h1>New Task Assigned</h1>
      <p>Hi ${user.name},</p>
      <p>${assignedBy.name} has assigned you a new task:</p>
      <h2>${task.title}</h2>
      <p>${task.description || 'No description provided'}</p>
      <p>Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</p>
      <p>Priority: ${task.priority}</p>
      <a href="${process.env.CLIENT_URL}/tasks/${task._id}">View Task</a>
    `;

    await this.sendEmail({
      email: user.email,
      subject: `New Task: ${task.title}`,
      html
    });
  }

  async sendProjectInviteEmail(user, project, invitedBy) {
    const html = `
      <h1>Project Invitation</h1>
      <p>Hi ${user.name},</p>
      <p>${invitedBy.name} has invited you to join the project:</p>
      <h2>${project.name}</h2>
      <p>${project.description}</p>
      <a href="${process.env.CLIENT_URL}/projects/${project._id}">View Project</a>
    `;

    await this.sendEmail({
      email: user.email,
      subject: `Project Invitation: ${project.name}`,
      html
    });
  }

  async sendDueDateReminderEmail(user, task) {
    const html = `
      <h1>Task Due Soon</h1>
      <p>Hi ${user.name},</p>
      <p>Your task is due soon:</p>
      <h2>${task.title}</h2>
      <p>Due Date: ${new Date(task.dueDate).toLocaleDateString()}</p>
      <p>Status: ${task.status}</p>
      <a href="${process.env.CLIENT_URL}/tasks/${task._id}">View Task</a>
    `;

    await this.sendEmail({
      email: user.email,
      subject: `Task Due Soon: ${task.title}`,
      html
    });
  }
}

module.exports = new EmailService();

