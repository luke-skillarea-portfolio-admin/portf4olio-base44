import React, { useState, useRef, useEffect } from 'react';
import '../../styles/Slideshow.css';

export default function PhotoSlideshow({ images = [], isActive, children }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);

  useEffect(() => {
    if (!isActive) return; // Only listen if this post is currently visible

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault(); // Stop page from scrolling horizontally
        if (currentIndex < images.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIndex > 0) {
          setCurrentIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup listener when user scrolls away
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, currentIndex, images.length]);

  // If no images, we still render children (description) if present, or null
  if (!images || images.length === 0) return <>{children}</>;

  const onTouchStart = (e) => {
    setIsDragging(true);
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
  };

  const onTouchMove = (e) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    let diff = currentX - touchStartX.current;

    // Restrict movement if trying to swipe past the first or last image
    const isFirstSlide = currentIndex === 0;
    const isLastSlide = currentIndex === images.length - 1;

    if ((isFirstSlide && diff > 0) || (isLastSlide && diff < 0)) {
      diff = diff * 0.3;
    }

    setDragOffset(diff);
  };

  const onTouchEnd = (e) => {
    setIsDragging(false);
    
    const touchEndTime = Date.now();
    const duration = touchEndTime - touchStartTime.current;
    const distance = dragOffset;
    const width = e.target.closest('.slideshow-container')?.offsetWidth || window.innerWidth;
    const threshold = width * 0.4;
    const isFastFlick = Math.abs(distance) > 20 && duration < 250;

    if (distance < -threshold || (distance < 0 && isFastFlick)) {
      // Swipe LEFT -> Next
      if (currentIndex < images.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    } else if (distance > threshold || (distance > 0 && isFastFlick)) {
      // Swipe RIGHT -> Prev
      if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    }

    // Reset drag offset so CSS transition snaps to final position
    setDragOffset(0);
  };

  const getTransform = () => {
    const baseTranslate = currentIndex * -100;
    return `translateX(calc(${baseTranslate}% + ${dragOffset}px))`;
  };

  return (
    <div className="slideshow-wrapper">
      {/* Scrollable Images Container */}
      <div 
        className="slideshow-container"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ 
          transform: getTransform(),
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)' 
        }}
      >
        {images.map((img, idx) => {
          const src = img?.image_url || img?.url || img;
          return (
            <div key={idx} className="slide-item">
              <img 
                src={src} 
                alt={`slide-${idx}`} 
                className="slide-image" 
                draggable="false" 
              />
            </div>
          );
        })}
      </div>

      {/* The Overlay Stack (Dots + Description) */}
      <div className="slideshow-overlay">
        
        {/* Dots - Only show if multiple images */}
        {images.length > 1 && (
          <div className="slideshow-dots">
            {images.map((_, i) => (
              <span 
                key={i} 
                className={`dot ${i === currentIndex ? 'active' : ''}`}
              />
            ))}
          </div>
        )}

        {/* The Description (passed from VideoFeed) */}
        <div className="slideshow-content-wrapper">
          {children}
        </div>
      </div>
    </div>
  );
}