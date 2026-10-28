import React, { useEffect, useState } from "react";
import { Modal } from "@mantine/core";
import User from "../User/User"; // Import User component
import { getAllUser } from "../../api/UserRequests"; // Fetch users separately
import "./FollowersModal.css"; // Import modal-specific styles
import { useSelector } from "react-redux";

const FollowersModal = ({ modalOpened, setModalOpened }) => {
  const [modalPersons, setModalPersons] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useSelector((state) => state.authReducer.authData);

  useEffect(() => {
    const fetchPersons = async () => {
      setLoading(true);
      try {
        const response = await getAllUser(1, 50);
        const data = response?.data;
        // Handle paginated response: data.data contains the array, data.pagination contains pagination info
        const usersArray = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        setModalPersons(usersArray);
      } catch (error) {
        setModalPersons([]);
      } finally {
        setLoading(false);
      }
    };

    if (modalOpened) {
      fetchPersons(); // Fetch new data when modal opens
    }
  }, [modalOpened, user?.following]); // Also refresh when following list changes

  return (
    <Modal
      opened={modalOpened}
      onClose={() => setModalOpened(false)}
      centered
      withCloseButton
      styles={{
        modal: {
          width: "45vw",
          height: "75vh",
          backgroundColor: "#fff",
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "15px" }}>People You May Know</h2>

      {/* Scrollable Content */}
      <div className="followers-list">
        {loading ? (
          <div style={{ textAlign: "center", padding: "20px", color: "var(--gray)" }}>
            Loading users...
          </div>
        ) : Array.isArray(modalPersons) && modalPersons.length > 0 ? (
          modalPersons.map((person, index) => {
            if (person._id === user?._id) return null;
            return (
              <div key={person._id || index} className="user-item">
                <User person={person} />
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: "center", padding: "20px", color: "var(--gray)" }}>
            No users found
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FollowersModal;
