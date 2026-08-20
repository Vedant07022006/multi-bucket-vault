import nodemailer from "nodemailer";

let transporterInstance = null;

const getTransporter = async () => {
  if (!transporterInstance) {
    transporterInstance = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    try {
      await transporterInstance.verify();
    } catch (err) {
      transporterInstance = null;
      throw err;
    }
  }
  return transporterInstance;
};

export const sendOtpEmail = async (to, otp) => {
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: `"Multi-Bucket-Vault" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify your Multi-Bucket-Vault account",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Email Verification</h2>
        <p>Your OTP for Multi-Bucket-Vault email verification is:</p>
        <h1 style="letter-spacing: 8px; color: #6366f1;">${otp}</h1>
        <p>This OTP will expire in <strong>10 minutes</strong>.</p>
        <p style="color: #888; font-size: 12px;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
  });
};
