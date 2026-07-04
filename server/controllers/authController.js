import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Company from "../models/Company.js";
import Invite from "../models/Invite.js";
import axios from "axios";

// POST /api/auth/register (Company signup)
export const register = async (req, res, next) => {
  try {
    const { companyName, name, email, password } = req.body;

    if (!companyName || !name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const lowercaseEmail = email.toLowerCase();

    // Check if email already exists
    const existingUser = await User.findOne({ email: lowercaseEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create Company
    const company = await Company.create({
      name: companyName,
      email: lowercaseEmail,
    });

    // Create User
    const user = await User.create({
      name,
      email: lowercaseEmail,
      password: hashedPassword,
      role: "company",
      company: company._id,
    });

    // Update Company ownerId
    company.ownerId = user._id;
    await company.save();

    // Sign JWT
    const token = jwt.sign(
      { id: user._id, role: user.role, company: company._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      company: {
        id: company._id,
        name: company.name,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login (Unified Admin + Company + Employee login)
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const lowercaseEmail = email.toLowerCase();

    // Find user by email and select password
    const user = await User.findOne({ email: lowercaseEmail }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if account is disabled
    if (user.isActive === false) {
      return res.status(403).json({ message: "Account disabled" });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user._id, role: user.role, company: user.company },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
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

// GET /api/auth/me (protected)
export const getMeProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate("company");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/employee-login (no password — email + company name only)
export const employeeLogin = async (req, res, next) => {
  try {
    const { email, companyName } = req.body;

    if (!email || !companyName) {
      return res.status(400).json({ message: "Email and company name are required" });
    }

    const lowercaseEmail = email.toLowerCase().trim();

    // 1. Find company by name (case-insensitive)
    const company = await Company.findOne({
      name: { $regex: new RegExp(`^${companyName.trim()}$`, "i") },
    });
    if (!company) {
      return res.status(404).json({ message: "No workspace found with that company name" });
    }

    // 2. Check invite — accept BOTH pending (first login) and accepted
    const invite = await Invite.findOne({
      email: lowercaseEmail,
      company: company._id,
      status: { $in: ["pending", "accepted"] },
      expiresAt: { $gt: new Date() },
    });

    if (!invite) {
      return res.status(404).json({
        message:
          "Access denied. No valid invitation found for this email. Ask your company admin to send or resend your invite.",
      });
    }

    // 3. Find or create employee user (auto-accept on first login)
    let user = await User.findOne({
      email: lowercaseEmail,
      company: company._id,
      role: "employee",
    });

    if (!user) {
      // First-time login — create account from invite
      user = await User.create({
        name: invite.name || lowercaseEmail.split("@")[0],
        email: lowercaseEmail,
        role: "employee",
        company: company._id,
      });

      // Automatically assign to Room if assignedRepo was specified
      if (invite.assignedRepo) {
        const Room = (await import("../models/Room.js")).default;
        let room = await Room.findOne({
          company: company._id,
          githubRepo: invite.assignedRepo
        });

        if (room) {
          if (!room.assignedEmployees.includes(user._id)) {
            room.assignedEmployees.push(user._id);
            await room.save();
          }
        } else {
          const repoNameOnly = invite.assignedRepo.split("/")[1] || invite.assignedRepo;
          await Room.create({
            name: `${repoNameOnly.charAt(0).toUpperCase() + repoNameOnly.slice(1)} Workspace`,
            githubRepo: invite.assignedRepo,
            company: company._id,
            assignedEmployees: [user._id]
          });
        }
      }
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Your account has been deactivated. Contact your company admin." });
    }

    // Mark invite as accepted if still pending
    if (invite.status === "pending") {
      invite.status = "accepted";
      await invite.save();
    }

    // 4. Issue JWT
    const token = jwt.sign(
      { id: user._id, role: user.role, company: user.company },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
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

// Exchange GitHub code for access token & login/register user (For OAuth Bypass / Mock Flow)
export const githubLogin = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: "Code is required" });
    }

    if (code === "mock_dev_code" || code.startsWith("mock_")) {
      let user = await User.findOne({ email: "dev@whycode.local" });
      if (!user) {
        // Create mock company
        let company = await Company.findOne({ name: "Mock Organization" });
        if (!company) {
          company = await Company.create({
            name: "Mock Organization",
            email: "org@whycode.local",
          });
        }
        const hashedPassword = await bcrypt.hash("Admin@123", 12);
        user = await User.create({
          name: "Mock Developer",
          email: "dev@whycode.local",
          password: hashedPassword,
          githubId: "mock-12345",
          githubAccessToken: "mock-token-xyz",
          avatarUrl: "https://github.com/identicons/mock.png",
          role: "employee",
          company: company._id,
        });
      } else {
        user.githubAccessToken = "mock-token-xyz";
        await user.save();
      }

      const token = jwt.sign({ id: user._id, role: user.role, company: user.company }, process.env.JWT_SECRET, {
        expiresIn: "30d",
      });

      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          githubId: user.githubId,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
      });
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      return res.status(400).json({ message: tokenData.error_description || tokenData.error });
    }

    const accessToken = tokenData.access_token;

    // Fetch GitHub User Profile
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "WhyCode-App",
      },
    });
    const githubUser = await userResponse.json();

    if (!githubUser.id) {
      return res.status(400).json({ message: "Failed to fetch user profile from GitHub" });
    }

    let email = githubUser.email;
    if (!email) {
      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "WhyCode-App",
        },
      });
      const emails = await emailsResponse.json();
      if (Array.isArray(emails)) {
        const primaryEmailObj = emails.find((e) => e.primary);
        email = primaryEmailObj ? primaryEmailObj.email : (emails[0] ? emails[0].email : null);
      }
    }

    if (!email) {
      email = `${githubUser.login}@users.noreply.github.com`;
    }

    let user = await User.findOne({ githubId: githubUser.id.toString() });
    if (!user) {
      let company = await Company.findOne({ name: "Default Corporation" });
      if (!company) {
        company = await Company.create({ name: "Default Corporation", email: "corp@whycode.local" });
      }
      const hashedPassword = await bcrypt.hash("Admin@123", 12);
      user = await User.create({
        name: githubUser.name || githubUser.login,
        email: email,
        password: hashedPassword,
        githubId: githubUser.id.toString(),
        githubAccessToken: accessToken,
        avatarUrl: githubUser.avatar_url,
        role: "employee",
        company: company._id,
      });
    } else {
      user.githubAccessToken = accessToken;
      user.name = githubUser.name || githubUser.login;
      user.avatarUrl = githubUser.avatar_url;
      await user.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role, company: user.company }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        githubId: user.githubId,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Get current logged-in user profile (OAuth legacy)
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// Redirect user to GitHub OAuth
export const githubAuthorize = (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo,read:org,read:user,user:email`;
  res.redirect(url);
};

// Handle GitHub OAuth Callback — links GitHub to existing user OR creates new
export const githubCallback = async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ message: "No code provided from GitHub" });
    }

    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const tokenData = tokenResponse.data;
    if (tokenData.error) {
      return res.status(400).json({ message: tokenData.error_description || tokenData.error });
    }

    const accessToken = tokenData.access_token;

    const userResponse = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "CodeMemory-App" },
    });

    const githubUser = userResponse.data;
    if (!githubUser.id) {
      return res.status(400).json({ message: "Failed to fetch user profile from GitHub" });
    }

    let email = githubUser.email;
    if (!email) {
      try {
        const emailsResponse = await axios.get("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "CodeMemory-App" },
        });
        const emails = emailsResponse.data;
        if (Array.isArray(emails)) {
          const primaryEmailObj = emails.find((e) => e.primary);
          email = primaryEmailObj ? primaryEmailObj.email : (emails[0] ? emails[0].email : null);
        }
      } catch (_) {}
    }

    if (!email) {
      email = `${githubUser.login}@users.noreply.github.com`;
    }

    // Try: find by githubId first, then by email (handles company users connecting GitHub)
    let user = await User.findOne({ githubId: githubUser.id.toString() });

    if (!user && email) {
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (user) {
      // Update existing user's GitHub info
      user.githubId = githubUser.id.toString();
      user.githubAccessToken = accessToken;
      user.avatarUrl = user.avatarUrl || githubUser.avatar_url;
      await user.save();
    } else {
      // Create new user (shouldn't happen normally — only for direct GitHub OAuth users)
      let company = await Company.findOne({ name: "Default Corporation" });
      if (!company) {
        company = await Company.create({ name: "Default Corporation", email: "corp@codememory.local" });
      }
      user = await User.create({
        name: githubUser.name || githubUser.login,
        email: email.toLowerCase(),
        githubId: githubUser.id.toString(),
        githubAccessToken: accessToken,
        avatarUrl: githubUser.avatar_url,
        role: "company",
        company: company._id,
      });
      company.ownerId = user._id;
      await company.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role, company: user.company }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    const frontendRedirectUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/auth/callback?token=${token}`;
    res.redirect(frontendRedirectUrl);
  } catch (err) {
    next(err);
  }
};

