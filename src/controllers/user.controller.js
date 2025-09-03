// import { asyncHandler } from "../utils/asyncHandler.js";
// import { ApiError } from "../utils/ApiError.js";
// import { User } from "../models/user.model.js";
// import { uploaOnCloudinary } from "../utils/cloudinary.js";
// import { ApiResponse } from "../utils/ApiResponse.js";

// const registerUser = asyncHandler(async (req, res) => {
//   // get user details from frontend

//   const { fullName, email, username, password } = req.body;
//   console.log("email:", email);

//   if (
//     [fullName, email, username, password].some((field) => field?.trim() === "")
//   ) {
//     throw new ApiError(400, "All fields are required");
//   }

//   // check if user already exists
//   const existedUser = await User.findOne({
//     $or: [{ username }, { email }],
//   });
//   if (existedUser) {
//     throw new ApiError(409, "User already exists");
//   }

//   const avatarLockalPath = req.files?.avatar[0]?.path;
//   const coverImageLocalPath = req.files?.coverImage[0]?.path;

//   if (!avatarLockalPath) {
//     throw new ApiError(400, "Avatar is required");
//   }

//   // upload  to cloudinary

//   const avatar = await uploaOnCloudinary(avatarLockalPath);
//   const coverImage = await uploaOnCloudinary(coverImageLocalPath);

//   if (!avatar) {
//     throw new ApiError(500, "Failed to upload avatar image avatar is required");
//   }
//   // create user

//   const user = await User.create({
//     fullName,
//     avatar: avatar.url,
//     coverImage: coverImage?.url || "",
//     email,
//     password,
//     username: username.toLowerCase(),
//   });

//   const createdUser = User.findById(user._id).select(
//     "-password -refreshToken "
//   );
//   if (!createdUser) {
//     throw new ApiError(500, " Something went wrong, Failed to create user");
//   }

//   return res
//     .status(201)
//     .json(new ApiResponse(200, createdUser, "User created successfully"));
// });

// export { registerUser };

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploaOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "something went wrong while generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;
  console.log(" Incoming Register Request:", { fullName, email, username });
  console.log(" Req.Files:", req.files);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  const avatarLockalPath = req.files?.avatar?.[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  console.log("✅ Avatar Local Path:", avatarLockalPath);
  console.log("✅ CoverImage Local Path:", coverImageLocalPath);

  if (!avatarLockalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  const avatar = await uploaOnCloudinary(avatarLockalPath);
  const coverImage = await uploaOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(500, "Failed to upload avatar image");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong, Failed to create user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // username or email se verify krna hai
  // find user
  // if not found -> error
  // if found -> password match krna hai
  // if not match -> error
  // if match -> generate token (acces token and refresh token)
  // send cookie and response

  const { email, username, password } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  // const {} = await generateAccessAndRefreshToken(user._id);
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  // now we have refresh token and access token and we have to send it to the user in cookies
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // sending cookies via option
  const options = {
    httpOnly: true,
    secure: true, // after true it can be modify by server only
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "user LoggedIn successful"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // clear the cookies,  middleware will handle it

  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    // secure: false,// keep it false for postman
    secure: true, // after true it can be modify by server only
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // get the refresh token from cookie
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthenticated request");
  }

  // verify the token
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "invalid refresh token");
    }

    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

export { registerUser, loginUser, logoutUser,refreshAccessToken };
