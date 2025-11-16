import React, { useState, useEffect, useRef } from "react";
import './LogoSearch.css'
import { UilSearch, UilTimes, UilFilter } from '@iconscout/react-unicons'
import { search } from "../../api/SearchRequests";
import { useNavigate } from "react-router-dom";
import Avatar from "../Avatar/Avatar";
import Post from "../Post/Post";

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
    sortBy: "relevance", // relevance, date, popularity
    sortOrder: "desc", // asc, desc
  });
  const searchRef = useRef(null);
  const resultsRef = useRef(null);
  const filtersRef = useRef(null);
  const navigate = useNavigate();

  // Debounce search
  useEffect(() => {
    const handleSearch = async (query) => {
      if (!query || query.trim() === "") {
        setSearchResults(null);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      setShowResults(true);

      try {
        const { data } = await search(query, filters);
        setSearchResults(data);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults({ users: [], posts: [], hashtags: [], query: query });
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      } else {
        setSearchResults(null);
        setShowResults(false);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filters.type, filters.hashtag, filters.dateFrom, filters.dateTo, filters.sortBy, filters.sortOrder]);

  // Close results when clicking outside
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

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
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

  const hasActiveFilters = filters.type !== "all" || 
    filters.hashtag || 
    filters.dateFrom || 
    filters.dateTo || 
    filters.sortBy !== "relevance";

  const handleUserClick = (userId) => {
    navigate(`/profile/${userId}`);
    setShowResults(false);
    setSearchQuery("");
  };

  const handlePostClick = () => {
    setShowResults(false);
  };

  return (
    <div className="LogoSearch">
      <div className="Search" ref={searchRef}>
        <input
          type="text"
          placeholder="Search users, posts, #hashtags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (searchResults) setShowResults(true);
          }}
        />
        <div className="search-actions">
          <div 
            className={`s-icon filter-icon ${hasActiveFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Filters"
          >
            <UilFilter size="18" />
          </div>
          <div className="s-icon">
            {searchQuery ? (
              <UilTimes 
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults(null);
                  setShowResults(false);
                }}
                style={{ cursor: "pointer" }}
              />
            ) : (
              <UilSearch />
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="search-filters" ref={filtersRef}>
          <div className="filters-header">
            <h4>Search Filters</h4>
            {hasActiveFilters && (
              <button className="clear-filters-btn" onClick={clearFilters}>
                Clear All
              </button>
            )}
          </div>
          <div className="filters-content">
            <div className="filter-group">
              <label>Search Type</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="filter-select"
              >
                <option value="all">All</option>
                <option value="users">Users Only</option>
                <option value="posts">Posts Only</option>
                <option value="hashtags">Hashtags Only</option>
              </select>
            </div>

            {filters.type === "posts" || filters.type === "all" ? (
              <>
                <div className="filter-group">
                  <label>Hashtag</label>
                  <input
                    type="text"
                    placeholder="#hashtag"
                    value={filters.hashtag}
                    onChange={(e) => handleFilterChange('hashtag', e.target.value)}
                    className="filter-input"
                  />
                </div>

                <div className="filter-group">
                  <label>Date Range</label>
                  <div className="date-range">
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                      className="filter-input"
                      placeholder="From"
                    />
                    <span>to</span>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                      className="filter-input"
                      placeholder="To"
                    />
                  </div>
                </div>

                <div className="filter-group">
                  <label>Sort By</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="filter-select"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="date">Date</option>
                    <option value="popularity">Popularity</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Sort Order</label>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                    className="filter-select"
                  >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </select>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Search Results Dropdown */}
      {showResults && (
        <div className={`search-results ${showFilters ? 'has-filters' : ''}`} ref={resultsRef}>
          {isSearching ? (
            <div className="search-loading">Searching...</div>
          ) : searchResults ? (
            <>
              {/* Users Results */}
              {searchResults.users && searchResults.users.length > 0 && (
                <div className="search-section">
                  <h4>Users</h4>
                  {searchResults.users.map((user) => (
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
                        size="40px"
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
              )}

              {/* Posts Results */}
              {searchResults.posts && searchResults.posts.length > 0 && (
                <div className="search-section">
                  <h4>Posts</h4>
                  <div className="search-posts">
                    {searchResults.posts.slice(0, 5).map((post) => (
                      <div key={post._id} onClick={handlePostClick}>
                        <Post data={post} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hashtags Results */}
              {searchResults.hashtags && searchResults.hashtags.length > 0 && (
                <div className="search-section">
                  <h4>Hashtags</h4>
                  <div className="search-hashtags">
                    {searchResults.hashtags.map((hashtag) => (
                      <div
                        key={hashtag.tag}
                        className="hashtag-result"
                        onClick={() => {
                          setSearchQuery(hashtag.tag);
                          handleFilterChange('hashtag', hashtag.tag);
                        }}
                      >
                        <span className="hashtag-tag">{hashtag.tag}</span>
                        <span className="hashtag-count">{hashtag.count} posts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {(!searchResults.users || searchResults.users.length === 0) &&
                (!searchResults.posts || searchResults.posts.length === 0) &&
                (!searchResults.hashtags || searchResults.hashtags.length === 0) && (
                  <div className="search-no-results">
                    No results found for "{searchResults.query}"
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
