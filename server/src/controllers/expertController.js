import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { uploadOnCloudinary } from "../utils/cloudinary.js";

export const postMasterclass = async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            throw new ApiError(400, 'No video file uploaded.');
        }

        const filePath = req.file.path; // Path of uploaded video

        // Upload video to Cloudinary using existing utils function
        const result = await uploadOnCloudinary(filePath);

        if (!result) {
            throw new ApiError(500, 'Failed to upload video to Cloudinary.');
        }

        // Send success response with the video URL
        res.status(200).json(
            new ApiResponse(200, 'Video uploaded successfully', {
                videoUrl: result.url
            })
        );
    } catch (error) {
        res.status(error.statusCode || 500).json(
            new ApiError(error.statusCode || 500, error.message)
        );
    }
};