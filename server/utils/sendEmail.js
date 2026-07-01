import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, html }) => {
  let transporter;

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_USER !== "your_email") {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  const mailOptions = {
    from: `"CodeMemory Support" <no-reply@codememory.com>`,
    to,
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === "your_email") {
    console.log(`[CodeMemory Email Simulator] Sent to: ${to}`);
    console.log(`[CodeMemory Email Simulator] Subject: ${subject}`);
    console.log(`[CodeMemory Email Simulator] Ethereal Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  }

  return info;
};
