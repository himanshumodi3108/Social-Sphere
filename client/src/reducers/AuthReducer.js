const authReducer = (state = { authData: null, loading: false, error: false, updateLoading: false, initializing: true },action) => {
  switch (action.type) {
    case "AUTH_START":
      return {...state, loading: true, error: false };
    case "AUTH_SUCCESS":
      // Clean up followers and following arrays before storing (create new object to avoid mutation)
      let cleanedAuthData = action?.data;
      if (cleanedAuthData?.user) {
        cleanedAuthData = {
          ...cleanedAuthData,
          user: {
            ...cleanedAuthData.user,
            followers: Array.isArray(cleanedAuthData.user.followers) 
              ? cleanedAuthData.user.followers.filter(f => f !== null && f !== undefined && f !== '') 
              : [],
            following: Array.isArray(cleanedAuthData.user.following) 
              ? cleanedAuthData.user.following.filter(f => f !== null && f !== undefined && f !== '') 
              : []
          }
        };
      }
      // Only store the token in localStorage, not the full user data
      if (cleanedAuthData?.token) {
        localStorage.setItem("authToken", cleanedAuthData.token);
      }

      return {...state,  authData: cleanedAuthData, loading: false, error: false, initializing: false };



      case "AUTH_FAIL":
      return {...state, loading: false, error: true, initializing: false };
    case "AUTH_INIT_COMPLETE":
      return {...state, initializing: false };
    case "UPDATING_START":
      return {...state, updateLoading: true , error: false}
    case "UPDATING_SUCCESS":
      // Clean up followers and following arrays before storing (create new object to avoid mutation)
      let cleanedUpdateData = action?.data;
      if (cleanedUpdateData?.user) {
        const cleanedFollowers = Array.isArray(cleanedUpdateData.user.followers) 
          ? cleanedUpdateData.user.followers.filter(f => f !== null && f !== undefined && f !== '') 
          : [];
        const cleanedFollowing = Array.isArray(cleanedUpdateData.user.following) 
          ? cleanedUpdateData.user.following.filter(f => f !== null && f !== undefined && f !== '') 
          : [];
        
        cleanedUpdateData = {
          ...cleanedUpdateData,
          user: {
            ...cleanedUpdateData.user,
            followers: cleanedFollowers,
            following: cleanedFollowing
          }
        };
        
        console.log("UPDATING_SUCCESS - Cleaned data:", {
          userId: cleanedUpdateData.user._id,
          following: cleanedFollowing,
          followers: cleanedFollowers
        });
      }
      // Only store the token in localStorage, not the full user data
      if (cleanedUpdateData?.token) {
        localStorage.setItem("authToken", cleanedUpdateData.token);
      }
      return {...state, authData: cleanedUpdateData, updateLoading: false, error: false}
    
    
      case "UPDATING_FAIL":
      return {...state, updateLoading: true, error: true}



    case "LOG_OUT":
      localStorage.removeItem("authToken");
      localStorage.removeItem("profile"); // Remove old profile data if it exists
      localStorage.removeItem("store"); // Remove persisted Redux store
      return {...state,  authData: null, loading: false, error: false, updateLoading: false, initializing: false }


    case "FOLLOW_USER":
      // Ensure following is an array and avoid duplicates
      const currentFollowing = Array.isArray(state.authData?.user?.following) ? state.authData.user.following : [];
      const followingAsStrings = currentFollowing.map(f => String(f));
      if (!followingAsStrings.includes(String(action.data))) {
        return {...state, authData: {...state.authData, user: {...state.authData.user, following: [...currentFollowing, action.data]} }}
      }
      return state;
    
    case "UNFOLLOW_USER":
      // Ensure following is an array and filter by string comparison
      const currentFollowingForUnfollow = Array.isArray(state.authData?.user?.following) ? state.authData.user.following : [];
      return {...state, authData: {...state.authData, user: {...state.authData.user, following: currentFollowingForUnfollow.filter((personId) => String(personId) !== String(action.data))} }}

      default:
      return state;
  }
};

export default authReducer;
