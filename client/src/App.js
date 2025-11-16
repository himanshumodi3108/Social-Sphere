import "./App.css";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, Suspense, lazy } from "react";
import * as UserApi from "./api/UserRequests";

// Code splitting with React.lazy
const Landing = lazy(() => import("./pages/Landing/Landing"));
const Home = lazy(() => import("./pages/Home"));
const Auth = lazy(() => import("./pages/Auth/Auth"));
const Profile = lazy(() => import("./pages/Profile/Profile"));
const Chat = lazy(() => import("./pages/Chat/Chat"));
const Groups = lazy(() => import("./pages/Groups/Groups"));
const GroupDetail = lazy(() => import("./pages/GroupDetail/GroupDetail"));
const SavedPosts = lazy(() => import("./pages/SavedPosts/SavedPosts"));
const PrivacySettings = lazy(() => import("./pages/PrivacySettings/PrivacySettings"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings/NotificationSettings"));

// Loading component
const LoadingSpinner = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    fontSize: '18px',
    color: 'var(--gray)'
  }}>
    Loading...
  </div>
);

function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const user = useSelector((state) => state.authReducer.authData);
  const initializing = useSelector((state) => state.authReducer.initializing);
  
  const isLandingPage = location.pathname === "/" || location.pathname === "/landing";
  
  // Fetch user data on app load if token exists (only run once on mount)
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          // Decode token to get user ID (JWT is base64 encoded)
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          const decoded = JSON.parse(jsonPayload);
          const userId = decoded.id;
          
          // Fetch fresh user data from server
          const { data } = await UserApi.getUser(userId);
          
          // Dispatch AUTH_SUCCESS with fresh data
          dispatch({ 
            type: "AUTH_SUCCESS", 
            data: { user: data, token } 
          });
        } catch (error) {
          console.error("Error fetching user data on app load:", error);
          // Token might be invalid, clear it
          localStorage.removeItem('authToken');
          localStorage.removeItem('profile');
          dispatch({ type: "AUTH_INIT_COMPLETE" });
        }
      } else {
        // No token, initialization complete
        dispatch({ type: "AUTH_INIT_COMPLETE" });
      }
    };
    
    // Only fetch if we're still initializing
    if (initializing) {
      fetchUserData();
    }
  }, [dispatch, initializing]);
  
  // Show loading screen while initializing
  if (initializing) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="App">
      {!isLandingPage && (
        <>
          <div className="blur" style={{ top: "-18%", right: "0" }}></div>
          <div className="blur" style={{ top: "36%", left: "-8rem" }}></div>
        </>
      )}
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to="home" /> : <Landing />}
          />
          <Route
            path="/landing"
            element={user ? <Navigate to="../home" /> : <Landing />}
          />
          <Route
            path="/home"
            element={user ? <Home /> : <Navigate to="../landing" />}
          />
          <Route
            path="/auth"
            element={user ? <Navigate to="../home" /> : <Auth />}
          />
          <Route
            path="/profile/:id"
            element={user ? <Profile /> : <Navigate to="../landing" />}
          />
          <Route
            path="/chat"
            element={user ? <Chat /> : <Navigate to="../landing" />}
          />
          <Route
            path="/groups"
            element={user ? <Groups /> : <Navigate to="../landing" />}
          />
          <Route
            path="/groups/:id"
            element={user ? <GroupDetail /> : <Navigate to="../landing" />}
          />
              <Route
                path="/saved"
                element={user ? <SavedPosts /> : <Navigate to="../landing" />}
              />
              <Route
                path="/privacy-settings"
                element={user ? <PrivacySettings /> : <Navigate to="../landing" />}
              />
              <Route
                path="/notification-settings"
                element={user ? <NotificationSettings /> : <Navigate to="../landing" />}
              />
              <Route
                path="*"
                element={
                  <main style={{ padding: "1rem" }}>
                    <p>There's nothing here!</p>
                  </main>
                }
              />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
