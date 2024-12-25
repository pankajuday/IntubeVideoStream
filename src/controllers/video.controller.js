import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    deleteFromCloudinary,
    uploadOnCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    //DONE: get all videos based on query, sort, pagination

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: { [sortBy]: sortType === "asc" ? 1 : -1 },
    };

    const matchAggregation = Video.aggregate([
        {
            $match: {
                $or: [
                    {
                        ...(query && {
                            title: { $regex: query, $options: "i" },
                        }),
                        ...(userId && {
                            owner: new mongoose.Types.ObjectId(userId),
                        }),
                        ...(query && {
                            description: { $regex: query, $options: "i" },
                        }),
                    },
                ],
            },
        },
    ]);

    const response = await Video.aggregatePaginate(matchAggregation, options);

    return res.status(200).json(
        new ApiResponse(
            200,
            // {
            //     // VideoData: result.docs,
            //     // pageInfo: {
            //     //     totalDocs: result.totalDocs,
            //     //     limit: result.limit,
            //     //     totalPages: result.totalPages,
            //     //     page: result.page,
            //     //     pagingCounter: result.pagingCounter,
            //     //     hasPrevPage: result.hasPrevPage,
            //     //     hasNextPage: result.hasNextPage,
            //     //     prevPage: result.prevPage,
            //     //     nextPage: result.nextPage,
            //     // },
            // },
            response,
            "All video fetched successfully based on page "
        )
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validate - not Empty
    // get user
    // check for video is
    // upload them to cloudinary
    // check video uploaded
    // create video object in database
    //

    const { title, description } = req.body;
    // DONE: get video, upload to cloudinary, create video

    if ([title, description].some((field) => field?.trim() === "")) {
        throw new ApiError(401, "Title and Description required");
    }

    const videoLocalPath = req.files?.videoFile[0].path;
    const thumbnailLocalPath = req.files?.thumbnail[0].path;
    // console.log(videoLocalPath);
    if (!videoLocalPath) throw new ApiError(400, "video file is required");

    const video = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!video) throw new ApiError(400, "video file is required");

    const createVideoDocs = await Video.create({
        title,
        description,
        videoFile: video.url,
        thumbnail: thumbnail?.url || "",
        duration: video.duration,
        owner: req.user,
    });
    const publishedVideo = await Video.findById(createVideoDocs._id);

    if (!publishedVideo) {
        throw new ApiError(
            500,
            "Something went wrong while uploading video the user"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, publishedVideo, "Video Uploaded Successfully")
        );
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //DONE: get video by id

    if (!videoId?.trim) throw new ApiError(400, "video Id required");
    if (!isValidObjectId(videoId)) throw new ApiError(404, "video not found ");

    const user = await User.findById(req.user?._id);

    if (!user.watchHistory.includes(videoId)) {
        user.watchHistory.push(videoId);
        await user.save({ validateBeforeSave: false });
        await Video.findByIdAndUpdate(
            videoId,
            {
                $inc: {
                    views: 1,
                },
            },
            {
                new: true,
            }
        );
    }

    const getVideos = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
                isPublished: true,
            },
        },
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
                            avatar: 1,
                            username: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                owner: {
                    $arrayElemAt: ["$owner", 0],
                },
            },
        },
    ]);

    if (getVideos === null) throw new ApiError(404, "video not found");

    return res
        .status(200)
        .json(
            new ApiResponse(200, getVideos, "video fached successfully by id")
        );
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //DONE: update video details like title, description, thumbnail

    if (!videoId) throw new ApiError(400, "video Id required");

    const { title, description } = req.body;
    const user = req.user?._id;
    const videoOwner = await Video.findById(videoId);
    const owner = videoOwner.owner;

    if (!owner.equals(user)) {
        throw new ApiError(401, "You can not update another user's video");
    }

    // if(
    //     [title,description]?.some((data)=>data?.trim === "")
    // ){
    //     throw new ApiError(404, "Title and Description required")
    // }

    const thumbnailLocalPath = req.file?.path;
    if (!thumbnailLocalPath)
        throw new ApiError(404, "Thumbnail file is missing");

    const thumbnailOldPublicUrl = await Video.findById(videoId);
    await deleteFromCloudinary(thumbnailOldPublicUrl?.thumbnail);

    const updatedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!updatedThumbnail?.url)
        throw new ApiError(400, "Error while updating Thumbnail");

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title: title,
                description: description,
                thumbnail: updatedThumbnail?.url,
            },
        },
        {
            new: true,
        }
    );

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "video details updated successfully")
        );
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //DONE: delete video

    if (!videoId) throw new ApiError(404, "video Id required");

    const user = req.user?._id;
    const videoOwner = await Video.findById(videoId);
    const owner = videoOwner?.owner;

    if (!owner?.equals(user)) {
        throw new ApiError(401, "Permission denied for video deletion ");
    }

    const comment = await Comment.deleteMany({ video: videoId });
    const video = await Video.findByIdAndDelete(videoId);
    if (!video) throw new ApiError(400, "video not found");
    console.log(video.videoFile);
    console.log(video.thumbnail);

    await deleteFromCloudinary(video.thumbnail, { resource_type: "image" });
    await deleteFromCloudinary(video.videoFile, { resource_type: "video" });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "video deleted successfull "));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    // DONE: TOGGLE
    const { videoId } = req.params;

    if (!videoId) throw new ApiError(404, "video Id required");

    const user = req.user?._id;
    const video = await Video.findById(videoId);
    const owner = video.owner;
    if (!owner.equals(user)) {
        throw new ApiError(401, "not Permit to update video  ");
    }

    // console.log(videoId);
    const toggled = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished,
            },
        },
        {
            new: true,
        }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, toggled, "video toggled successfully"));
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
