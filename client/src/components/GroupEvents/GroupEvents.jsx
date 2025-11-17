import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { getGroupEvents, createGroupEvent, rsvpToEvent } from "../../api/GroupRequests";
import "./GroupEvents.css";
import { UilPlus, UilMapMarker, UilClock, UilUser } from "@iconscout/react-unicons";

const GroupEvents = ({ groupId, isMember, isAdmin }) => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
  });

  useEffect(() => {
    if (groupId && isMember) {
      fetchEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, isMember]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data } = await getGroupEvents(groupId);
      const eventsArray = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      setEvents(eventsArray);
    } catch (error) {
      // console.error("Error fetching events:", error);
      // If 404 or 501, events feature is not implemented yet - show empty state
      if (error.response?.status === 404 || error.response?.status === 501) {
        setEvents([]);
      } else {
        setEvents([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      alert("Please fill in required fields (Title and Date)");
      return;
    }

    try {
      await createGroupEvent(groupId, {
        ...newEvent,
        datetime: new Date(`${newEvent.date}T${newEvent.time || "12:00"}`).toISOString(),
      });
      setShowCreateModal(false);
      setNewEvent({ title: "", description: "", date: "", time: "", location: "" });
      fetchEvents();
    } catch (error) {
      // console.error("Error creating event:", error);
      alert("Failed to create event. Please try again.");
    }
  };

  const handleRSVP = async (eventId, currentRSVP) => {
    try {
      const newRSVP = currentRSVP === "going" ? "not_going" : "going";
      await rsvpToEvent(groupId, eventId, newRSVP);
      fetchEvents();
    } catch (error) {
      // console.error("Error updating RSVP:", error);
      alert("Failed to update RSVP. Please try again.");
    }
  };

  if (!isMember) {
    return (
      <div className="group-events">
        <p>Join the group to see events</p>
      </div>
    );
  }

  return (
    <div className="GroupEvents">
      <div className="events-header">
        <h3>Group Events</h3>
        {(isAdmin || isMember) && (
          <button
            className="create-event-btn"
            onClick={() => setShowCreateModal(true)}
          >
            <UilPlus size="18" />
            Create Event
          </button>
        )}
      </div>

      {loading ? (
        <div className="events-loading">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="no-events">No events scheduled</div>
      ) : (
        <div className="events-list">
          {events.map((event) => {
            const eventDate = new Date(event.datetime || event.date);
            const isPast = eventDate < new Date();
            const userRSVP = event.rsvps?.find(r => String(r.userId) === String(user?._id));
            const goingCount = event.rsvps?.filter(r => r.rsvp === "going").length || 0;

            return (
              <div key={event._id} className={`event-card ${isPast ? "past" : ""}`}>
                <div className="event-date-badge">
                  <span className="event-month">{eventDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span className="event-day">{eventDate.getDate()}</span>
                </div>
                <div className="event-content">
                  <h4 className="event-title">{event.title}</h4>
                  {event.description && (
                    <p className="event-description">{event.description}</p>
                  )}
                  <div className="event-details">
                    {event.location && (
                      <div className="event-detail">
                        <UilMapMarker size="16" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    <div className="event-detail">
                      <UilClock size="16" />
                      <span>{eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="event-detail">
                      <UilUser size="16" />
                      <span>{goingCount} going</span>
                    </div>
                  </div>
                  <button
                    className={`rsvp-btn ${userRSVP?.rsvp === "going" ? "going" : ""}`}
                    onClick={() => handleRSVP(event._id, userRSVP?.rsvp)}
                  >
                    {userRSVP?.rsvp === "going" ? "✓ Going" : "RSVP"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Event</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="event-form">
              <input
                type="text"
                placeholder="Event Title *"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="form-input"
              />
              <textarea
                placeholder="Description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                rows={3}
                className="form-input"
              />
              <div className="form-row">
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="form-input"
                  required
                />
                <input
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  className="form-input"
                />
              </div>
              <input
                type="text"
                placeholder="Location"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                className="form-input"
              />
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button className="create-btn" onClick={handleCreateEvent}>
                  Create Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupEvents;

