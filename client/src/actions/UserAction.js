import * as UserApi from "../api/UserRequests";


export const updateUser=(id, formData)=> async(dispatch)=> {
    dispatch({type: "UPDATING_START"})
    try{
        const {data} = await UserApi.updateUser(id, formData);
        dispatch({type: "UPDATING_SUCCESS", data: data})
    }   
    catch(error){
        dispatch({type: "UPDATING_FAIL"})
    }
}


export const followUser = (id, data)=> async(dispatch)=> {
    try {
        // Optimistic update
        dispatch({type: "FOLLOW_USER", data: id})
        const response = await UserApi.followUser(id, data);
        // Update user data with server response if available
        if (response?.data?.updatedUser) {
            const token = localStorage.getItem('authToken');
            dispatch({type: "UPDATING_SUCCESS", data: { user: response.data.updatedUser, token }})
            
            // Also dispatch a custom event to notify components that stats might need refreshing
            window.dispatchEvent(new CustomEvent('userFollowed', { 
                detail: { 
                    followedUserId: id,
                    updatedUser: response.data.updatedUser,
                    followedUser: response.data.followedUser
                } 
            }));
        }
    } catch (error) {
        console.error("Error following user:", error);
        // Revert the optimistic update on error
        dispatch({type: "UNFOLLOW_USER", data: id})
        throw error; // Re-throw so components can handle if needed
    }
}

export const unfollowUser = (id, data)=> async(dispatch)=> {
    try {
        // Optimistic update
        dispatch({type: "UNFOLLOW_USER", data: id})
        const response = await UserApi.unfollowUser(id, data);
        // Update user data with server response if available
        if (response?.data?.updatedUser) {
            const token = localStorage.getItem('authToken');
            console.log("Unfollow response - updatedUser:", response.data.updatedUser);
            console.log("Unfollow response - following array:", response.data.updatedUser.following);
            dispatch({type: "UPDATING_SUCCESS", data: { user: response.data.updatedUser, token }})
            
            // Also dispatch a custom event to notify components that stats might need refreshing
            window.dispatchEvent(new CustomEvent('userUnfollowed', { 
                detail: { 
                    unfollowedUserId: id,
                    updatedUser: response.data.updatedUser,
                    unfollowedUser: response.data.unfollowedUser
                } 
            }));
        } else {
            console.warn("Unfollow response missing updatedUser:", response);
        }
    } catch (error) {
        console.error("Error unfollowing user:", error);
        // Revert the optimistic update on error
        dispatch({type: "FOLLOW_USER", data: id})
        throw error; // Re-throw so components can handle if needed
    }
}

export const blockUser = (id) => async (dispatch) => {
    try {
        await UserApi.blockUser(id);
        // Refresh user data
        const token = localStorage.getItem('authToken');
        if (token) {
            const { data } = await UserApi.getUser(id);
            // Update blocked list in current user
            const currentUserResponse = await UserApi.getUser(JSON.parse(atob(token.split('.')[1])).id);
            if (currentUserResponse?.data) {
                dispatch({type: "UPDATING_SUCCESS", data: { user: currentUserResponse.data, token }})
            }
        }
        alert("User blocked successfully");
        window.location.reload();
    } catch (error) {
        console.error("Error blocking user:", error);
        alert("Failed to block user. Please try again.");
        throw error;
    }
}

export const unblockUser = (id) => async (dispatch) => {
    try {
        await UserApi.unblockUser(id);
        alert("User unblocked successfully");
        window.location.reload();
    } catch (error) {
        console.error("Error unblocking user:", error);
        alert("Failed to unblock user. Please try again.");
        throw error;
    }
}