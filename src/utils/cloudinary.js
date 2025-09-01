// import { v2 as cloudinary } from "cloudinary";
// import fs from "fs";

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const uploaOnCloudinary = async (localFilePath) => {
//   try {
//     if (!localFilePath) return null;

//     // upload to cloudinary
//     const response = await cloudinary.uploader.upload(localFilePath, {
//       resource_type: "auto",
//     });

//     // file has been uploaded successfully
//     console.log(
//       "file has been uploaded successfully to cloudinary",
//       response.url
//     );
//     return response;

//   } catch (error) {
//     //  fs.unlinkSync(localFilePath) // remove the file from local uploads folder as the upload operation failed
//     return null;
//   }
// }
// export { uploaOnCloudinary }




import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

import dotenv from "dotenv";

dotenv.config();  

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploaOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Upload to cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    console.log("✅ File uploaded successfully:", response.url);

    // File uploaded, now remove from local
    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    console.error("❌ Cloudinary Upload Error:", error.message);

    // Remove the file from local uploads folder if upload failed
    if (localFilePath) fs.unlinkSync(localFilePath);

    return null;
  }
};

export { uploaOnCloudinary };
