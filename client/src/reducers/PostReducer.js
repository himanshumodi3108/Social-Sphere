const postReducer = (
  state = { posts: null, loading: false, error: false, uploading: false },
  action
) => {
  switch (action.type) {
    // belongs to PostShare.jsx
    case "UPLOAD_START":
      return { ...state, error: false, uploading: true };
    case "UPLOAD_SUCCESS":
      // Handle case where state.posts might be null, undefined, or not an array
      const existingPosts = Array.isArray(state.posts) ? state.posts : [];
      // Add new post and sort by timestamp (newest first)
      const postsWithNew = [action.data, ...existingPosts];
      const sortedPosts = postsWithNew.sort((a, b) => {
        const getTimestamp = (post) => {
          if (post.createdAt) {
            const date = new Date(post.createdAt);
            return isNaN(date.getTime()) ? 0 : date.getTime();
          }
          if (post.updatedAt) {
            const date = new Date(post.updatedAt);
            return isNaN(date.getTime()) ? 0 : date.getTime();
          }
          return 0;
        };
        return getTimestamp(b) - getTimestamp(a);
      });
      return { ...state, posts: sortedPosts, uploading: false, error: false };
    case "UPLOAD_FAIL":
      return { ...state, uploading: false, error: true };
    // belongs to Posts.jsx
    case "RETREIVING_START":
      return { ...state, loading: true, error: false };
    case "RETREIVING_SUCCESS":
      return { ...state, posts: action.data || [], loading: false, error: false };
    case "RETREIVING_FAIL":
      return { ...state, loading: false, error: true };
    // Update post likes
    case "UPDATE_POST_LIKES":
      if (!state.posts || !Array.isArray(state.posts)) {
        return state;
      }
      return {
        ...state,
        posts: state.posts.map((post) => {
          if (String(post._id) === String(action.postId)) {
            return {
              ...post,
              likes: action.likes || post.likes || []
            };
          }
          return post;
        })
      };
            // Update post comments
            case "UPDATE_POST_COMMENTS":
              if (!state.posts || !Array.isArray(state.posts)) {
                return state;
              }
              return {
                ...state,
                posts: state.posts.map((post) => {
                  if (String(post._id) === String(action.postId)) {
                    return {
                      ...post,
                      comments: action.comments || post.comments || []
                    };
                  }
                  return post;
                })
              };
            // Update post (for editing)
            case "UPDATE_POST":
              if (!state.posts || !Array.isArray(state.posts)) {
                return state;
              }
              return {
                ...state,
                posts: state.posts.map((post) => {
                  if (String(post._id) === String(action.postId)) {
                    return {
                      ...post,
                      desc: action.desc !== undefined ? action.desc : post.desc,
                      isEdited: action.isEdited !== undefined ? action.isEdited : post.isEdited,
                      editedAt: action.editedAt || post.editedAt,
                    };
                  }
                  return post;
                })
              };
            default:
              return state;
  }
};

export default postReducer;
