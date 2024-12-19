import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    // DONE: Get the channel stats like
    // total videos
    // total video views
    // total subscribers
    // total likes etc.
    try {
        const user = req.user?._id;

        const totalVideosAgg = await Video.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(user),
                },
            },
            {
                $group: {
                    _id: null,
                    totalVideos: {
                        $sum: 1,
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalVideos: 1,
                },
            },
        ]);

        const totalVideoViewsAgg = await Video.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(user),
                },
            },
            {
                $group: {
                    _id: null,
                    totalVideoViews: {
                        $sum: "$views",
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalVideoViews: 1,
                },
            },
        ]);

        const totalSubscribersAgg = await Subscription.aggregate([
            {
                $match: {
                    channel: new mongoose.Types.ObjectId(user),
                },
            },
            {
                $group: {
                    _id: null,
                    totalSubscribers: {
                        $sum: 1,
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalSubscribers: 1,
                },
            },
        ]);

        const totalLikesAgg = await Video.aggregate([
            {
                $match:{
                    owner: new mongoose.Types.ObjectId(user)
                }
            },
            {
                $lookup: {
                  from: "likes", // Collection name for Like
                  localField: "_id", // Video ID in the Video collection
                  foreignField: "video", // Video ID in the Like collection
                  as: "likes"
                }
              },
              // Add a field to calculate the total likes for each video
              {
                $addFields: {
                  totalLikes: { $size: "$likes" } // Count the number of likes
                }
              },
            //   Group to calculate the sum of all likes across the user's videos
              {
                $group: {
                  _id: null, // No grouping key; summarize all data
                  totalLikes: { $sum: "$totalLikes" } // Sum total likes
                }
              },
              // Format the output
              {
                $project: {
                  _id: 0, // Exclude the `_id` field
                  totalLikes: 1
                }
              }
        ]); 
        

        const totalVideos = totalVideosAgg[0]?.totalVideos;
        const totalVideoViews = totalVideoViewsAgg[0]?.totalVideoViews;
        const totalSubscribers = totalSubscribersAgg[0]?.totalSubscribers;
        const totalLikes = totalLikesAgg[0]?.totalLikes;
        const channelStats = {
            totalVideos,
            totalVideoViews,
            totalSubscribers,
            totalLikes,
        };

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { channelStats },
                    "successfully fetched data"
                )
            );
    } catch (error) {
        return res.status(500).json(new ApiError(500,{},`ERROR : ${error.stack}`))
    }
});

const getChannelVideos = asyncHandler(async (req, res) => {
    // DONE: Get all the videos uploaded by the channel
    const channelVideos = await Video.aggregate([
        {
            $match: { owner: new mongoose.Types.ObjectId(req.user?._id) },
        },
        {
            $project: {
                videofile: 1,
                title: 1,
                _id: 0,
                thumbnail: 1,
                owner: 1,
                isPublished: 1,
                views: 1,
                createdAt: 1,
            },
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, channelVideos, "successfully fetched data"));
});

export { getChannelStats, getChannelVideos };
