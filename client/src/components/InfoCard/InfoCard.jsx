import React, { useEffect, useState, useMemo } from "react";
import "./InfoCard.css";
import { UilPen } from "@iconscout/react-unicons";
import { Modal, useMantineTheme } from "@mantine/core";
import { toast } from "sonner";
import ProfileModal from "../ProfileModal/ProfileModal";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import * as UserApi from "../../api/UserRequests.js";
import { logout } from "../../actions/AuthActions";
import { followUser, unfollowUser, blockUser, unblockUser } from "../../actions/UserAction";

const InfoCard = () => {
  const dispatch = useDispatch()
  const params = useParams();
  const theme = useMantineTheme();
  const [modalOpened, setModalOpened] = useState(false);
  const [logoutModalOpened, setLogoutModalOpened] = useState(false);
  const profileUserId = params.id;
  const [profileUser, setProfileUser] = useState({});
  const { user } = useSelector((state) => state.authReducer.authData);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(false);


  const handleLogOut = () => {
    setLogoutModalOpened(true);
  }

  const confirmLogout = () => {
    toast.success("Logging out...", {
      description: "You have been successfully logged out.",
      duration: 2000,
    });
    setLogoutModalOpened(false);
    // Small delay to show the toast before redirecting
    setTimeout(() => {
      dispatch(logout());
    }, 500);
  }


  // Check if following
  const checkFollowing = useMemo(() => {
    if (!user?._id || !profileUser?._id || user._id === profileUser._id) return false;
    if (user?.following && Array.isArray(user.following)) {
      return user.following.some(id => String(id) === String(profileUser._id));
    }
    return false;
  }, [user?.following, profileUser?._id, user?._id]);

  // Check if blocked
  const checkBlocked = useMemo(() => {
    if (!user?._id || !profileUser?._id) return false;
    if (user?.blocked && Array.isArray(user.blocked)) {
      return user.blocked.some(id => String(id) === String(profileUser._id));
    }
    return false;
  }, [user?.blocked, profileUser?._id, user?._id]);

  useEffect(() => {
    setIsFollowing(checkFollowing);
    setIsBlocked(checkBlocked);
  }, [checkFollowing, checkBlocked]);

  useEffect(() => {
    const fetchProfileUser = async () => {
      if (profileUserId === user?._id) {
        setProfileUser(user);
      } else if (profileUserId) {
        try {
          const response = await UserApi.getUser(profileUserId);
          const userData = response?.data || response;
          setProfileUser(userData);
        } catch (error) {
          console.error("Error fetching profile user:", error);
        }
      }
    };
    fetchProfileUser();
  }, [user, profileUserId]);

  return (
    <div className="InfoCard">
      <div className="infoHead">
        <h4>Profile Info</h4>
        {user._id === profileUserId ? (
          <div>
            <UilPen
              width="2rem"
              height="1.2rem"
              onClick={() => setModalOpened(true)}
            />
            <ProfileModal
              modalOpened={modalOpened}
              setModalOpened={setModalOpened}
              data = {user}
            />
          </div>
        ) : (
          ""
        )}
      </div>

      <div className="info">
        {/* */}
        <span>
          <b>Status </b>
        </span>
        <span>{profileUser.relationship}</span>
      </div>
      <div className="info">
        <span>
          <b>Lives in </b>
        </span>
        <span>{profileUser.livesIn}</span>
      </div>
      <div className="info">
        <span>
          <b>Works at </b>
        </span>
        <span>{profileUser.worksAt}</span>
      </div>

      {user?._id === profileUserId ? (
        <>
          <button className="button logout-button" style={{background:"#0096FF"}} onClick={handleLogOut}>Log Out</button>
          <Modal
            overlayColor={
              theme.colorScheme === "dark"
                ? theme.colors.dark[9]
                : theme.colors.gray[2]
            }
            overlayOpacity={0.55}
            overlayBlur={3}
            size="md"
            opened={logoutModalOpened}
            onClose={() => setLogoutModalOpened(false)}
            title="Confirm Logout"
            centered
          >
            <div style={{ padding: "1rem 0" }}>
              <p style={{ marginBottom: "1.5rem", fontSize: "1rem", color: "var(--textColor)" }}>
                Are you sure you want to log out? You will need to log in again to access your account.
              </p>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <button
                  className="button"
                  style={{
                    background: "var(--gray)",
                    color: "var(--textColor)",
                    padding: "0.5rem 1.5rem",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                  onClick={() => setLogoutModalOpened(false)}
                >
                  Cancel
                </button>
                <button
                  className="button"
                  style={{
                    background: "#0096FF",
                    color: "white",
                    padding: "0.5rem 1.5rem",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                  onClick={confirmLogout}
                >
                  Log Out
                </button>
              </div>
            </div>
          </Modal>
        </>
      ) : (
        <div className="profile-actions">
          <button
            className={`button ${isFollowing ? 'unfollow-button' : 'follow-button'}`}
            style={{background: isFollowing ? "var(--gray)" : "#0096FF", color: "white", width: "100%", marginBottom: "0.5rem"}}
            onClick={async () => {
              if (loading) return;
              setLoading(true);
              try {
                if (isFollowing) {
                  await dispatch(unfollowUser(profileUserId, user));
                } else {
                  await dispatch(followUser(profileUserId, user));
                }
                setIsFollowing(!isFollowing);
              } catch (error) {
                console.error("Error following/unfollowing:", error);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            {loading ? "Loading..." : (isFollowing ? "Unfollow" : "Follow")}
          </button>
          <button
            className="button block-button"
            style={{background: isBlocked ? "#ff4444" : "var(--gray)", color: "white", width: "100%", marginBottom: "0.5rem"}}
            onClick={async () => {
              if (loading) return;
              if (!window.confirm(isBlocked ? "Are you sure you want to unblock this user?" : "Are you sure you want to block this user?")) {
                return;
              }
              setLoading(true);
              try {
                if (isBlocked) {
                  await dispatch(unblockUser(profileUserId));
                } else {
                  await dispatch(blockUser(profileUserId));
                }
                setIsBlocked(!isBlocked);
              } catch (error) {
                console.error("Error blocking/unblocking:", error);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            {loading ? "Loading..." : (isBlocked ? "Unblock" : "Block")}
          </button>
        </div>
      )}
    </div>
  );
};

export default InfoCard;
