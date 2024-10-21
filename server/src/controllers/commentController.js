import Comment from '../models/commentModel.js'; 
import mongoose from 'mongoose';
import createNotification from '../helpers/createNotification.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';

// Create a new comment
export const createComment = async (req, res) => {
    const { content, post_type, postId, postUserId } = req.body;
    const commentor = req.user.id;
 // can get the post id by finding them from db. but currently only masterclass is done 
    try {
        const newComment = new Comment({
            commentor: mongoose.Types.ObjectId(commentor),
            content,
            post_type,
            post: mongoose.Types.ObjectId(postId)
        });

        await newComment.save();

        const notification = await createNotification(
            postUserId,
            'POST_ENGAGEMENT',
            `${req.user.name} commented on your post`,
            null,
            commentor
        );

        // further save the comment id in the that post_type db
        // so that the partcular post will have all the comments
        return res.json(new ApiResponse(200, notification, "Comment posted successfully!"));
    } catch (error) {
        return res.json(new ApiError(400, 'Error creating comment', error));
    }
};

// Get all comments for a specific post
export const getCommentsByPost = async (req, res) => {
    const { postId, postType } = req.body;

    try {
        const comments = await Comment.find({ post: postId, post_type: postType })
            .populate('commentor', 'name');

        return res.json(new ApiResponse(200, comments, "Comments fetched successfully!"));
    } catch (error) {
        return res.json(new ApiError(404, 'Error fetching comments', error));
    }
};

// Update a comment by ID
export const updateComment = async (req, res) => {
    const { content, commentId } = req.body;
    const loggedInUserId = req.user.id;

    try {
        const comment = await Comment.findById(commentId);

        if (!comment) {
            return res.json(new ApiError(404, 'Comment not found'));
        }

        if (comment.commentor.toString() !== loggedInUserId) {
            return res.json(new ApiError(403, 'Unauthorized: You can only edit your own comment'));
        }

        comment.content = content;
        await comment.save();

        return res.json(new ApiResponse(200, comment, "Comment updated successfully!"));
    } catch (error) {
        return res.json(new ApiError(400, 'Error updating comment', error));
    }
};

// Delete a comment by ID
export const deleteComment = async (req, res) => {
    const { commentId } = req.params;
    const loggedInUserId = req.user.id;

    try {
        const comment = await Comment.findById(commentId);

        if (!comment) {
            return res.json(new ApiError(404, 'Comment not found'));
        }

        if (comment.commentor.toString() !== loggedInUserId) {
            return res.json(new ApiError(403, 'Unauthorized: You can only delete your own comment'));
        }

        await comment.remove();

        return res.json(new ApiResponse(200, null, "Comment deleted successfully!"));
    } catch (error) {
        return res.json(new ApiError(400, 'Error deleting comment', error));
    }
};
