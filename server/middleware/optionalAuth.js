import jwt from "jsonwebtoken";
import User from "../models/User.js";

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = {
      id: decoded.id,
      _id: decoded.id,
      role: decoded.role,
      company: decoded.company
    };

    const fullUser = await User.findById(decoded.id).select("+githubAccessToken");
    if (fullUser) {
      req.user.githubAccessToken = fullUser.githubAccessToken;
      req.user.name = fullUser.name;
      req.user.email = fullUser.email;
    }
  } catch (err) {
    req.user = null;
  }
  next();
};

export default optionalAuth;
