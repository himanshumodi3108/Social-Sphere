import React, { useEffect, useState } from "react";
import "./FollowersCard.css";
import FollowersModal from "../FollowersModal/FollowersModal";
import { getAllUser } from "../../api/UserRequests";
import User from "../User/User";
import { useSelector } from "react-redux";
const FollowersCard = ({ location }) => {
  const [modalOpened, setModalOpened] = useState(false);
  const [persons, setPersons] = useState([]);
  const { user } = useSelector((state) => state.authReducer.authData);

  useEffect(() => {
    const fetchPersons = async () => {
      try {
        const { data } = await getAllUser();
        // Handle paginated response: data.data contains the array, data.pagination contains pagination info
        const usersArray = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        setPersons(usersArray);
      } catch (error) {
        // console.error("Error fetching users:", error);
        setPersons([]); // Set to empty array on error
      }
    };
    fetchPersons();
  }, []);

  // Refresh persons list when user's following list changes
  useEffect(() => {
    const fetchPersons = async () => {
      try {
        const { data } = await getAllUser();
        // Handle paginated response: data.data contains the array, data.pagination contains pagination info
        const usersArray = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        setPersons(usersArray);
      } catch (error) {
        // console.error("Error fetching users:", error);
        setPersons([]); // Set to empty array on error
      }
    };
    if (user?.following) {
      fetchPersons();
    }
  }, [user?.following]);

  return (
    <div className="FollowersCard">
      <h3>People you may know</h3>

      {Array.isArray(persons) && persons.map((person, id) => {
        if (person._id !== user?._id) return <User person={person} key={id} />;
        return null;
      })}
      {!location ? (
        <span onClick={() => setModalOpened(true)}>Show more</span>
      ) : (
        ""
      )}
      <br />
    

      <FollowersModal
        modalOpened={modalOpened}
        setModalOpened={setModalOpened}
      />
    </div>
  );
};

export default FollowersCard;
