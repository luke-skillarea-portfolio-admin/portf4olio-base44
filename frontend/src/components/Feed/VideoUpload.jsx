import React, { useRef, useState, useEffect } from 'react';
import { videosAPI, contentAPI } from '../../services/api';
import { photosAPI } from '../../services/api';

const VideoUpload = ({ onUpload }) => {
  const [video, setVideo] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [folders, setFolders] = useState([]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Load user's folders on component mount
  useEffect(() => {
    const loadFolders = async () => {
      try {
        const data = await contentAPI.getMyContent();
        // Extract all subfolders from public and private sections
        const allSubfolders = [
          ...(data.public?.subfolders || []),
          ...(data.private?.subfolders || [])
        ];
        setFolders(allSubfolders);
      } catch (e) {
        console.error('Failed to load folders:', e);
        setError('Failed to load folders');
      }
    };
    loadFolders();
  }, []);

  // Auto-select Default folder by default
  useEffect(() => {
    if (folders.length === 0) return;
    
    // Set Default folder as default selection if no folder is selected
    if (!selectedFolderId) {
      setSelectedFolderId('default');
    }
  }, [folders, selectedFolderId]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const first = files[0];
    if (first.type.startsWith('video/')) {
      // Treat as video upload (only first file)
      setVideo(first);
      setImages([]);
      setError('');
      return;
    }
    // Treat as images upload: filter to image/* and cap to 5
    const imgs = files.filter((f) => f.type.startsWith('image/')).slice(0, 5);
    if (!imgs.length) {
      setError('Please select image files or a single video file.');
      return;
    }
    if (files.length > 5) {
      setError('You can select up to 5 images.');
    } else {
      setError('');
    }
    setImages(imgs);
    setVideo(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
        if (!video && images.length === 0) {
          setError('Please select a video or up to 5 images.');
          return;
        }
    setLoading(true);
    setError('');
    try {
          let data;
          const folderId = selectedFolderId === 'default' ? null : selectedFolderId;
          if (video) {
            data = await videosAPI.uploadVideo(video, folderId, description);
          } else {
            data = await photosAPI.uploadPhotos(images, folderId, description);
          }
      setVideo(null);
          setImages([]);
      setSelectedFolderId('default');
      setDescription('');
      if (onUpload) onUpload(data);
    } catch (e) {
      setError(e?.message || 'Upload failed');
    }
    setLoading(false);
  };

  // Show all folders (they're all subfolders from the contentAPI)
  const availableFolders = folders;

  return (
    <form onSubmit={handleSubmit} className="uploadCard">
      <div className="uploadHeader">
        <div className="uploadTitle">Create a post</div>
        <div className="uploadSubtitle">Upload a short video or up to 5 photos</div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <div className="uploadRow">
        <button
          type="button"
          className="uploadButtonSecondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
        >
              {video || images.length ? 'Change media' : 'Choose media'}
        </button>
            <div className="uploadFileName" title={video ? video.name : images.map(i => i.name).join(', ')}>
              {video ? video.name : images.length ? `${images.length} image(s) selected` : 'No file selected'}
        </div>
      </div>

      <select
        className="uploadInput"
        value={selectedFolderId}
        onChange={(e) => setSelectedFolderId(e.target.value)}
        disabled={loading}
      >
        <option value="default">Default</option>
        {availableFolders.map(folder => (
          <option key={folder.id} value={folder.id}>
            {folder.name}
          </option>
        ))}
      </select>

      <textarea
        className="uploadTextarea"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={loading}
        rows={4}
      />

      <button type="submit" className="uploadButtonPrimary" disabled={loading || (!video && images.length === 0)}>
        {loading ? 'Uploading…' : 'Post'}
      </button>

      {error ? <div className="uploadError">{error}</div> : null}
    </form>
  );
};

export default VideoUpload;
