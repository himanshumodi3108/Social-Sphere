import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./LogoSearch.css";
import { UilSearch, UilTimes, UilFilter, UilHeart, UilCommentAlt } from "@iconscout/react-unicons";
import { search } from "../../api/SearchRequests";
import { useNavigate } from "react-router-dom";
import Avatar from "../Avatar/Avatar";

const LogoSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: "all", // all, users, posts, hashtags
    hashtag: "",
    dateFrom: "",
    dateTo: "",
    sortBy: "relevance",
    sortOrder: "desc",
  });

  const searchRef = useRef(null);
  const resultsRef = useRef(null);
  const filtersRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Execute search API call
  const executeSearch = useCallback(async (query) => {
    if (!query || query.trim() === "") {
      setSearchResults(null);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    try {
      const { data } = await search(query.trim(), filters);
      setSearchResults(data);
    } catch (error) {
      setSearchResults({ users: [], posts: [], hashtags: [], query: query.trim() });
    } finally {
      setIsSearching(false);
    }
  }, [filters]);

  // Debounced typing search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery && searchQuery.trim().length > 0) {
        executeSearch(searchQuery);
      } else {
        setSearchResults(null);
        setShowResults(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, executeSearch]);

  // Close results & filters when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target) &&
        filtersRef.current &&
        !filtersRef.current.contains(event.target)
      ) {
        setShowResults(false);
        setShowFilters(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Safe data extractors (handles direct arrays or pagination wrappers)
  const usersList = useMemo(() => {
    if (!searchResults) return [];
    if (Array.isArray(searchResults.users)) return searchResults.users;
    if (Array.isArray(searchResults.users?.data)) return searchResults.users.data;
    return [];
  }, [searchResults]);

  const postsList = useMemo(() => {
    if (!searchResults) return [];
    if (Array.isArray(searchResults.posts)) return searchResults.posts;
    if (Array.isArray(searchResults.posts?.data)) return searchResults.posts.data;
    return [];
  }, [searchResults]);

  const hashtagsList = useMemo(() => {
    if (!searchResults) return [];
    if (Array.isArray(searchResults.hashtags)) return searchResults.hashtags;
    if (Array.isArray(searchResults.hashtags?.data)) return searchResults.hashtags.data;
    return [];
  }, [searchResults]);

  const totalResultsCount = usersList.length + postsList.length + hashtagsList.length;

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      type: "all",
      hashtag: "",
      dateFrom: "",
      dateTo: "",
      sortBy: "relevance",
      sortOrder: "desc",
    });
  };

  const hasActiveFilters =
    filters.type !== "all" ||
    filters.hashtag ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.sortBy !== "relevance";

  const handleUserClick = (userId) => {
    navigate(`/profile/${userId}`);
    setShowResults(false);
    setSearchQuery("");
  };

  const handlePostClick = (post) => {
    setShowResults(false);
    if (post.userId) {
      const uid = typeof post.userId === "object" ? post.userId._id : post.userId;
      navigate(`/profile/${uid}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (searchQuery.trim()) {
        executeSearch(searchQuery);
      }
    } else if (e.key === "Escape") {
      setShowResults(false);
      setShowFilters(false);
    }
  };

  const handleSearchBtnClick = () => {
    if (searchQuery.trim()) {
      executeSearch(searchQuery);
    } else if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleClearSearch = (e) => {
    e.stopPropagation();
    setSearchQuery("");
    setSearchResults(null);
    setShowResults(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="LogoSearch">
      <div className="Search" ref={searchRef}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search users, posts, #hashtags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchResults || searchQuery.trim()) {
              setShowResults(true);
            }
          }}
        />

        <div className="search-actions">
          {/* Filter toggle button */}
          <div
            className={`s-icon filter-icon ${hasActiveFilters ? "active" : ""}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Search Filters"
          >
            <UilFilter size="18" />
          </div>

          {/* Search / Clear button */}
          {searchQuery ? (
            <div
              className="s-icon clear-icon"
              onClick={handleClearSearch}
              title="Clear search"
            >
              <UilTimes size="18" />
            </div>
          ) : (
            <div
              className="s-icon search-btn-trigger"
              onClick={handleSearchBtnClick}
              title="Search"
            >
              <UilSearch size="18" />
            </div>
          )}
        </div>
      </div>

      {/* Advanced Filters Drawer */}
      {showFilters && (
        <div className="search-filters" ref={filtersRef}>
          <div className="filters-header">
            <h4>Search Filters</h4>
            {hasActiveFilters && (
              <button type="button" className="clear-filters-btn" onClick={clearFilters}>
                Reset
              </button>
            )}
          </div>

          <div className="filters-content">
            <div className="filter-group">
              <label>Search Category</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
                className="filter-select"
              >
                <option value="all">All Results</option>
                <option value="users">Users Only</option>
                <option value="posts">Posts Only</option>
                <option value="hashtags">Hashtags Only</option>
              </select>
            </div>

            {(filters.type === "posts" || filters.type === "all") && (
              <>
                <div className="filter-group">
                  <label>Hashtag</label>
                  <input
                    type="text"
                    placeholder="e.g. photography"
                    value={filters.hashtag}
                    onChange={(e) => handleFilterChange("hashtag", e.target.value)}
                    className="filter-input"
                  />
                </div>

                <div className="filter-group">
                  <label>Sort By</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                    className="filter-select"
                  >
                    <option value="relevance">Most Relevant</option>
                    <option value="date">Latest First</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Search Results Dropdown */}
      {showResults && (
        <div className={`search-results ${showFilters ? "has-filters" : ""}`} ref={resultsRef}>
          {isSearching ? (
            <div className="search-loading-box">
              <div className="search-spinner"></div>
              <span>Searching SocialSphere...</span>
            </div>
          ) : searchResults ? (
            <>
              {/* Header Summary */}
              <div className="search-results-topbar">
                <span>
                  Results for <strong>"{searchQuery}"</strong>
                </span>
                {totalResultsCount > 0 && (
                  <span className="results-count-pill">{totalResultsCount} found</span>
                )}
              </div>

              {/* Users Results */}
              {usersList.length > 0 && (
                <div className="search-section">
                  <div className="search-section-header">
                    <h4>Users ({usersList.length})</h4>
                  </div>
                  <div className="search-users-list">
                    {usersList.map((user) => (
                      <div
                        key={user._id}
                        className="search-result-item user-result"
                        onClick={() => handleUserClick(user._id)}
                      >
                        <Avatar
                          user={user}
                          profilePicture={user.profilePicture}
                          firstname={user.firstname}
                          lastname={user.lastname}
                          username={user.username}
                          size="38px"
                        />
                        <div className="search-user-info">
                          <span className="search-user-name">
                            {user.firstname} {user.lastname}
                          </span>
                          <span className="search-username">@{user.username}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hashtags Results */}
              {hashtagsList.length > 0 && (
                <div className="search-section">
                  <div className="search-section-header">
                    <h4>Hashtags ({hashtagsList.length})</h4>
                  </div>
                  <div className="search-hashtags">
                    {hashtagsList.map((hashtag) => (
                      <div
                        key={hashtag.tag}
                        className="hashtag-result"
                        onClick={() => {
                          setSearchQuery(hashtag.tag);
                          executeSearch(hashtag.tag);
                        }}
                      >
                        <span className="hashtag-tag">{hashtag.tag}</span>
                        <span className="hashtag-count">{hashtag.count} posts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts Results */}
              {postsList.length > 0 && (
                <div className="search-section">
                  <div className="search-section-header">
                    <h4>Posts ({postsList.length})</h4>
                  </div>
                  <div className="search-posts-list">
                    {postsList.slice(0, 6).map((post) => (
                      <div
                        key={post._id}
                        className="search-post-card"
                        onClick={() => handlePostClick(post)}
                      >
                        <div className="search-post-top">
                          <span className="post-author-name">
                            {post.authorName || "User"}
                          </span>
                          <span className="post-author-handle">
                            @{post.authorUsername}
                          </span>
                        </div>
                        {post.desc && (
                          <p className="search-post-desc">
                            {post.desc.length > 110
                              ? `${post.desc.substring(0, 110)}...`
                              : post.desc}
                          </p>
                        )}
                        <div className="search-post-meta">
                          <span>
                            <UilHeart size="14" /> {Array.isArray(post.likes) ? post.likes.length : 0}
                          </span>
                          <span>
                            <UilCommentAlt size="14" /> {Array.isArray(post.comments) ? post.comments.length : 0}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results Fallback */}
              {totalResultsCount === 0 && (
                <div className="search-no-results">
                  <span className="no-res-icon">🔍</span>
                  <p>No results found for "{searchQuery}"</p>
                  <small>Try searching for a different name, username, or #hashtag.</small>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default LogoSearch;
