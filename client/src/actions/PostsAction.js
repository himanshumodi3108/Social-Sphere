import * as PostsApi from "../api/PostsRequests";

export const getTimelinePosts = (id, page = 1, limit = 10) => async (dispatch) => {
  dispatch({ type: "RETREIVING_START" });
  try {
    const { data } = await PostsApi.getTimelinePosts(id, page, limit);
    // Handle paginated response - data.data contains the posts array
    const posts = data?.data || data || [];
    dispatch({ type: "RETREIVING_SUCCESS", data: posts });
  } catch (error) {
    // console.error("Error fetching timeline posts:", error);
    dispatch({ type: "RETREIVING_FAIL" });
  }
};

export const getUserPosts = (id, page = 1, limit = 10) => async (dispatch) => {
  dispatch({ type: "RETREIVING_START" });
  try {
    const { data } = await PostsApi.getUserPosts(id, page, limit);
    // Handle paginated response - data.data contains the posts array
    const posts = data?.data || data || [];
    dispatch({ type: "RETREIVING_SUCCESS", data: posts });
  } catch (error) {
    // console.error("Error fetching user posts:", error);
    dispatch({ type: "RETREIVING_FAIL" });
  }
};
