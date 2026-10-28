import * as AuthApi from "../api/AuthRequests";
import { toast } from "sonner";

export const logIn = (formData, navigate) => async (dispatch) => {
  dispatch({ type: "AUTH_START" });
  try {
    const { data } = await AuthApi.logIn(formData);

    // If server requires 2FA challenge
    if (data && data.mfaRequired) {
      dispatch({ type: "AUTH_RESET_LOADING" });
      return { mfaRequired: true, ...data };
    }

    dispatch({ type: "AUTH_SUCCESS", data: data });
    toast.success("Welcome back!");
    navigate("../home", { replace: true });
    return { success: true };
  } catch (error) {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.msg ||
      "Invalid username or password";
    toast.error(errorMsg);
    dispatch({ type: "AUTH_FAIL" });
    return { success: false, message: errorMsg };
  }
};

export const verifyLoginMfa = (mfaData, navigate) => async (dispatch) => {
  dispatch({ type: "AUTH_START" });
  try {
    const { data } = await AuthApi.verifyMfa(mfaData);
    dispatch({ type: "AUTH_SUCCESS", data: data });
    toast.success("Authentication successful! Welcome back.");
    navigate("../home", { replace: true });
    return { success: true };
  } catch (error) {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.msg ||
      "MFA verification failed. Please try again.";
    toast.error(errorMsg);
    dispatch({ type: "AUTH_FAIL" });
    return { success: false, message: errorMsg };
  }
};

export const signUp = (formData, navigate) => async (dispatch) => {
  dispatch({ type: "AUTH_START" });
  try {
    const { data } = await AuthApi.signUp(formData);
    dispatch({ type: "AUTH_SUCCESS", data: data });
    toast.success("Account created successfully! Welcome to SocialSphere.");
    navigate("../home", { replace: true });
    return { success: true };
  } catch (error) {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.msg ||
      "Registration failed. Please check your details.";
    toast.error(errorMsg);
    dispatch({ type: "AUTH_FAIL" });
    return { success: false, message: errorMsg };
  }
};

export const logout = () => async (dispatch) => {
  dispatch({ type: "LOG_OUT" });
  window.location.href = "/landing";
};
