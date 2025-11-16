import * as PostsApi from "../api/PostsRequests";

export const getTimelinePosts = (id) => async (dispatch) => {
  dispatch({ type: "RETREIVING_START" });
  try {
    const { data } = await PostsApi.getTimelinePosts(id);
    // Handle paginated response - data.data contains the posts array
    const posts = data?.data || data || [];
    dispatch({ type: "RETREIVING_SUCCESS", data: posts });
  } catch (error) {
    console.error("Error fetching timeline posts:", error);
    dispatch({ type: "RETREIVING_FAIL" });
  }
};
