import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Invite from "../models/Invite.js";
import User from "../models/User.js";
import Company from "../models/Company.js";
import { sendEmail } from "../utils/sendEmail.js";

const getClientUrl = (req) => {
  if (req.headers.origin) return req.headers.origin;
  if (req.headers.referer) {
    try {
      const url = new URL(req.headers.referer);
      return url.origin;
    } catch (e) {}
  }
  return process.env.CLIENT_URL || "http://localhost:5173";
};

// POST /api/invites/send (company only)
export const sendInvite = async (req, res, next) => {
  try {
    const { email, name, assignedRepo } = req.body;

    if (!email || !name) {
      return res.status(400).json({ message: "Email and Name are required" });
    }

    const lowercaseEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: lowercaseEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already registered" });
    }

    // Check if pending invite already sent to that email for this company
    const existingInvite = await Invite.findOne({
      email: lowercaseEmail,
      company: req.user.company,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });

    if (existingInvite) {
      return res.status(400).json({ message: "Invite already sent" });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Create Invite
    await Invite.create({
      email: lowercaseEmail,
      name,
      company: req.user.company,
      invitedBy: req.user.id,
      token,
      expiresAt,
      assignedRepo: assignedRepo || null,
    });

    // Get Company details
    const company = await Company.findById(req.user.company);
    const companyName = company ? company.name : "CodeMemory Enterprise Workspace";

    // Send email
    const clientUrl = getClientUrl(req);
    const inviteUrl = `${clientUrl}/invite/accept?token=${token}`;
    
    const emailHtml = `
      <div style="background-color: #f3f4f6; padding: 40px; font-family: 'Inter', system-ui, sans-serif; color: #111827;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
          <div style="font-weight: 800; font-size: 20px; color: #4f46e5; margin-bottom: 24px; letter-spacing: -0.03em;">CodeMemory</div>
          <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #111827;">Join Your Team</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
            Hey <strong>${name}</strong>, you have been invited to join <strong>${companyName}</strong> on CodeMemory to start indexing your code base and reviewing logical rationale.
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${inviteUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 700; display: inline-block;">Accept Invitation</a>
          </div>
          <p style="font-size: 11px; color: #9ca3af; margin: 0; text-align: center;">This invitation link will expire in 48 hours.</p>
        </div>
      </div>
    `;

    // Send email asynchronously so that slow SMTP or Ethereal account creation doesn't block the request/invite creation
    sendEmail({
      to: lowercaseEmail,
      subject: "You're invited to join CodeMemory",
      html: emailHtml,
    }).catch((err) => {
      console.error("Failed to send invite email:", err);
    });

    res.json({
      message: "Invite sent to email",
      inviteLink: inviteUrl,  // returned so dashboard can show copy-link
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/invites/verify/:token (public)
export const verifyInvite = async (req, res, next) => {
  try {
    const { token } = req.params;
    const invite = await Invite.findOne({ token }).populate("company");

    if (!invite) {
      return res.status(404).json({ message: "Invalid invite link" });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({ message: "Invite already used or expired" });
    }

    if (invite.expiresAt < new Date()) {
      invite.status = "expired";
      await invite.save();
      return res.status(400).json({ message: "Invite link has expired" });
    }

    res.json({
      valid: true,
      email: invite.email,
      companyName: invite.company.name,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/invites/accept (public - sets employee password)
export const acceptInvite = async (req, res, next) => {
  try {
    const { token, name, password } = req.body;

    if (!token || !name || !password) {
      return res.status(400).json({ message: "Token, name and password are required" });
    }

    const invite = await Invite.findOne({ token }).populate("company");
    if (!invite) {
      return res.status(404).json({ message: "Invalid invite link" });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({ message: "Invite already used or expired" });
    }

    if (invite.expiresAt < new Date()) {
      invite.status = "expired";
      await invite.save();
      return res.status(400).json({ message: "Invite link has expired" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: invite.email.toLowerCase() });
    if (existingUser) {
      // Already registered — just mark invite accepted and log them in
      if (existingUser.role !== "employee" || existingUser.company?.toString() !== invite.company._id.toString()) {
        return res.status(400).json({ message: "Email already registered with a different account" });
      }
      invite.status = "accepted";
      await invite.save();
      const jwtToken = jwt.sign(
        { id: existingUser._id, role: existingUser.role, company: existingUser.company },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.json({
        token: jwtToken,
        user: { id: existingUser._id, name: existingUser.name, email: existingUser.email, role: existingUser.role, company: existingUser.company },
      });
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create User with password
    const user = await User.create({
      name,
      email: invite.email.toLowerCase(),
      role: "employee",
      company: invite.company._id,
      password: hashedPassword,
    });

    // Automatically assign to Room if assignedRepo was specified
    if (invite.assignedRepo) {
      const Room = (await import("../models/Room.js")).default;
      let room = await Room.findOne({
        company: invite.company._id,
        githubRepo: invite.assignedRepo
      });

      if (room) {
        if (!room.assignedEmployees.includes(user._id)) {
          room.assignedEmployees.push(user._id);
          await room.save();
        }
      } else {
        // Create a new Room for this repository
        const repoNameOnly = invite.assignedRepo.split("/")[1] || invite.assignedRepo;
        await Room.create({
          name: `${repoNameOnly.charAt(0).toUpperCase() + repoNameOnly.slice(1)} Workspace`,
          githubRepo: invite.assignedRepo,
          company: invite.company._id,
          assignedEmployees: [user._id]
        });
      }
    }

    // Update invite status
    invite.status = "accepted";
    await invite.save();

    // Sign JWT
    const jwtToken = jwt.sign(
      { id: user._id, role: user.role, company: user.company },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/invites/list (company only)
export const listInvites = async (req, res, next) => {
  try {
    const invites = await Invite.find({ company: req.user.company })
      .populate("invitedBy", "name")
      .sort({ createdAt: -1 });

    const clientUrl = getClientUrl(req);

    // Attach invite link for pending invites so dashboard can show copy-link
    const enriched = invites.map((inv) => ({
      ...inv.toObject(),
      inviteLink:
        inv.status === "pending"
          ? `${clientUrl}/invite/accept?token=${inv.token}`
          : null,
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
};

// POST /api/invites/resend/:inviteId
export const resendInvite = async (req, res, next) => {
  try {
    const { inviteId } = req.params;
    const invite = await Invite.findOne({ _id: inviteId, company: req.user.company });
    if (!invite) {
      return res.status(404).json({ message: "Invite not found or unauthorized" });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({ message: "Can only resend pending invites" });
    }

    // Generate new token
    const token = crypto.randomBytes(32).toString("hex");
    invite.token = token;
    invite.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // Reset for 48 hours
    await invite.save();

    // Get Company details
    const company = await Company.findById(req.user.company);
    const companyName = company ? company.name : "CodeMemory Enterprise Workspace";

    // Resend invite url
    const clientUrl = getClientUrl(req);
    const inviteUrl = `${clientUrl}/invite/accept?token=${token}`;
    const emailHtml = `
      <div style="background-color: #f3f4f6; padding: 40px; font-family: 'Inter', system-ui, sans-serif; color: #111827;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb;">
          <div style="font-weight: 800; font-size: 20px; color: #4f46e5; margin-bottom: 24px;">CodeMemory</div>
          <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Join Your Team (Resent)</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
            Here is your new invitation link to join <strong>${companyName}</strong> on CodeMemory.
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${inviteUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 700; display: inline-block;">Accept Invitation</a>
          </div>
          <p style="font-size: 11px; color: #9ca3af; margin: 0; text-align: center;">This invitation link will expire in 48 hours.</p>
        </div>
      </div>
    `;

    // Send email asynchronously so that slow SMTP or Ethereal account creation doesn't block the request/invite creation
    sendEmail({
      to: invite.email,
      subject: "You're invited to join CodeMemory",
      html: emailHtml,
    }).catch((err) => {
      console.error("Failed to resend invite email:", err);
    });

    res.json({
      message: "Invite resent",
      inviteLink: inviteUrl, // return new link for dashboard
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/invites/:inviteId
export const revokeInvite = async (req, res, next) => {
  try {
    const { inviteId } = req.params;
    const invite = await Invite.findOne({ _id: inviteId, company: req.user.company });
    if (!invite) {
      return res.status(404).json({ message: "Invite not found or unauthorized" });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({ message: "Can only revoke pending invites" });
    }

    invite.status = "expired";
    await invite.save();

    res.json({ message: "Invite revoked" });
  } catch (err) {
    next(err);
  }
};
