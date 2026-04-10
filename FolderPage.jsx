import { useEffect, useRef, useState } from "react";
import { AiOutlineStar, AiOutlineMessage,  AiOutlinePlayCircle } from "react-icons/ai";
import { FiShare } from "react-icons/fi";

import "../../styles/FeedItem.css";

export default function FeedItem({ post, isActive, onProfileClick }) {
    const videoRef = useRef(null);
    const [ready, setReady] = useState(false);
    const [paused, setPaused] = useState(true);


    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isActive) {
            video.play().then(() => setPaused(false)).catch(() => {});
        } else {
            video.pause();
            setPaused(true);
        }
    }, [isActive]);


    if (!post) return null;

    // Tap-to-toggle
    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            video.play().then(() => setPaused(false)).catch(() => {});
        } else {
            video.pause();
            setPaused(true);
        }
    };

    return (
        <section className="feedItem">
            {/* VIDEO */}
            <div className="feedMedia" onClick={togglePlay}>
                <video
                    ref={videoRef}
                    className="feedMediaEl"
                    src={post.videoSrc}
                    muted
                    loop
                    playsInline
                    preload="auto"
                />
            </div>

            {/* OVERLAYS */}
            <div className="feedOverlay">
                {/* Play icon when paused */}
                {paused && (
                    <div className="playOverlay">
                        <AiOutlinePlayCircle size={72} />
                    </div>
                )}

                {/* Creator Section */}
                <div className="creatorTag">
                    <div className="creatorName">{post.creatorName}</div>
                    <div className="creatorGenre">{post.creatorGenre}</div>
                </div>

                {/* Right-side actions */}
                <div className="rightActions">
                    <Action icon={AiOutlineStar} label="Favorite" />
                    <Action icon={FiShare} label="Share" />
                </div>

                {/* Media info */}
                <div className="description">
                    <div className="mediaTitle">{post.mediaTitle}</div>
                    <div 
                        className="mediaHandle"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onProfileClick) {
                                onProfileClick(post.creatorName.toLowerCase());
                            }
                        }}
                    >
                        @{post.creatorName.toLowerCase()}
                    </div>
                    {post.mediaDesc && (
                        <div className="mediaDesc">{post.mediaDesc}</div>
                    )}
                </div>
            </div>
        </section>
    );
}

function Action({ icon: Icon, label }) {
    return (
        <button className="actionButton">
            <Icon size={26} />
            <span>{label}</span>
        </button>
    );
}
