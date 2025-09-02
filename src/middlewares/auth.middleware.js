import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.acessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    // we have token -> verify krna hai

    if (!token) {
      throw new ApiError(401, "Unauthorized - No token provided");
    }

    // verify token via jwt
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      // TODO discuss about frontend
      throw new ApiError(401, "Unauthorized - User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Unauthorized - Invalid token");
  }
  // ab hum next kr denge
});
