import * as AuthApi from "../api/AuthRequests";
import { toast } from "sonner";

export const logIn = (formData, navigate) => async (dispatch) => {
  dispatch({ type: "AUTH_START" });
  try {
    const { data } = await AuthApi.logIn(formData);
    dispatch({ type: "AUTH_SUCCESS", data: data });
    toast.success("Welcome back!");
    navigate("../home", { replace: true });
    return true;
  } catch (error) {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.msg ||
      "Invalid username or password";
    toast.error(errorMsg);
    dispatch({ type: "AUTH_FAIL" });
    return false;
  }
};

export const signUp = (formData, navigate) => async (dispatch) => {
  dispatch({ type: "AUTH_START" });
  try {
    const { data } = await AuthApi.signUp(formData);
    dispatch({ type: "AUTH_SUCCESS", data: data });
    toast.success("Account created successfully!");
    navigate("../home", { replace: true });
    return true;
  } catch (error) {
    const errorMsg =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.msg ||
      "Registration failed. Please check your details.";
    toast.error(errorMsg);
    dispatch({ type: "AUTH_FAIL" });
    return false;
  }
};

export const logout = () => async (dispatch) => {
  dispatch({ type: "LOG_OUT" });
  window.location.href = "/landing";
};
