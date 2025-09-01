import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploaOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend

  const { fullName, email, username, password } = req.body;
  console.log("email:", email);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check if user already exists
  const existedUser = User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  const avatarLockalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLockalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  // upload  to cloudinary

  const avatar = await uploaOnCloudinary(avatarLockalPath);
  const coverImage = await uploaOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(500, "Failed to upload avatar image avatar is required");
  }
  // create user

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = User.findById(user._id).select(
    "-password -refreshToken "
  );
  if (!createdUser) {
    throw new ApiError(500, " Something went wrong, Failed to create user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created successfully"));
});

export { registerUser };
