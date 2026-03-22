import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendRecordingEmail = async (to: string, links: string) => {
  console.log("userEmail", to);

  await transporter.sendMail({
    from: `"Recio" <${process.env.SMTP_USER}>`,
    to,
    subject: "Your session recordings are ready 🎉",
    html: `
      <h2>Your recordings are ready</h2>
      <p>You can access your session recordings below:</p>
      ${links}
      <br/>
      <p>Thanks for using our platform!</p>
    `,
  });
  console.log("Email sent bro");
};