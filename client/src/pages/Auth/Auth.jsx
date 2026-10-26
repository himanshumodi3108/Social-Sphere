import React, { useState } from "react";
import "./Auth.css";
import { logIn, signUp } from "../../actions/AuthActions.js";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Auth = () => {
  const initialState = {
    firstname: "",
    lastname: "",
    username: "",
    password: "",
    confirmpass: "",
  };
  const loading = useSelector((state) => state.authReducer.loading);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isSignUp, setIsSignUp] = useState(false);
  const [data, setData] = useState(initialState);
  const [errorMessage, setErrorMessage] = useState("");

  const resetForm = () => {
    setData(initialState);
    setErrorMessage("");
  };

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
    if (errorMessage) setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (isSignUp) {
      // 1. Password confirmation check
      if (data.password !== data.confirmpass) {
        const msg = "Passwords do not match!";
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      // 2. Password length check
      if (data.password.length < 6) {
        const msg = "Password must be at least 6 characters long.";
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      // 3. Password pattern check (at least 1 uppercase, 1 lowercase, 1 number)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (!passwordRegex.test(data.password)) {
        const msg = "Password must contain at least one uppercase letter, one lowercase letter, and one number.";
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      // 4. Username format check
      if (data.username.trim().length < 3 || data.username.trim().length > 30) {
        const msg = "Username must be between 3 and 30 characters.";
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      const res = await dispatch(signUp(data, navigate));
      if (!res) {
        setErrorMessage("Registration failed. Please check your details.");
      }
    } else {
      const res = await dispatch(logIn(data, navigate));
      if (!res) {
        setErrorMessage("Invalid username or password");
      }
    }
  };

  return (
    <div className="Auth">
      <h1 style={{ color: "#0096FF", textAlign: "center" }}>SocialSphere</h1>
      <div className="a-right">
        <form className="infoForm authForm" onSubmit={handleSubmit}>
          <h2>{isSignUp ? "Register" : "Login"}</h2>
          {isSignUp && (
            <div className="yo">
              <div>
                <input
                  required
                  type="text"
                  placeholder="First Name"
                  className="infoInput"
                  name="firstname"
                  value={data.firstname}
                  onChange={handleChange}
                />
              </div>
              <div>
                <input
                  required
                  type="text"
                  placeholder="Last Name"
                  className="infoInput"
                  name="lastname"
                  value={data.lastname}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}
          <div>
            <input
              required
              type="text"
              placeholder="Username"
              className="infoInput"
              name="username"
              value={data.username}
              onChange={handleChange}
            />
          </div>
          <div>
            <input
              required
              type="password"
              className="infoInput"
              placeholder="Password"
              name="password"
              value={data.password}
              onChange={handleChange}
            />
            {isSignUp && (
              <input
                required
                type="password"
                className="infoInput"
                name="confirmpass"
                placeholder="Confirm Password"
                value={data.confirmpass}
                onChange={handleChange}
              />
            )}
          </div>

          {isSignUp && (
            <div style={{ width: "90%", textAlign: "left", fontSize: "11px", color: "var(--gray)", marginTop: "-10px" }}>
              Password must be 6+ chars with at least 1 uppercase, 1 lowercase, and 1 number.
            </div>
          )}

          {errorMessage && (
            <span
              style={{
                color: "red",
                fontSize: "12px",
                alignSelf: "flex-end",
                marginRight: "5px",
                display: "block",
              }}
            >
              *{errorMessage}
            </span>
          )}

          <div>
            <span
              style={{
                fontSize: "12px",
                cursor: "pointer",
                textDecoration: "underline",
              }}
              onClick={() => {
                resetForm();
                setIsSignUp((prev) => !prev);
              }}
            >
              {isSignUp
                ? "Already have an account? Login"
                : "Don't have an account? Sign up"}
            </span>
            <button
              style={{ background: "#0096FF" }}
              className="button infoButton"
              type="submit"
              disabled={loading}
            >
              {loading ? "Loading..." : isSignUp ? "SignUp" : "Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;
