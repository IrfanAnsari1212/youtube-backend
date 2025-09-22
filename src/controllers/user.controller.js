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
import { ifError } from "assert";
import { v2 as cloudinary } from "cloudinary";

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

  //   const avatar = await uploaOnCloudinary(avatarLockalPath);
  //   const coverImage = await uploaOnCloudinary(coverImageLocalPath);
  // // ✅ Check if avatar upload worked
  //   if (!avatar) {
  //     throw new ApiError(500, "Failed to upload avatar image");
  //   }
  // // ✅ Create user and save both url + public_id
  //   const user = await User.create({
  //     fullName,
  //     avatar: avatar.url,
  //     coverImage: coverImage?.url || "",
  //     email,
  //     password,
  //     username: username.toLowerCase(),
  //   });

  //   const createdUser = await User.findById(user._id).select(
  //     "-password -refreshToken"
  //   );
  //   if (!createdUser) {
  //     throw new ApiError(500, "Something went wrong, Failed to create user");
  //   }

  //   return res
  //     .status(201)
  //     .json(new ApiResponse(200, createdUser, "User created successfully"));
  // });

  const avatar = await uploaOnCloudinary(avatarLocalPath);
  const coverImage = await uploaOnCloudinary(coverImageLocalPath);

  // ✅ Check if avatar upload worked
  if (!avatar) {
    throw new ApiError(500, "Failed to upload avatar image");
  }

  // ✅ Create user and save both url + public_id
  const user = await User.create({
    fullName,
    email,
    password,
    username: username.toLowerCase(),

    // Avatar fields
    avatar: avatar.url,
    avatarPublicId: avatar.public_id,

    // Cover image fields (if uploaded)
    coverImage: coverImage?.url || "",
    coverImagePublicId: coverImage?.public_id || "",
  });

  // ✅ Fetch user without password & refresh token
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong, Failed to create user");
  }

  // ✅ Return response
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

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);

  // yaha sir ne id use kiya hai aur maine _id use kiya hai dono same hai?
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All Fields Are Required");
  }

  // yaha v maine .id ki jagah ._id use kia hai
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details uploaded successfully"));
});

// const updateUserAvatar = asyncHandler(async (req, res) => {
//   const avatarLocalPath = req.file?.path;

//   if (!avatarLocalPath) {
//     throw new ApiError(400, "Avatar file is missing");
//   }

//   // upload new avatar

//   const avatar = await uploaOnCloudinary(avatarLocalPath);

//   if (!avatar.url) {
//     throw new ApiError(400, "Error while uploading on avatar");
//   }

//   // get current user

//   const user = await User.findByIdAndUpdate(
//     req.user?._id,
//     {
//       $set: {
//         avatar: avatar.url,
//       },
//     },
//     { new: true }
//   ).select("-password")
//   return res.status(200).json(ApiResponse(200, user, "Avatar image update successfully"))
// });

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  // ✅ Step 1: Check if file exists
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  // ✅ Step 2: Upload new avatar to Cloudinary
  const avatar = await uploaOnCloudinary(avatarLocalPath);

  if (!avatar.url || !avatar.public_id) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  // ✅ Step 3: Find the user
  const existingUser = await User.findById(req.user?._id);
  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  // ✅ Step 4: Delete old avatar from Cloudinary (if exists)
  if (existingUser.avatarPublicId) {
    try {
      await cloudinary.uploader.destroy(existingUser.avatarPublicId);
    } catch (err) {
      console.error("Error deleting old avatar:", err.message);
      // ⚠️ Don’t throw error → still allow new avatar to be saved
    }
  }

  // ✅ Step 5: Update user with new avatar + public_id
  existingUser.avatar = avatar.url;
  existingUser.avatarPublicId = avatar.public_id;
  await existingUser.save();

  // ✅ Step 6: Return updated user (excluding password)
  const updatedUser = await User.findById(existingUser._id).select("-password");

  return res
    .status(200)
    .json(ApiResponse(200, updatedUser, "Avatar image updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "CoverImage file is missing");
  }

  const coverImage = await uploaOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on CoverImage");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");
  return res
    .status(200)
    .json(ApiResponse(200, user, "Cover image update successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          }
        }
      }
    },
    {
    $project:{
      fullName: 1,
      username:1,
      subscribersCount:1,
      channelsSubscribedToCount:1,
      avatar:1,
      email:1,
      coverImage:1


    }
  }
  ])


  if (channel?.length) {
    throw new ApiError(400, "channel does not exists")
    
  }
  return res.status(200).json(
    new ApiResponse(200, channel[0], " User channel fetched succesfully")
  )
});


// const getWatchHistory = asyncHandler(async(req,res)=>{
//   const user = await User.aggregate([
//     {
//       $match:{
//         _id: new mongoose.Types.ObjectId(req.user._id)
//       }
//     },
//     {
//       $lookup:{
//         from:"videos",
//         localField: "watchHistory",
//         foreignField: "_id",
//         as: "watchHistory",
//         pipeline: [
//           {
//             $lookup:{
//               from: "users",
//               localField: "owner",
//               foreignField:"_id",
//               as: "owner",
//               pipeline:[

//                 {
//                   $project:{
//                     fullName:1,
//                     username:1,
//                     avatar:1
//                   }
//                 }
//               ]
//             }
//           },
//           {
//             $addFields:{
//               owner:{
//                 $first: "$owner"
//               }
//             }
//           }
//         ]
//       }
//     }
//   ])
// })
// return res.status(200).json(
//   new ApiResponse(200,user[0].watchHistory, "watchHistory fetched successfully" )
// )


const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              owner: {
                $first: "$owner"
              }
            }
          }
        ]
      }
    }
  ]);

  // Send the response **inside** the handler
  return res.status(200).json(
    new ApiResponse(
      200,
      user[0]?.watchHistory || [],
      "watchHistory fetched successfully"
    )
  );
});




export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
};
