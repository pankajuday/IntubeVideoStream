import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    //DONE: get all comments for a video
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    try {
        if (!videoId) throw new ApiError(400, "video id is required");

        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
        };

        const matchAggregation = Comment.aggregate([
            {
                $match: {
                    video: new mongoose.Types.ObjectId(videoId),
                },
            },
        ]);

        const response = await Comment.aggregatePaginate(
            matchAggregation,
            options
        );

        return res
            .status(200)
            .json(new ApiResponse(200, response, "Successfully get comments"));
    } catch (error) {
        throw error;
    }
});

const addComment = asyncHandler(async (req, res) => {
    // DONE: add a comment to a

    const { videoId } = req.params;
    const { content } = req.body;

    try {
        if (!videoId) throw new ApiError(400, "video id is required");

        if (!content) throw new ApiError(400, "Content required");

        const createComment = await Comment.create({
            content,
            video: new mongoose.Types.ObjectId(videoId),
            owner: req.user._id,
        });

        return res
            .status(201)
            .json(
                new ApiResponse(
                    200,
                    createComment,
                    "successfully added comment"
                )
            );
    } catch (error) {
        throw error;
    }
});

const updateComment = asyncHandler(async (req, res) => {
    // DONE: update a comment
    const { commentId } = req.params;
    const { content } = req.body;
    try {
        if (!commentId) throw new ApiError(400, "comment id required");
        if (!content) throw new ApiError(400, "Content required");

        const updatedComent = await Comment.findByIdAndUpdate(
            {
                _id: commentId,
                owner: req.user?._id,
            },
            {
                $set: {
                    content: content,
                },
            },
            {
                new: true,
            }
        );

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    updatedComent,
                    "comment updated successfully"
                )
            );
    } catch (error) {
        throw error;
    }
});

const deleteComment = asyncHandler(async (req, res) => {
    // DONE: delete a comment
    const { commentId } = req.params;

    try {
        if (!commentId) throw new ApiError(400, "comment id required");
        await Comment.findByIdAndDelete({
            commentId,
            owner: req.user?._id,
        });
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "successfully deleted comment"));
    } catch (error) {
        throw error;
    }
});

export { getVideoComments, addComment, updateComment, deleteComment };
