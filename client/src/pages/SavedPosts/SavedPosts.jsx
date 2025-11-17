import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { getSavedPosts } from "../../api/UserRequests";
import Posts from "../../components/Posts/Posts";
import "./SavedPosts.css";

const SavedPosts = () => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (user?._id) {
      fetchSavedPosts();
    }
  }, [user?._id, page]);

  const fetchSavedPosts = async () => {
    setLoading(true);
    try {
      const { data } = await getSavedPosts(user._id, page, 20);
      if (page === 1) {
        setSavedPosts(data.data || []);
      } else {
        setSavedPosts(prev => [...prev, ...(data.data || [])]);
      }
      setHasMore(data.pagination?.hasNext || false);
    } catch (error) {
      // console.error("Error fetching saved posts:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="SavedPosts">
      <div className="saved-posts-header">
        <h2>Saved Posts</h2>
        <p>Posts you've saved for later</p>
      </div>
      {loading && savedPosts.length === 0 ? (
        <div className="loading">Loading saved posts...</div>
      ) : savedPosts.length === 0 ? (
        <div className="no-posts">
          <p>You haven't saved any posts yet.</p>
          <p>Click the bookmark icon on any post to save it!</p>
        </div>
      ) : (
        <>
          <Posts posts={savedPosts} />
          {hasMore && (
            <button
              className="load-more-btn"
              onClick={() => setPage(prev => prev + 1)}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load More"}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default SavedPosts;

