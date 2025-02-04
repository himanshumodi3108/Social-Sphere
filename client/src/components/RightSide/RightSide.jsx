import React, { useState } from "react";
import "./RightSide.css";

import TrendCard from "../TrendCard/TrendCard";
import ShareModal from "../ShareModal/ShareModal";
import NavIcons from "../NavIcons/NavIcons";

const RightSide = () => {
  const [modalOpened, setModalOpened] = useState(false);

  return (
    <div className="RightSide">
      {/* Side Navbar - Always Visible */}
      <NavIcons />
  
    

      {/* Hide TrendCard and Share Button in Mobile View */}
      <div className="hide-in-mobile">
        <TrendCard />
        <br />
        <button className="button r-button" style={{ background: "#0096FF", marginLeft:"33px" }} onClick={() => setModalOpened(true)}>
          Share
        </button>
        <ShareModal modalOpened={modalOpened} setModalOpened={setModalOpened} />
      </div>
    </div>
  );
};

export default RightSide;
