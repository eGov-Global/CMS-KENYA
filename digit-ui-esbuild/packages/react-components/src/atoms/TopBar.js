import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Hamburger from "./Hamburger";
import { NotificationBell } from "./svgindex";
import { useLocation } from "react-router-dom";
import BackButton from "./BackButton";

const TopBar = ({
  img,
  isMobile,
  logoUrl,
  onLogout,
  toggleSidebar,
  ulb,
  userDetails,
  notificationCount,
  notificationCountLoaded,
  cityOfCitizenShownBesideLogo,
  onNotificationIconClick,
  hideNotificationIconOnSomeUrlsWhenNotLoggedIn,
  changeLanguage,
  // Bundled DIGIT mark on transparency, white because this bar is painted in the
  // tenant's dark primary colour. Shown when no tenant logo is configured and
  // whenever the configured one fails to load (moved bucket, blocked host,
  // offline device) — a broken-image icon was the previous outcome of both.
  logoFallback = "/digit-ui/brand/digit-logo-white.png",
}) => {
  const { pathname } = useLocation();
  const [logoSrc, setLogoSrc] = useState(img || logoFallback);
  useEffect(() => {
    setLogoSrc(img || logoFallback);
  }, [img, logoFallback]);
  const onLogoError = () => {
    if (logoSrc !== logoFallback) setLogoSrc(logoFallback);
  };

  // const showHaburgerorBackButton = () => {
  //   if (pathname === "/digit-ui/citizen" || pathname === "/digit-ui/citizen/" || pathname === "/digit-ui/citizen/select-language") {
  //     return <Hamburger handleClick={toggleSidebar} />;
  //   } else {
  //     return <BackButton className="top-back-btn" />;
  //   }
  // };
  return (
    <div className="navbar">
      <div className="center-container back-wrapper">
        <div className="hambuger-back-wrapper">
          {isMobile && <Hamburger handleClick={toggleSidebar} />}
          <img
            className="city"
            id="topbar-logo"
            src={logoSrc}
            onError={onLogoError}
            alt="Logo"
          />
          <h3>{cityOfCitizenShownBesideLogo}</h3>
        </div>

        <div className="RightMostTopBarOptions">
          {!hideNotificationIconOnSomeUrlsWhenNotLoggedIn ? changeLanguage : null}
          {/* QA #16: the bell renders only when there ARE unread notifications.
              When the count query is disabled (no notification service for the
              tenant) notificationCountLoaded stays false, so the bell — and its
              dead-end empty page — never shows. */}
          {!hideNotificationIconOnSomeUrlsWhenNotLoggedIn && notificationCountLoaded && notificationCount > 0 ? (
            <div className="EventNotificationWrapper" onClick={onNotificationIconClick}>
              <span>
                <p>{notificationCount}</p>
              </span>
              <NotificationBell />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

TopBar.propTypes = {
  img: PropTypes.string,
};

TopBar.defaultProps = {
  img: undefined,
};

export default TopBar;
