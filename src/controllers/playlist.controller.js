import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    //DONE: create playlist
    try {
        if ([name, description].some((field) => field?.trim() == ""))
            throw ApiError(404, "Name, Description is required");

        const createPlaylist = await Playlist.create({
            name,
            description,
            owner: req.user?._id,
        });
        // const playlist = await Playlist.findById(createPlaylist._id)
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    createPlaylist,
                    "Playlist created successfully"
                )
            );
    } catch (error) {
        throw error;
    }
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    //DONE: get user playlists
    try {
        if (!userId) throw new ApiError(400, "User id is required");
        if (!isValidObjectId(userId))
            throw new ApiError(404, "user id is not valid");

        const getUserPlaylists = await Playlist.find({
            owner: userId,
        }).populate("owner", "fullName username avatar");

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    getUserPlaylists,
                    "successfully get user playlists"
                )
            );
    } catch (error) {
        throw error;
    }
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    //DONE: get playlist by id
    try {
        if (!playlistId) throw new ApiError(400, "playlist id is required");
        if (!isValidObjectId(playlistId))
            throw new ApiError(404, "playlist id is not valid");

        const getPlaylist = await Playlist.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(playlistId),
                },
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "videos",
                    foreignField: "_id",
                    as: "videos",
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
                                            avatar: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $addFields: {
                                owner: {
                                    $first: "$owner",
                                },
                            },
                        },
                    ],
                },
            },
        ]);

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    getPlaylist,
                    "successfully got playlist by id"
                )
            );
    } catch (error) {
        throw error;
    }
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    try {
        if ([playlistId, videoId].some((field) => field?.trim() == ""))
            throw new ApiError(400, "Playlist and Video id is require");
        if (!isValidObjectId(playlistId))
            throw new ApiError(404, "playlist id is not valid");
        if (!isValidObjectId(videoId))
            throw new ApiError(404, "video id is not valid");

        const playlist = await Playlist.findById(playlistId);
        if (!playlist.videos.includes(videoId)) {
            playlist.videos.push(videoId);
            await playlist.save({ validateBeforeSave: false });

            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200,
                        playlist,
                        "Successfully added on playlist"
                    )
                );
        }
    } catch (error) {
        throw error;
    }
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    // DONE: remove video from playlist
    try {
        if ([playlistId, videoId].some((field) => field?.trim() == ""))
            throw new ApiError(400, "playlist and video is required");
        if (!isValidObjectId(playlistId))
            throw new ApiError(404, "playlist id is not valid");
        if (!isValidObjectId(videoId))
            throw new ApiError(404, "video id is not valid");
        const videoRemoved = await Playlist.findByIdAndUpdate(
            playlistId,
            { $pull: { videos: videoId } },
            { new: true }
        );

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {},
                    "successfully video deleted from playlist"
                )
            );
    } catch (error) {
        throw error;
    }
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    // DONE: delete playlist
    try {
        if (!playlistId) throw new ApiError(400, "playlist id is required");
        if (!isValidObjectId(playlistId))
            throw new ApiError(404, "playlist id is not valid");
        await Playlist.findByIdAndDelete({
            _id: playlistId,
            owner: req.user?._id,
        });
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
    } catch (error) {
        throw error;
    }
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;
    //DONE: update playlist
    try {
        if (!playlistId) throw new ApiError(400, "playlist id is required");
        if (!isValidObjectId(playlistId))
            throw new ApiError(404, "playlist id is not valid");

        const updatedPlaylist = await Playlist.findByIdAndUpdate(
            {
                _id:playlistId,
                owner:req.user?._id
            },
            {
                $set: {
                    name:name,
                    description:description,
                },
            },
            {
                new: true,
            }
        );
        if(!updatedPlaylist) throw new ApiError(404,"Playlist not updated due to some ERROR Try again");

        return res.status(200).json(new ApiResponse(200,updatedPlaylist,"Playlist updated"));
    } catch (error) {
        throw error;
    }
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
};