// ─── GOOGLE OAUTH ────────────────────────────────────────────────────────────

// GET /api/auth/google — redirect user to Google consent screen
export const googleAuthorize = (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || `${process.env.SERVER_URL || "http://localhost:5000"}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

// GET /api/auth/google/callback — exchange code for tokens, upsert user, issue JWT
export const googleCallback = async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=no_code`);
    }

    // 1. Exchange authorization code for tokens
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.SERVER_URL || "http://localhost:5000"}/api/auth/google/callback`;
    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, id_token } = tokenRes.data;
    if (!access_token) {
      return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=token_exchange_failed`);
    }

    // 2. Fetch Google user profile
    const profileRes = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const googleUser = profileRes.data;
    // googleUser = { id, email, name, picture, verified_email }
    if (!googleUser.email) {
      return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=no_email`);
    }

    const email = googleUser.email.toLowerCase();

    // 3. Find existing user by googleId or email
    let user = await User.findOne({ googleId: googleUser.id });
    if (!user) {
      user = await User.findOne({ email });
    }

    if (user) {
      // Attach googleId if not set
      if (!user.googleId) user.googleId = googleUser.id;
      user.avatarUrl = user.avatarUrl || googleUser.picture;
      await user.save();
    } else {
      // New user — create company + owner account
      let company = await Company.findOne({ name: "Default Corporation" });
      if (!company) {
        company = await Company.create({ name: "Default Corporation", email: "corp@whycode.local" });
      }
      const hashedPassword = await bcrypt.hash(process.env.JWT_SECRET + googleUser.id, 12);
      user = await User.create({
        name: googleUser.name || email.split("@")[0],
        email,
        password: hashedPassword,
        googleId: googleUser.id,
        avatarUrl: googleUser.picture,
        role: "company",
        company: company._id,
      });
      company.ownerId = user._id;
      await company.save();
    }

    if (user.isActive === false) {
      return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=account_disabled`);
    }

    // 4. Issue JWT and redirect to frontend
    const token = jwt.sign(
      { id: user._id, role: user.role, company: user.company },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    const frontendRedirectUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/auth/callback?token=${token}`;
    res.redirect(frontendRedirectUrl);
  } catch (err) {
    next(err);
  }
};

