import React, { useState, useRef } from 'react';
import { RefreshCw, ArrowLeft, ArrowRight, Home, Share2, Loader2 } from 'lucide-react';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const iframeRef = useRef(null);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleHome = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = 'https://portfolio.com';
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Portf4olio',
        url: 'https://portf4olio.com'
      });
    } else {
      navigator.clipboard.writeText('https://portfolio.com');
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-black overflow-hidden">
      {/* iOS-style Status Bar Spacer */}
      <div className="h-[env(safe-area-inset-top,44px)] bg-white flex-shrink-0" />
      
      {/* Loading Bar */}
      {isLoading && (
        <div className="absolute top-[env(safe-area-inset-top,44px)] left-0 right-0 z-50">
          <div className="h-0.5 bg-blue-500 animate-pulse" />
        </div>
      )}

      {/* WebView Container */}
      <div className="flex-1 relative bg-white">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-40">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="text-gray-500 text-sm">Loading Portf4olio.com...</span>
            </div>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          src="https://portf4olio.com"
          className="w-full h-full border-0"
          onLoad={handleLoad}
          title="Portf4olio.com"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* iOS-style Bottom Navigation Bar */}
      <div className="bg-white border-t border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-around py-2 px-4">
          <button 
            onClick={() => window.history.back()}
            className="p-3 rounded-lg active:bg-gray-100 transition-colors disabled:opacity-30"
            disabled={!canGoBack}
          >
            <ArrowLeft className="w-6 h-6 text-blue-500" />
          </button>
          
          <button 
            onClick={() => window.history.forward()}
            className="p-3 rounded-lg active:bg-gray-100 transition-colors disabled:opacity-30"
            disabled={!canGoForward}
          >
            <ArrowRight className="w-6 h-6 text-blue-500" />
          </button>
          
          <button 
            onClick={handleShare}
            className="p-3 rounded-lg active:bg-gray-100 transition-colors"
          >
            <Share2 className="w-6 h-6 text-blue-500" />
          </button>
          
          <button 
            onClick={handleHome}
            className="p-3 rounded-lg active:bg-gray-100 transition-colors"
          >
            <Home className="w-6 h-6 text-blue-500" />
          </button>
          
          <button 
            onClick={handleRefresh}
            className="p-3 rounded-lg active:bg-gray-100 transition-colors"
          >
            <RefreshCw className={`w-6 h-6 text-blue-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {/* iOS Home Indicator Spacer */}
        <div className="h-[env(safe-area-inset-bottom,20px)]" />
      </div>
    </div>
  );
}